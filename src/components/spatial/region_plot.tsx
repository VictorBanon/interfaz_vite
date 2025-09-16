import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';
import Plot from 'react-plotly.js';

// Define type for CSV row
interface GeneData {
  genes: string;
  functions: string;
  ir_count: string;  // will convert to number
  region: string;
  id: string;
  start: string;
  end: string;
  size: string;      // will convert to number
}

// Linear regression helper
const linearRegression = (x: number[], y: number[]) => {
  const n = x.length;
  const meanX = x.reduce((a,b) => a+b,0)/n;
  const meanY = y.reduce((a,b) => a+b,0)/n;

  let num = 0, den = 0;
  for (let i=0;i<n;i++){
    num += (x[i]-meanX)*(y[i]-meanY);
    den += (x[i]-meanX)*(x[i]-meanX);
  }

  const slope = num/den;
  const intercept = meanY - slope*meanX;

  return { slope, intercept };
};

const LinearRegressionPlot: React.FC = () => {
  const [data, setData] = useState<GeneData[]>([]);
  const [regression, setRegression] = useState<{slope: number; intercept: number} | null>(null);

  // Load CSV
  useEffect(() => {
    Papa.parse<GeneData>('/ir_count_by_region.csv', {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (res) => setData(res.data),
    });
  }, []);

  // Compute regression
  useEffect(() => {
    if (!data.length) return;

    const x = data.map(d => Number(d.ir_count));
    const y = data.map(d => Number(d.size));

    setRegression(linearRegression(x, y));
  }, [data]);

  if (!regression) return <p>Loading...</p>;

  // Regression line
  const xVals = data.map(d => Number(d.ir_count));
  const minX = Math.min(...xVals);
  const maxX = Math.max(...xVals);
  const lineX = [minX, maxX];
  const lineY = lineX.map(x => regression.intercept + regression.slope * x);

  // Create hover text excluding start and end
  const hoverText = data.map(d => 
    `Gene: ${d.genes}<br>` +
    `Function: ${d.functions}<br>` +
    `IR Count: ${d.ir_count}<br>` +
    `Region: ${d.region}<br>` +
    `ID: ${d.id}<br>` +
    `Size: ${d.size}`
  );

  return ( 
    <Plot
      data={[
        {
          x: xVals,
          y: data.map(d => Number(d.size)),
          type: 'scatter',
          mode: 'markers',
          name: 'Genes',
          marker: { color: 'blue', size: 10 },
          text: hoverText,
          hoverinfo: 'text'
        },
        {
          x: lineX,
          y: lineY,
          type: 'scatter',
          mode: 'lines',
          name: 'Regression Line',
          line: { color: 'red', width: 2 }
        }
      ]}
      layout={{
        margin: { t: 50, l: 50, r: 50, b: 50 },
        autosize: true,
        xaxis: { title: 'IR Count' },
        yaxis: { title: 'Size' }
      }}
      useResizeHandler={true}
      style={{ width: '100%', height: '100%' }}
    />  
  );
};

export default LinearRegressionPlot;

import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';
import Plot from 'react-plotly.js';

// Define type for CSV row
interface RegionData {
  id: string;
  start: string;
  end: string;
  sense: string;
  name: string;
  count: string;    // will convert to number
  length: string;   // will convert to number - usar esta columna
  density: string;  // will convert to number
}

// Linear regression helper
const linearRegression = (x: number[], y: number[]) => {
  const n = x.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  
  const meanX = x.reduce((a,b) => a+b,0)/n;
  const meanY = y.reduce((a,b) => a+b,0)/n;

  let num = 0, den = 0;
  for (let i=0;i<n;i++){
    num += (x[i]-meanX)*(y[i]-meanY);
    den += (x[i]-meanX)*(x[i]-meanX);
  }

  const slope = den === 0 ? 0 : num/den;
  const intercept = meanY - slope*meanX;

  return { slope, intercept };
};

interface LinearRegressionPlotProps {
  selectedOrganism?: any; // Agregar prop para organismo seleccionado
}

const LinearRegressionPlot: React.FC<LinearRegressionPlotProps> = ({ selectedOrganism }) => {
  const [allData, setAllData] = useState<RegionData[]>([]);
  const [geneData, setGeneData] = useState<RegionData[]>([]);
  const [intergenData, setIntergenData] = useState<RegionData[]>([]);
  const [geneRegression, setGeneRegression] = useState<{slope: number; intercept: number} | null>(null);
  const [intergenRegression, setIntergenRegression] = useState<{slope: number; intercept: number} | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load CSV based on selected organism
  useEffect(() => {
    if (!selectedOrganism || !selectedOrganism['ID-replicon']) {
      // Si no hay organismo seleccionado, limpiar datos
      setAllData([]);
      setGeneData([]);
      setIntergenData([]);
      setGeneRegression(null);
      setIntergenRegression(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    
    const repliconId = selectedOrganism['ID-replicon'];
    console.log('Cargando datos para organismo:', selectedOrganism.ID, 'con ID-replicon:', repliconId);
    
    // Construir la ruta del archivo usando ID-replicon directamente (sin "chromosome_" extra)
    const csvPath = `/data/${selectedOrganism.ID}/analysis/${repliconId}_ir_region.csv`;
    console.log('Ruta del archivo:', csvPath);

    Papa.parse<RegionData>(csvPath, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        console.log('Datos cargados para', repliconId, ':', res.data.length);
        
        // Filtrar filas con datos válidos
        const validData = res.data.filter(d => 
          d && 
          d.id && 
          d.start && 
          d.end && 
          d.count && 
          d.length &&
          d.id.trim() !== '' &&
          !isNaN(Number(d.start)) &&
          !isNaN(Number(d.end)) &&
          !isNaN(Number(d.count)) &&
          !isNaN(Number(d.length))
        );
        
        console.log('Datos válidos después del filtrado:', validData.length);
        
        if (validData.length === 0) {
          setError(`No se encontraron datos válidos para ${repliconId}`);
          setLoading(false);
          return;
        }

        setAllData(validData);
        
        // Separar genes e intergenes - con verificación adicional
        const genes = validData.filter(d => d.id && d.id.startsWith('gene-'));
        const intergens = validData.filter(d => d.id && d.id.startsWith('intergen'));
        
        console.log('Genes encontrados:', genes.length);
        console.log('Intergenes encontrados:', intergens.length);
        
        setGeneData(genes);
        setIntergenData(intergens);
        setLoading(false);
      },
      error: (error) => {
        console.error('Error cargando CSV para', repliconId, ':', error);
        setError(`Error cargando datos para ${repliconId}: ${error.message}`);
        setLoading(false);
      }
    });
  }, [selectedOrganism]); // Dependencia del organismo seleccionado

  // Compute regressions (usando count como X y length como Y)
  useEffect(() => {
    if (geneData.length > 1) {
      const x = geneData.map(d => Number(d.count)).filter(n => !isNaN(n) && isFinite(n));
      const y = geneData.map(d => Number(d.length)).filter(n => !isNaN(n) && isFinite(n));
      
      if (x.length === y.length && x.length > 1) {
        setGeneRegression(linearRegression(x, y));
      }
    } else {
      setGeneRegression(null);
    }

    if (intergenData.length > 1) {
      const x = intergenData.map(d => Number(d.count)).filter(n => !isNaN(n) && isFinite(n));
      const y = intergenData.map(d => Number(d.length)).filter(n => !isNaN(n) && isFinite(n));
      
      if (x.length === y.length && x.length > 1) {
        setIntergenRegression(linearRegression(x, y));
      }
    } else {
      setIntergenRegression(null);
    }
  }, [geneData, intergenData]);

  // Mostrar estado de carga
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%',
        color: '#fff',
        backgroundColor: '#1a1a1a' 
      }}>
        <p>Loading data for {selectedOrganism?.['ID-replicon']}...</p>
      </div>
    );
  }

  // Mostrar error si existe
  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%',
        color: '#ff6b6b',
        backgroundColor: '#1a1a1a',
        padding: '20px',
        textAlign: 'center'
      }}>
        <p style={{ marginBottom: '10px' }}>⚠️ {error}</p>
        <p style={{ fontSize: '0.9rem', color: '#ccc' }}>
          Select an organism from the table to view analysis
        </p>
      </div>
    );
  }

  // Mostrar mensaje si no hay organismo seleccionado
  if (!selectedOrganism) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%',
        color: '#ccc',
        backgroundColor: '#1a1a1a',
        padding: '20px',
        textAlign: 'center'
      }}>
        <p style={{ marginBottom: '10px' }}>📊 Count vs Length Analysis</p>
        <p style={{ fontSize: '0.9rem' }}>
          Select an organism from the table to view the analysis
        </p>
      </div>
    );
  }

  // Mostrar mensaje si no hay datos
  if (!allData.length) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%',
        color: '#ccc',
        backgroundColor: '#1a1a1a',
        padding: '20px',
        textAlign: 'center'
      }}>
        <p style={{ marginBottom: '10px' }}>No data available</p>
        <p style={{ fontSize: '0.9rem' }}>
          for {selectedOrganism['ID-replicon']}
        </p>
      </div>
    );
  }

  // Prepare data for genes (count en X, length en Y) - con validación adicional
  const validGeneData = geneData.filter(d => 
    d.count && d.length && 
    !isNaN(Number(d.count)) && 
    !isNaN(Number(d.length)) &&
    isFinite(Number(d.count)) &&
    isFinite(Number(d.length))
  );
  
  const geneCountValues = validGeneData.map(d => Number(d.count));
  const geneLengthValues = validGeneData.map(d => Number(d.length));
  const geneHoverText = validGeneData.map(d => {
    return (
      `Type: Gene<br>` +
      `ID: ${d.id}<br>` +
      `Name: ${d.name || 'N/A'}<br>` +
      `Position: ${d.start}-${d.end}<br>` +
      `Length: ${d.length} bp<br>` +
      `Strand: ${d.sense}<br>` +
      `Count: ${d.count}<br>` +
      `Density: ${Number(d.density || 0).toFixed(3)}`
    );
  });

  // Prepare data for intergens (count en X, length en Y) - con validación adicional
  const validIntergenData = intergenData.filter(d => 
    d.count && d.length && 
    !isNaN(Number(d.count)) && 
    !isNaN(Number(d.length)) &&
    isFinite(Number(d.count)) &&
    isFinite(Number(d.length))
  );
  
  const intergenCountValues = validIntergenData.map(d => Number(d.count));
  const intergenLengthValues = validIntergenData.map(d => Number(d.length));
  const intergenHoverText = validIntergenData.map(d => {
    return (
      `Type: Intergenic<br>` +
      `ID: ${d.id}<br>` +
      `Position: ${d.start}-${d.end}<br>` +
      `Length: ${d.length} bp<br>` +
      `Count: ${d.count}<br>` +
      `Density: ${Number(d.density || 0).toFixed(3)}`
    );
  });

  // Create plot traces
  const traces: any[] = [];
  
  // Solo agregar trazas si hay datos válidos
  if (geneCountValues.length > 0 && geneLengthValues.length > 0) {
    traces.push({
      x: geneCountValues,
      y: geneLengthValues,
      type: 'scatter',
      mode: 'markers',
      name: 'Genes',
      marker: { 
        color: '#2E86AB', 
        size: 8,
        opacity: 0.8 
      },
      text: geneHoverText,
      hoverinfo: 'text'
    });
  }
  
  if (intergenCountValues.length > 0 && intergenLengthValues.length > 0) {
    traces.push({
      x: intergenCountValues,
      y: intergenLengthValues,
      type: 'scatter',
      mode: 'markers',
      name: 'Intergenic Regions',
      marker: { 
        color: '#A23B72', 
        size: 8,
        opacity: 0.8 
      },
      text: intergenHoverText,
      hoverinfo: 'text'
    });
  }

  // Add regression lines if available
  if (geneRegression && geneCountValues.length > 1) {
    const minX = Math.min(...geneCountValues);
    const maxX = Math.max(...geneCountValues);
    const lineX = [minX, maxX];
    const lineY = lineX.map(x => geneRegression.intercept + geneRegression.slope * x);
    
    traces.push({
      x: lineX,
      y: lineY,
      type: 'scatter',
      mode: 'lines',
      name: 'Gene Regression',
      line: { color: '#2E86AB', width: 2, dash: 'dash' },
      showlegend: true,
      hoverinfo: 'skip'
    });
  }

  if (intergenRegression && intergenCountValues.length > 1) {
    const minX = Math.min(...intergenCountValues);
    const maxX = Math.max(...intergenCountValues);
    const lineX = [minX, maxX];
    const lineY = lineX.map(x => intergenRegression.intercept + intergenRegression.slope * x);
    
    traces.push({
      x: lineX,
      y: lineY,
      type: 'scatter',
      mode: 'lines',
      name: 'Intergenic Regression',
      line: { color: '#A23B72', width: 2, dash: 'dash' },
      showlegend: true,
      hoverinfo: 'skip'
    });
  }

  return ( 
    <div style={{ width: '100%', height: '100%', backgroundColor: '#1a1a1a' }}>
      <Plot
        data={traces}
        layout={{
          title: {
            text: `Count vs Length Analysis - ${selectedOrganism.genus} ${selectedOrganism.species}`,
            font: { color: '#fff', size: 14 }
          },
          margin: { t: 60, l: 60, r: 40, b: 60 },
          autosize: true,
          xaxis: { 
            title: 'Count',
            titlefont: { color: '#fff' },
            tickfont: { color: '#fff' },
            gridcolor: '#444',
            zerolinecolor: '#666'
          },
          yaxis: { 
            title: 'Length (bp)',
            titlefont: { color: '#fff' },
            tickfont: { color: '#fff' },
            gridcolor: '#444',
            zerolinecolor: '#666'
          },
          plot_bgcolor: '#2d2d2d',
          paper_bgcolor: '#1a1a1a',
          legend: {
            font: { color: '#fff' },
            bgcolor: 'rgba(45, 45, 45, 0.8)',
            bordercolor: '#666',
            borderwidth: 1
          },
          font: { color: '#fff' }
        }}
        useResizeHandler={true}
        style={{ width: '100%', height: '100%' }}
        config={{
          displayModeBar: true,
          modeBarButtonsToRemove: ['pan2d', 'lasso2d'],
          displaylogo: false
        }}
      />
    </div>
  );
};

export default LinearRegressionPlot;

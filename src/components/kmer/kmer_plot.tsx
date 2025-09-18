import React from 'react'
import Plot from 'react-plotly.js'
import Papa from "papaparse";

interface KmerPlotProps {
  id?: string
  idReplicon?: string
  uploadedData?: any[] // Add a prop for uploaded data
}

const KmerPlot: React.FC<KmerPlotProps> = ({ id, idReplicon, uploadedData }) => {
  const [data, setData] = React.useState<any[]>(uploadedData || []) // Initialize with uploadedData

  React.useEffect(() => {
    const filePath = `/data/${id}/analysis/${idReplicon}_ratio_cod_vs_non_6mer.csv`;

    fetch(filePath)
      .then((res) => res.text())
      .then((csvText) => {
        const parsed = Papa.parse(csvText, { header: true });
        console.log("Parsed CSV:", parsed);
        // Example: extract columns "position" and "value"
        const formatted = parsed.data.map((row) => ({
          Item: row.Item,
          cod: parseFloat(row.cod),   // change to your column name
          non: parseFloat(row.non), // change to your column name
          color: row.color, // change to your column name
        }));
        setData(formatted);
      })
      .catch((err) => console.error("Error loading CSV:", err));
  }, [id, idReplicon]);

  console.log("data:", data);


  if (!data || data.length === 0) {
    return <div>No hay datos disponibles</div>
  }

  // Definir colores
  const colors = {
    "6-mer": "#023047",
    "Inverted repeat": "#219ebc",
    "Palindromes": "#ffb703"
  }

  // Filtrar datos válidos
  const df_plot = data.filter(row => !isNaN(row.cod) && !isNaN(row.non))
  
  // Obtener categorías únicas
  const categories = [...new Set(df_plot.map(row => row.color))]

  // Crear trazas
  const traces = []

  categories.forEach(category => {
    const cat_data = df_plot.filter(row => row.color === category)
    const x = cat_data.map(d => parseFloat(d.cod))
    const y = cat_data.map(d => parseFloat(d.non))
    const hoverText = cat_data.map(d => d.Item)

    console.log(`x: ${x}, y: ${y}, category: ${category}`)

    // Scatter points
    traces.push({
      type: 'scatter',
      mode: 'markers',
      name: category,
      x:x,
      y:y,
      text: hoverText,
      marker: { color: colors[category as keyof typeof colors], opacity: 0.7 },
      xaxis: 'x',
      yaxis: 'y'
    })

    // Histogram (top)
    traces.push({
      type: 'histogram',
      name: `${category} (x)`,
      x,
      marker: { color: colors[category as keyof typeof colors] },
      opacity: 0.5,
      showlegend: false,
      histnorm: 'probability density',
      xaxis: 'x2',
      yaxis: 'y2'
    })

    // Histogram (right)
    traces.push({
      type: 'histogram',
      name: `${category} (y)`,
      y:y,
      marker: { color: colors[category as keyof typeof colors] },
      opacity: 0.5,
      showlegend: false,
      histnorm: 'probability density',
      xaxis: 'x3',
      yaxis: 'y3'
    })
  })

  // Líneas de referencia en ±1
  ;[-1, 1].forEach(val => {
    traces.push({
      type: 'scatter',
      mode: 'lines',
      x: [val, val],
      y: [-4, 4],
      line: { color: 'black', dash: 'dash' },
      showlegend: false,
      xaxis: 'x',
      yaxis: 'y'
    })
    traces.push({
      type: 'scatter',
      mode: 'lines',
      x: [-4, 4],
      y: [val, val],
      line: { color: 'black', dash: 'dash' },
      showlegend: false,
      xaxis: 'x',
      yaxis: 'y'
    })
  })

  // Diagonal roja
  traces.push({
    type: 'scatter',
    mode: 'lines',
    x: [-4, 4],
    y: [-4, 4],
    line: { color: 'red', dash: 'solid' },
    name: 'Diagonal',
    xaxis: 'x',
    yaxis: 'y'
  })

  return (
    <Plot
      data={traces}
      layout={{
        title: `Kmer Distribution for ${id || ''}`,
        margin: {
          l: 0,
          r: 0,
          t: 30,
          b: 0
        },
        grid: {
          rows: 2,
          columns: 2,
          pattern: 'independent',
          roworder: 'top to bottom'
        },
        xaxis: {
          domain: [0, 0.8],
          range: [-4, 4],
          tickvals: [-4, -3, -2, -1, 0, 1, 2, 3, 4],
          showgrid: true,
          gridcolor: 'lightgray'
        },
        yaxis: {
          domain: [0, 0.8],
          range: [-4, 4],
          tickvals: [-4, -3, -2, -1, 0, 1, 2, 3, 4],
          showgrid: true,
          gridcolor: 'lightgray'
        },
        xaxis2: {
          domain: [0, 0.8],
          range: [-4, 4],
          anchor: 'y2',
          showgrid: false
        },
        yaxis2: {
          domain: [0.8, 1.0],
          anchor: 'x2',
          showgrid: false
        },
        xaxis3: {
          domain: [0.8, 1.0],
          anchor: 'y3',
          showgrid: false
        },
        yaxis3: {
          domain: [0, 0.8],
          range: [-4, 4],
          anchor: 'x3',
          showgrid: false
        },
        barmode: 'overlay',
        showlegend: true,
        template: 'simple_white'
      }}
      style={{ width: '100%', height: '100%' }}
      useResizeHandler={true}
      config={{
        responsive: true,
        displayModeBar: true,
        displaylogo: false
      }}
    />
  )
}

export default KmerPlot

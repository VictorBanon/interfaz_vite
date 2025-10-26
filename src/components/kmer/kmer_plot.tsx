import React from 'react'
import Plot from 'react-plotly.js'
import Papa from "papaparse";

interface KmerPlotProps {
  id?: string
  idReplicon?: string
  uploadedData?: any[] // Add a prop for uploaded data
}

const KmerPlot: React.FC<KmerPlotProps> = ({ id, idReplicon, uploadedData }) => {
  const [data, setData] = React.useState<any[]>(uploadedData || [])
  const [loading, setLoading] = React.useState<boolean>(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!id || !idReplicon) return

    const filePath = `/data/${id}/analysis/${idReplicon}_ratio_cod_vs_non_6mer.csv`;
    
    setLoading(true)
    setError(null)

    fetch(filePath)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`File not found: ${filePath} (HTTP ${res.status})`)
        }
        return res.text()
      })
      .then((csvText) => {
        // Check if response is HTML (dev server returns HTML for missing files)
        const trimmedText = csvText.trim()
        if (trimmedText.startsWith('<!DOCTYPE html>') || 
            trimmedText.startsWith('<html') || 
            trimmedText.includes('<title>') ||
            trimmedText.includes('Cannot GET')) {
          throw new Error(`File not found (HTML response received): ${filePath}`)
        }
        
        // Additional check: ensure we have some basic CSV structure
        if (!trimmedText.includes(',') && !trimmedText.includes('Item')) {
          throw new Error(`Invalid file format (not CSV): ${filePath}`)
        }
        
        const parsed = Papa.parse(csvText, { 
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim()
        });
        console.log("Parsed CSV from:", filePath);
        
        if (parsed.errors.length > 0) {
          console.error("CSV parsing errors:", parsed.errors);
          throw new Error(`CSV parsing error: ${parsed.errors[0].message}. File may be corrupted or in wrong format.`)
        }
        
        // Validate that we have the expected columns
        if (parsed.data.length === 0) {
          throw new Error(`Empty CSV file: ${filePath}`)
        }
        
        const firstRow = parsed.data[0] as any;
        if (!firstRow || typeof firstRow !== 'object') {
          throw new Error(`Invalid CSV structure: ${filePath}`)
        }
        
        const requiredColumns = ['Item', 'cod', 'non', 'color'];
        const missingColumns = requiredColumns.filter(col => !(col in firstRow));
        if (missingColumns.length > 0) {
          throw new Error(`Missing required columns in CSV: ${missingColumns.join(', ')}. File: ${filePath}`)
        }
        
        const formatted = parsed.data
          .filter((row: any) => row.Item && row.cod !== undefined && row.non !== undefined)
          .map((row: any) => ({
            Item: row.Item,
            cod: parseFloat(row.cod),
            non: parseFloat(row.non),
            color: row.color,
          }));
        setData(formatted);
      })
      .catch((err) => {
        console.error("Error loading CSV:", err);
        const filePath = `/data/${id}/analysis/${idReplicon}_ratio_cod_vs_non_6mer.csv`;
        setError(`${err.message}. Expected file: ${filePath}`)
      })
      .finally(() => {
        setLoading(false)
      });
  }, [id, idReplicon]);

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading k-mer data...</div>
  }

  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        color: '#e74c3c',
        border: '2px solid #e74c3c',
        borderRadius: '5px',
        margin: '10px'
      }}>
        <h3>Error Loading K-mer Data</h3>
        <p>{error}</p>
        <p style={{ fontSize: '0.8em', color: '#666' }}>
          ID: {id} | Replicon: {idReplicon}
        </p>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        color: '#f39c12',
        border: '2px solid #f39c12',
        borderRadius: '5px',
        margin: '10px'
      }}>
        <h3>No Data Available</h3>
        <p>No k-mer data found for the selected parameters</p>
      </div>
    )
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
      type: 'scatter' as const,
      mode: 'lines' as const,
      x: [val, val],
      y: [-4, 4],
      line: { color: 'black', dash: 'dash' as const },
      showlegend: false,
      xaxis: 'x',
      yaxis: 'y'
    })
    traces.push({
      type: 'scatter' as const,
      mode: 'lines' as const,
      x: [-4, 4],
      y: [val, val],
      line: { color: 'black', dash: 'dash' as const },
      showlegend: false,
      xaxis: 'x',
      yaxis: 'y'
    })
  })

  // Diagonal roja
  traces.push({
    type: 'scatter' as const,
    mode: 'lines' as const,
    x: [-4, 4],
    y: [-4, 4],
    line: { color: 'red', dash: 'solid' as const },
    name: 'Diagonal',
    xaxis: 'x',
    yaxis: 'y'
  })

  return (
    <Plot
      data={traces}
      layout={{
        title: { text: `Kmer Distribution for ${id || ''}` },
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
        showlegend: true
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

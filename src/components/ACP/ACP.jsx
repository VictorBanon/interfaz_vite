import React, { useState, useEffect } from "react"
import Plot from "react-plotly.js"
import Papa from "papaparse"

const ACP = ({ csvPath, pcX, pcY, onPointClick }) => {
  const [data, setData] = useState([])

  useEffect(() => {
    Papa.parse(csvPath, {
      header: true,
      download: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const filtered = results.data.filter(row => row && Object.keys(row).length > 0)
        setData(filtered)
      },
      error: (err) => console.error("CSV parsing error:", err)
    })
  }, [csvPath])

  useEffect(() => {
    console.log('ACP updating with PC values:', { pcX, pcY })
    // Si necesitas recargar o reprocesar datos cuando cambien pcX o pcY
    // Puedes hacerlo aquí
  }, [pcX, pcY])

  if (data.length === 0) return <p>Loading...</p>

  // Group rows by color
  const colorGroups = {}
  data.forEach((row) => {
    const color = row.color || "Unknown"
    if (!colorGroups[color]) colorGroups[color] = []
    colorGroups[color].push(row)
  })

  // Create one trace per color
  const traces = Object.entries(colorGroups).map(([color, points]) => ({
    x: points.map(row => row[`PC${pcX}`] || 0),
    y: points.map(row => row[`PC${pcY}`] || 0),
    text: points.map(row => row.id || ""),
    customdata: points,
    hovertemplate: 
      '<b>Name:</b> %{customdata.name}<br>' +
      '<b>ID:</b> %{customdata.id}<br>' +
      '<b>PC' + pcX + ':</b> %{x:.3f}<br>' +
      '<b>PC' + pcY + ':</b> %{y:.3f}<br>' +
      '<extra></extra>',
    mode: 'markers',
    type: 'scatter',
    marker: {
      size: 6,
      color: color,
    },
    name: color
  }))

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Plot
        data={traces}
        layout={{
          title: `PC${pcY} vs PC${pcX}`,
          xaxis: { 
            title: `PC${pcX}`,
            titlefont: { size: 8 },
            tickfont: { size: 7 }
          },
          yaxis: { 
            title: `PC${pcY}`,
            titlefont: { size: 8 },
            tickfont: { size: 7 }
          },
          hovermode: "closest",
          autosize: true,
          margin: { l: 20, r: 60, t: 20, b: 20 },
          height: null, // Removemos la altura fija
          width: null // Removemos el ancho fijo
        }}
        style={{ 
          width: '100%', 
          height: '100%',
        }}
        useResizeHandler={true}
        config={{ 
          responsive: true,
          displayModeBar: true, // Activar la barra de herramientas
          displaylogo: false,
          modeBarButtonsToRemove: ['lasso2d'], // Mantener herramientas útiles
          toImageButtonOptions: {
            format: 'png',
            filename: 'acp_plot',
            height: 1000,
            width: 1000,
            scale: 2
          }
        }}
        onClick={(event) => {
          if (event.points && event.points[0]) {
            const point = event.points[0].customdata;
            console.log('Punto clickeado:', point);
            if (onPointClick) {
              onPointClick({
                name: point.name,
                id: point.id
              });
            }
          }
        }}
      />
    </div>
  )
}

export default ACP

import React, { useState, useEffect } from "react"
import Plot from "react-plotly.js"
import Papa from "papaparse"
import { buildACPFilePath } from '../../utils/taxonomyUtils'

const ACP = ({ csvPath, pcX, pcY, onPointClick, taxon, taxonValue, part }) => {
  const [data, setData] = useState([])
  const [currentCsvPath, setCurrentCsvPath] = useState(csvPath)

  // Construir ruta dinámica cuando cambien los parámetros
  useEffect(() => {
    const updateCsvPath = async () => {
      if (taxon && taxonValue && part) {
        try {
          const dynamicPath = await buildACPFilePath(taxon, taxonValue, part, 'acp', pcX, pcY)
          console.log('Dynamic ACP path:', dynamicPath)
          setCurrentCsvPath(dynamicPath)
        } catch (error) {
          console.error('Error building dynamic path:', error)
          // Usar ruta por defecto si hay error
          setCurrentCsvPath(csvPath || `/data/philogenie/Bacteria/acp_hc_${part}_Bacteria.csv`)
        }
      } else {
        setCurrentCsvPath(csvPath)
      }
    }
    
    updateCsvPath()
  }, [taxon, taxonValue, part, pcX, pcY, csvPath])

  useEffect(() => {
    if (!currentCsvPath) return
    
    console.log('Loading ACP data from:', currentCsvPath)
    Papa.parse(currentCsvPath, {
      header: true,
      download: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const filtered = results.data.filter(row => row && Object.keys(row).length > 0)
        console.log('ACP data loaded:', filtered.length, 'rows')
        setData(filtered)
      },
      error: (err) => {
        console.error("CSV parsing error:", err)
        setData([])
      }
    })
  }, [currentCsvPath])

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
      '<b>ID-replicon:</b> %{customdata.ID-replicon}<br>' +
      '<b>ID:</b> %{customdata.ID}<br>' +
      '<b>PC' + pcX + ':</b> %{x:.3f}<br>' +
      '<b>PC' + pcY + ':</b> %{y:.3f}<br>' +
      '<b>name:</b> %{customdata.fullname} <br>' +
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
                ID: point.ID,
                "ID-replicon": point["ID-replicon"],
              });
            }
          }
        }}
      />
    </div>
  )
}

export default ACP

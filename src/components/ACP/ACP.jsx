import React, { useState, useEffect } from "react"
import Plot from "react-plotly.js"
import Papa from "papaparse"
import { buildACPFilePath } from '../../utils/taxonomyUtils'

const ACP = ({ csvPath, pcX, pcY, onPointClick, taxon, taxonValue, part, groupBy = "superkingdom", analysisType = "hc" }) => {
  const [data, setData] = useState([])
  const [currentCsvPath, setCurrentCsvPath] = useState(csvPath)

  // Construir ruta dinámica cuando cambien los parámetros
  useEffect(() => {
    const updateCsvPath = async () => {
      if (taxon && taxonValue && part) {
        try {
          // Para kmer, usar archivos acp_hc jerárquicos normales (no hay archivos kmer específicos)
          const aggregateType = 'acp'
          const dynamicPath = await buildACPFilePath(taxon, taxonValue, part, aggregateType, pcX, pcY)
          console.log('Dynamic ACP path for', analysisType, ':', dynamicPath)
          setCurrentCsvPath(dynamicPath)
        } catch (error) {
          console.error('Error building dynamic path:', error)
          // Usar ruta por defecto si hay error
          const fallbackPath = analysisType === 'kmer' 
            ? `/data/philogenie/Bacteria/acp_kmer_Bacteria.csv`
            : `/data/philogenie/Bacteria/acp_hc_${part}_Bacteria.csv`
          setCurrentCsvPath(csvPath || fallbackPath)
        }
      } else {
        setCurrentCsvPath(csvPath)
      }
    }
    
    updateCsvPath()
  }, [taxon, taxonValue, part, pcX, pcY, csvPath, analysisType])

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

  // Create traces based on groupBy type
  let traces
  if (groupBy === 'size' || groupBy === 'GC') {
    // For continuous variables, use numeric color scale with colorbar
    // Filter out rows with non-numeric values
    const validData = data.filter(row => {
      const value = parseFloat(row[groupBy])
      return !isNaN(value) && value !== null && value !== undefined
    })
    
    const numericValues = validData.map(row => parseFloat(row[groupBy]))
    
    traces = [{
      x: validData.map(row => row[`PC${pcX}`] || 0),
      y: validData.map(row => row[`PC${pcY}`] || 0),
      text: validData.map(row => row.id || ""),
      customdata: validData,
      hovertemplate: 
        '<b>ID-replicon:</b> %{customdata.ID-replicon}<br>' +
        '<b>ID:</b> %{customdata.ID}<br>' +
        '<b>PC' + pcX + ':</b> %{x:.3f}<br>' +
        '<b>PC' + pcY + ':</b> %{y:.3f}<br>' +
        '<b>name:</b> %{customdata.fullname}<br>' +
        '<b>' + groupBy + ':</b> %{customdata.' + groupBy + '}<br>' +
        '<extra></extra>',
      mode: 'markers',
      type: 'scatter',
      marker: {
        size: 6,
        color: numericValues,
        colorscale: groupBy === 'GC' ? 'RdYlBu_r' : (
          groupBy === 'size' ? [
            [0, 'lightblue'],      // Azul claro
            [0.2, 'skyblue'],      // Azul cielo
            [0.4, 'steelblue'],    // Azul acero
            [0.6, 'brown'],        // Marrón
            [0.8, 'saddlebrown'],  // Marrón silla
            [1, 'darkbrown']       // Marrón oscuro
          ] : 'Plasma'
        ),
        // Set fixed color range for GC (0-1) for better visualization
        ...(groupBy === 'GC' && {
          cmin: 0,
          cmax: 1
        }),
        colorbar: {
          title: {
            text: groupBy === 'GC' ? 'GC Content' : (groupBy === 'size' ? 'Size (bp)' : groupBy),
            side: 'right'
          },
          thickness: 15,
          len: 0.7,
          x: 1.02,
          tickfont: { size: 10 },
          // Set fixed range for GC to 0-1 for better color distribution
          ...(groupBy === 'GC' && {
            tick0: 0,
            dtick: 0.1,
            tickmode: 'linear'
          })
        },
        showscale: true
      },
      name: groupBy + ' (scale)',
      showlegend: false
    }]
  } else {
    // For categorical variables, group by the selected field
    const groups = {}
    data.forEach((row) => {
      const groupValue = row[groupBy] || "Unknown"
      if (!groups[groupValue]) groups[groupValue] = []
      groups[groupValue].push(row)
    })

    // Create one trace per group
    traces = Object.entries(groups).map(([groupValue, points]) => ({
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
        color: groupValue,
      },
      name: groupValue
    }))
  }

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
          margin: { l: 20, r: 100, t: 20, b: 20 }, // Increased right margin for colorbar
          height: null,
          width: null,
          showlegend: true // Forzar mostrar leyenda siempre
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

import React, { useState, useEffect } from "react"
import Plot from "react-plotly.js"
import Papa from "papaparse"
import { buildACPFilePath } from '../../utils/taxonomyUtils'

const ACP = ({ csvPath, pcX, pcY, onPointClick, taxon, taxonValue, part, groupBy = "Superdomain", analysisType = "hc", selectedFilters = [], onFilterOptionsChange }) => {
  console.log('ACP: Component mounted/rendered with props:', { csvPath, pcX, pcY, taxon, taxonValue, part, groupBy })
  
  const [data, setData] = useState([])
  const [currentCsvPath, setCurrentCsvPath] = useState(csvPath)
  const [legendState, setLegendState] = useState({}) // Track which traces are visible/hidden

  console.log('ACP: Current state - data length:', data.length, 'currentCsvPath:', currentCsvPath)

  // Build dynamic path when parameters change
  useEffect(() => {
    const updateCsvPath = async () => {
      if (taxon && taxonValue && part) {
        try {
          // For kmer, use specific kmer files, for structural use hc files
          const aggregateType = analysisType === 'kmer' ? 'kmer' : 'acp'
          const dynamicPath = await buildACPFilePath(taxon, taxonValue, part, aggregateType, pcX, pcY)
          console.log('Dynamic ACP path for', analysisType, ':', dynamicPath)
          setCurrentCsvPath(dynamicPath)
        } catch (error) {
          console.error('Error building dynamic path:', error)
          // Use default path if there's an error
          const fallbackPath = analysisType === 'kmer' 
            ? `/data/philogenie/Prokaryote/acp_kmer_Prokaryote.csv`
            : `/data/philogenie/Prokaryote/acp_hc_${part}_Prokaryote.csv`
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
    
    // First check if file exists
    fetch(currentCsvPath, { method: 'HEAD' })
      .then(response => {
        if (!response.ok) {
          throw new Error(`File not found: ${currentCsvPath}`)
        }
        
        // If file exists, parse it
        Papa.parse(currentCsvPath, {
          header: true,
          download: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            // Check if we got HTML instead of CSV data
            if (results.data.length > 0 && 
                results.data[0] && 
                typeof results.data[0] === 'object' && 
                Object.keys(results.data[0]).some(key => key.includes('<!DOCTYPE') || key.includes('<html'))) {
              console.error("Received HTML instead of CSV:", currentCsvPath)
              setData([{ error: `File not found (HTML response received): ${currentCsvPath}` }])
              return
            }
            
            const filtered = results.data.filter(row => row && Object.keys(row).length > 0)
            console.log('ACP data loaded:', filtered.length, 'rows')
            setData(filtered)
            
            // Extract all categorical columns and their unique values for filtering
            if (onFilterOptionsChange && filtered.length > 0) {
              const allFilterOptions = {}
              
              // Get all column names from the first row
              const columns = Object.keys(filtered[0])
              
              // For each column, extract unique values (exclude numerical analysis columns like PC1, PC2, etc.)
              columns.forEach(column => {
                // Skip PC columns, GC, and size as they are handled separately
                if (!column.startsWith('PC') && column !== 'GC' && column !== 'size') {
                  const uniqueValues = [...new Set(filtered.map(row => row[column]).filter(val => val && val !== '' && val !== null && val !== undefined))]
                  if (uniqueValues.length > 0 && uniqueValues.length < filtered.length * 0.8) { // Only include if it's truly categorical (not mostly unique)
                    allFilterOptions[column] = uniqueValues
                  }
                }
              })
              
              onFilterOptionsChange(allFilterOptions)
            }
          },
          error: (err) => {
            console.error("CSV parsing error:", err)
            console.error("Failed to load file:", currentCsvPath)
            setData([{ error: `Error parsing file: ${currentCsvPath}` }])
          }
        })
      })
      .catch(error => {
        console.error("File not found:", currentCsvPath)
        setData([{ error: `File not found: ${currentCsvPath}` }])
      })
  }, [currentCsvPath])

  useEffect(() => {
    console.log('ACP updating with PC values:', { pcX, pcY })
    // Si necesitas recargar o reprocesar datos cuando cambien pcX o pcY
    // Puedes hacerlo aquí
  }, [pcX, pcY])

  // Apply filters to data
  const filteredData = React.useMemo(() => {
    if (!data || data.length === 0) return data
    
    // If no filters are selected, return all data
    if (!selectedFilters || Object.keys(selectedFilters).length === 0) {
      return data
    }
    
    // Filter data based on selected filters for each column
    return data.filter(row => {
      // Check if the row matches all filter criteria
      return Object.entries(selectedFilters).every(([column, values]) => {
        if (!values || values.length === 0) return true // No filter for this column
        
        const rowValue = row[column] || "Unknown"
        return values.includes(rowValue)
      })
    })
  }, [data, selectedFilters])

  if (filteredData.length === 0 && data.length > 0) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        color: '#e74c3c',
        border: '2px solid #e74c3c',
        borderRadius: '5px',
        margin: '10px'
      }}>
        <h3>No Data Matches Filter</h3>
        <p>All data has been filtered out. Please adjust your filter selection.</p>
        <p style={{ fontSize: '0.8em', color: '#666' }}>
          Analysis Type: {analysisType} | Taxon: {taxonValue} | Part: {part} | Active Filters: {Object.keys(selectedFilters || {}).length}
        </p>
      </div>
    )
  }

  if (data.length === 0) return <p>Loading...</p>
  
  // Check for error messages
  if (filteredData.length === 1 && filteredData[0].error) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        color: '#e74c3c',
        border: '2px solid #e74c3c',
        borderRadius: '5px',
        margin: '10px'
      }}>
        <h3>Error Loading Data</h3>
        <p>{filteredData[0].error}</p>
        <p style={{ fontSize: '0.8em', color: '#666' }}>
          Analysis Type: {analysisType} | Taxon: {taxonValue} | Part: {part}
        </p>
      </div>
    )
  }

  // Función para obtener etiquetas de ejes más descriptivas
  const getAxisLabel = (pcNumber) => {
    if (pcNumber === "GC") return "GC Content"
    if (pcNumber === "size") return "Size (bp)"
    return `PC${pcNumber} (Principal Component ${pcNumber})`
  }

  // Función para obtener puntos extremos (altos y bajos) solo para el eje X
  const getExtremePoints = (data, pcX) => {
    if (!data || data.length === 0) return { extremeX: [] }
    
    // Filtrar datos válidos
    const validData = data.filter(row => {
      const xValue = pcX === "GC" ? parseFloat(row.GC) : 
                   pcX === "size" ? parseFloat(row.size) : 
                   row[`PC${pcX}`]
      return !isNaN(xValue) && xValue !== null && xValue !== undefined
    })
    
    if (validData.length === 0) return { extremeX: [] }
    
    // Calcular cuántos puntos extremos tomar
    const totalPoints = validData.length
    const numExtremePoints = totalPoints < 20 ? Math.floor(totalPoints / 2) : 10
    
    if (numExtremePoints === 0) return { extremeX: [] }
    
    // Obtener valores para el eje X
    const xValues = validData.map(row => ({
      data: row,
      value: pcX === "GC" ? parseFloat(row.GC) : 
             pcX === "size" ? parseFloat(row.size) : 
             row[`PC${pcX}`]
    }))
    
    // Ordenar por valor para encontrar extremos
    xValues.sort((a, b) => a.value - b.value)
    
    // Obtener puntos extremos para X (altos y bajos)
    const xLowPoints = xValues.slice(0, numExtremePoints)
    const xHighPoints = xValues.slice(-numExtremePoints)
    
    return {
      extremeX: [...xLowPoints, ...xHighPoints],
      numExtremePoints
    }
  }

  // Create traces based on groupBy type
  let traces
  
  // Obtener puntos extremos solo para el eje X
  const { extremeX, numExtremePoints } = getExtremePoints(filteredData, pcX)
  
  // Crear conjunto de IDs para identificar puntos extremos del eje X
  const extremeXIds = new Set(extremeX.map(point => point.data.ID || point.data['ID-replicon']))
  
  if (groupBy === 'size' || groupBy === 'GC') {
    // For continuous variables, use numeric color scale with colorbar
    // Filter out rows with non-numeric values
    const validData = filteredData.filter(row => {
      const value = parseFloat(row[groupBy])
      return !isNaN(value) && value !== null && value !== undefined
    })
    
    const numericValues = validData.map(row => parseFloat(row[groupBy]))
    
    traces = [{
      x: validData.map(row => {
        if (pcX === "GC") return parseFloat(row.GC) || 0;
        if (pcX === "size") return parseFloat(row.size) || 0;
        return row[`PC${pcX}`] || 0;
      }),
      y: validData.map(row => {
        if (pcY === "GC") return parseFloat(row.GC) || 0;
        if (pcY === "size") return parseFloat(row.size) || 0;
        return row[`PC${pcY}`] || 0;
      }),
      text: validData.map(row => row.id || ""),
      customdata: validData,
      hovertemplate: 
        '<b>ID-replicon:</b> %{customdata.ID-replicon}<br>' +
        '<b>ID:</b> %{customdata.ID}<br>' +
        '<b>' + getAxisLabel(pcX) + ':</b> %{x:.3f}<br>' +
        '<b>' + getAxisLabel(pcY) + ':</b> %{y:.3f}<br>' +
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
      showlegend: false,
      visible: legendState[groupBy + ' (scale)'] !== 'legendonly'
    }]
  } else {
    // For categorical variables, group by the selected field
    const groups = {}
    filteredData.forEach((row) => {
      const groupValue = row[groupBy] || "Unknown"
      if (!groups[groupValue]) groups[groupValue] = []
      groups[groupValue].push(row)
    })

    // Create one trace per group
    traces = Object.entries(groups).map(([groupValue, points]) => ({
      x: points.map(row => {
        if (pcX === "GC") return parseFloat(row.GC) || 0;
        if (pcX === "size") return parseFloat(row.size) || 0;
        return row[`PC${pcX}`] || 0;
      }),
      y: points.map(row => {
        if (pcY === "GC") return parseFloat(row.GC) || 0;
        if (pcY === "size") return parseFloat(row.size) || 0;
        return row[`PC${pcY}`] || 0;
      }),
      text: points.map(row => row.id || ""),
      customdata: points,
      hovertemplate: 
        '<b>ID-replicon:</b> %{customdata.ID-replicon}<br>' +
        '<b>ID:</b> %{customdata.ID}<br>' +
        '<b>' + getAxisLabel(pcX) + ':</b> %{x:.3f}<br>' +
        '<b>' + getAxisLabel(pcY) + ':</b> %{y:.3f}<br>' +
        '<b>name:</b> %{customdata.fullname} <br>' +
        '<extra></extra>',
      mode: 'markers',
      type: 'scatter',
      marker: {
        size: 6,
        color: groupValue,
      },
      name: groupValue,
      visible: legendState[groupValue] !== 'legendonly' ? true : 'legendonly'
    }))
  }

  // Agregar trazas para puntos extremos del eje X si hay datos suficientes
  if (numExtremePoints > 0 && extremeX.length > 0) {
    // Puntos extremos para eje X
    const xExtremePoints = extremeX.map(point => point.data)
    
    // Separar en altos y bajos para X
    const xLowPoints = xExtremePoints.slice(0, numExtremePoints)
    const xHighPoints = xExtremePoints.slice(numExtremePoints)
    
    // Traza para puntos X bajos (usando colores que no interfieran con groupBy)
    if (xLowPoints.length > 0) {
      const traceName = `${pcX === "GC" ? "GC" : (pcX === "size" ? "Size" : `PC${pcX}`)} BOTTOM ${numExtremePoints}`;
      traces.push({
        x: xLowPoints.map(row => {
          if (pcX === "GC") return parseFloat(row.GC) || 0;
          if (pcX === "size") return parseFloat(row.size) || 0;
          return row[`PC${pcX}`] || 0;
        }),
        y: xLowPoints.map(row => {
          if (pcY === "GC") return parseFloat(row.GC) || 0;
          if (pcY === "size") return parseFloat(row.size) || 0;
          return row[`PC${pcY}`] || 0;
        }),
        customdata: xLowPoints,
        hovertemplate: 
          '<b>ID-replicon:</b> %{customdata.ID-replicon}<br>' +
          '<b>ID:</b> %{customdata.ID}<br>' +
          '<b>' + getAxisLabel(pcX) + ':</b> %{x:.3f} (BAJO)<br>' +
          '<b>' + getAxisLabel(pcY) + ':</b> %{y:.3f}<br>' +
          '<b>name:</b> %{customdata.fullname}<br>' +
          '<extra></extra>',
        mode: 'markers',
        type: 'scatter',
        marker: {
          size: 10,
          color: 'rgba(255, 68, 68, 0.8)', // Rojo semi-transparente para valores bajos
          symbol: 'triangle-down',
          line: { color: 'black', width: 2 }
        },
        name: traceName,
        showlegend: true,
        visible: legendState[traceName] !== 'legendonly' ? true : 'legendonly'
      })
    }
    
    // Traza para puntos X altos (usando colores que no interfieran con groupBy)
    if (xHighPoints.length > 0) {
      const traceName = `${pcX === "GC" ? "GC" : (pcX === "size" ? "Size" : `PC${pcX}`)} TOP ${numExtremePoints}`;
      traces.push({
        x: xHighPoints.map(row => {
          if (pcX === "GC") return parseFloat(row.GC) || 0;
          if (pcX === "size") return parseFloat(row.size) || 0;
          return row[`PC${pcX}`] || 0;
        }),
        y: xHighPoints.map(row => {
          if (pcY === "GC") return parseFloat(row.GC) || 0;
          if (pcY === "size") return parseFloat(row.size) || 0;
          return row[`PC${pcY}`] || 0;
        }),
        customdata: xHighPoints,
        hovertemplate: 
          '<b>ID-replicon:</b> %{customdata.ID-replicon}<br>' +
          '<b>ID:</b> %{customdata.ID}<br>' +
          '<b>' + getAxisLabel(pcX) + ':</b> %{x:.3f} (ALTO)<br>' +
          '<b>' + getAxisLabel(pcY) + ':</b> %{y:.3f}<br>' +
          '<b>name:</b> %{customdata.fullname}<br>' +
          '<extra></extra>',
        mode: 'markers',
        type: 'scatter',
        marker: {
          size: 10,
          color: 'rgba(68, 255, 68, 0.8)', // Verde semi-transparente para valores altos
          symbol: 'triangle-up',
          line: { color: 'black', width: 2 }
        },
        name: traceName,
        showlegend: true,
        visible: legendState[traceName] !== 'legendonly' ? true : 'legendonly'
      })
    }
  }

  // Calcular el número total de puntos
  const totalPoints = filteredData.length

  // Crear título dinámico con taxón y número de puntos
  const getTitle = () => {
    const yLabel = pcY === "GC" ? "GC" : (pcY === "size" ? "Size" : `PC${pcY}`)
    const xLabel = pcX === "GC" ? "GC" : (pcX === "size" ? "Size" : `PC${pcX}`)
    const baseTitle = `${xLabel} vs ${yLabel}`
    let title = baseTitle
    
    if (taxonValue && totalPoints > 0) {
      title = `${taxonValue} (${totalPoints} points) - ${baseTitle}`
    } else if (totalPoints > 0) {
      title = `${baseTitle} (${totalPoints} points)`
    }
    
    return title
  }

  const openACPInPopup = () => {
    // Create a popup window
    const popup = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes')
    
    if (popup) {
      // Create the HTML content for the popup
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>ACP Analysis - ${getTitle()}</title>
          <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #f5f5f5;
            }
            .container {
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              padding: 20px;
              height: calc(100vh - 80px);
            }
            .header {
              margin-bottom: 20px;
              text-align: center;
            }
            .plot-container {
              height: calc(100% - 80px);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>${getTitle()}</h2>
              <p>Principal Component Analysis - ${analysisType.toUpperCase()} - ${part?.toUpperCase() || 'ALL'}</p>
              <p>Grouped by: ${groupBy} | Total Points: ${totalPoints}</p>
            </div>
            <div id="plot" class="plot-container"></div>
          </div>
          <script>
            const plotData = ${JSON.stringify(traces)};
            
            const layout = {
              title: { 
                text: '${getTitle()}',
                font: { size: 18 }
              },
              xaxis: {
                title: {
                  text: '${getAxisLabel(pcX)}',
                  font: { size: 16 }
                },
                titlefont: { size: 14 },
                tickfont: { size: 12 }
              },
              yaxis: {
                title: {
                  text: '${getAxisLabel(pcY)}',
                  font: { size: 16 }
                },
                titlefont: { size: 14 },
                tickfont: { size: 12 }
              },
              hovermode: "closest",
              autosize: true,
              margin: { l: 80, r: 150, t: 80, b: 80 },
              showlegend: true,
              legend: {
                x: 1.02,
                y: 1,
                xanchor: 'left',
                yanchor: 'top',
                font: { size: 12 },
                bgcolor: 'rgba(255, 255, 255, 0.8)',
                bordercolor: '#999999',
                borderwidth: 1
              }
            };
            
            const config = {
              responsive: true,
              displayModeBar: true,
              displaylogo: false,
              toImageButtonOptions: {
                format: 'png',
                filename: 'acp_${analysisType}_${part || 'all'}_${taxonValue || 'analysis'}',
                height: 800,
                width: 1000,
                scale: 2
              }
            };
            
            Plotly.newPlot('plot', plotData, layout, config);
            
            // Make plot responsive to window resize
            window.addEventListener('resize', () => {
              Plotly.Plots.resize('plot');
            });
          </script>
        </body>
        </html>
      `
      
      popup.document.write(htmlContent)
      popup.document.close()
    } else {
      alert('Please allow popups to open the plot in a new window')
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div style={{ 
        position: 'absolute', 
        bottom: '10px', 
        right: '10px', 
        zIndex: 1000 
      }}>
        <button
          onClick={openACPInPopup}
          style={{
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#2980b9'
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#3498db'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)'
          }}
          title="Open ACP plot in new window"
        >
          🔗 Open in Popup
        </button>
      </div>
      <Plot
        data={traces}
        layout={{
          title: {
            text: getTitle(),
            font: { size: 12 },
            x: 0.5,
            xanchor: 'center'
          },
          xaxis: { 
            title: {
              text: getAxisLabel(pcX),
              font: { size: 10 }
            },
            titlefont: { size: 8 },
            tickfont: { size: 7 }
          },
          yaxis: { 
            title: {
              text: getAxisLabel(pcY),
              font: { size: 10 }
            },
            titlefont: { size: 8 },
            tickfont: { size: 7 }
          },
          hovermode: "closest",
          autosize: true,
          margin: { l: 50, r: 100, t: 50, b: 50 }, // Increased margins for better axis labels
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
                fullname: point.fullname,
                name: point.name,
                species: point.species,
                genus: point.genus,
                // Pasar todos los campos disponibles
                ...point
              });
            }
          }
        }}
        onLegendClick={(event) => {
          // Capture legend state to preserve filters
          const traceName = event.data[event.curveNumber].name;
          const newState = { ...legendState };
          
          if (event.data[event.curveNumber].visible === true) {
            newState[traceName] = 'legendonly';
          } else if (event.data[event.curveNumber].visible === 'legendonly') {
            newState[traceName] = true;
          } else {
            newState[traceName] = true;
          }
          
          setLegendState(newState);
          return false; // Allow default legend behavior
        }}
      />
    </div>
  )
}

export default ACP

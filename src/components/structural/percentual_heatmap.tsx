import React, { useState, useEffect } from 'react'
import Plot from 'react-plotly.js'
import Papa from 'papaparse'

interface PercentualHeatmapProps {
  id?: string
  idReplicon?: string
  name?: string
  part: string
}

interface Top10Data {
  gap_size: number
  size: number
  motif: string
  count: number
}

interface AggregatedData {
  size: number
  gap_counts: { [gap_size: number]: number }
}

const PercentualHeatmap: React.FC<PercentualHeatmapProps> = ({ id, idReplicon, name, part }) => {
  const [data, setData] = useState<number[][]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [xLabels, setXLabels] = useState<string[]>([])
  const [yLabels, setYLabels] = useState<string[]>([])
  const [textMatrix, setTextMatrix] = useState<string[][]>([])
  const [highlightMatrix, setHighlightMatrix] = useState<boolean[][]>([]) // Nueva matriz de highlights

  const [isPercentageMode, setIsPercentageMode] = useState<boolean>(true)

  useEffect(() => {
    if (!id || !idReplicon) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // Cargar datos top10 y aggregated
        const top10FilePath = `/data/${id}/analysis/${idReplicon}_${part}_obs_top10_per_gap_size.csv`
        const aggregatedFilePath = `/data/${id}/analysis/${idReplicon}_${part}_result_obs_aggregated.csv`
        
        const [top10Response, aggregatedResponse] = await Promise.all([
          fetch(top10FilePath),
          fetch(aggregatedFilePath)
        ])

        if (!top10Response.ok || !aggregatedResponse.ok) {
          throw new Error(`Failed to load data files. Top10: ${top10Response.status}, Aggregated: ${aggregatedResponse.status}`)
        }

        const top10Text = await top10Response.text()
        const aggregatedText = await aggregatedResponse.text()

        // Check if responses are HTML (file not found)
        if (top10Text.trim().startsWith('<!DOCTYPE html>') || aggregatedText.trim().startsWith('<!DOCTYPE html>')) {
          throw new Error('One or more data files not found')
        }

        // Parse both files
        const parseTop10 = new Promise<Top10Data[]>((resolve) => {
          Papa.parse(top10Text, {
            header: true,
            worker: false,
            delimiter: '',  // Auto-detect delimiter
            complete: (results: any) => {
              const cleanData: Top10Data[] = []
              
              results.data.forEach((row: any) => {
                try {
                  const gap_size = parseInt(row.gap_size || row['gap_size'] || row['Gap Size'] || '0')
                  const size = parseInt(row.size || row['Size'] || '0')
                  
                  // Parse motif and count arrays from string format
                  const motifStr = row.motif || row['Motif'] || row['motif_sequence'] || ''
                  const countStr = row.count || row['Count'] || row['observed_count'] || ''
                  
                  // Skip empty rows
                  if (!motifStr || !countStr || motifStr.trim() === '' || countStr.trim() === '') {
                    return
                  }
                  
                  // Parse the string arrays - they come as "['item1', 'item2', ...]" and "[num1, num2, ...]"
                  let motifs: string[] = []
                  let counts: number[] = []
                  
                  try {
                    // Remove quotes and parse as JSON array
                    const cleanMotifStr = motifStr.replace(/'/g, '"')
                    motifs = JSON.parse(cleanMotifStr)
                    counts = JSON.parse(countStr)
                  } catch (parseErr) {
                    return
                  }
                  
                  // Create individual entries for each motif-count pair
                  if (motifs.length === counts.length && motifs.length > 0) {
                    motifs.forEach((motif, index) => {
                      const count = counts[index]
                      
                      if (!isNaN(gap_size) && !isNaN(size) && !isNaN(count) && motif && motif.trim()) {
                        cleanData.push({
                          gap_size,
                          size,
                          motif: motif.trim(),
                          count
                        })
                      }
                    })
                  }
                  
                } catch (err) {
                  console.warn('Error parsing row:', row, err)
                }
              })
              
              resolve(cleanData)
            },
            error: (err: any) => {
              console.error('Error parsing top10 CSV:', err)
              resolve([])
            }
          })
        })

        const parseAggregated = new Promise<AggregatedData[]>((resolve) => {
          Papa.parse(aggregatedText, {
            header: true,
            worker: false,
            delimiter: '',  // Auto-detect delimiter
            skipEmptyLines: true,
            complete: (results: any) => {
              // The aggregated file has format: size,0,1,2,3,4,5,...,20
              // Where size is the window size and 0-20 are gap_sizes
              const cleanData: AggregatedData[] = []
              
              if (results.data.length > 0) {
                const headers = results.meta?.fields || Object.keys(results.data[0])
                
                // Extract gap_size columns (all numeric columns except 'size')
                const gapSizeColumns = headers.filter((header: string) => 
                  header !== 'size' && !isNaN(parseInt(header))
                ).map((header: string) => parseInt(header))
                
                results.data.forEach((row: any) => {
                  if (row.size && !isNaN(parseInt(row.size))) {
                    const size = parseInt(row.size)
                    const gap_counts: { [gap_size: number]: number } = {}
                    
                    gapSizeColumns.forEach((gapSize: number) => {
                      const count = parseInt(row[gapSize.toString()]) || 0
                      gap_counts[gapSize] = count
                    })
                    
                    cleanData.push({
                      size: size,
                      gap_counts: gap_counts
                    })
                  }
                })
              }
              
              resolve(cleanData)
            },
            error: (err: any) => {
              console.error('Error parsing aggregated CSV:', err)
              resolve([])
            }
          })
        })

        const [top10Data, aggregatedData] = await Promise.all([parseTop10, parseAggregated])

        if (aggregatedData.length === 0) {
          throw new Error('No valid data found in aggregated file')
        }

        if (top10Data.length === 0) {
          throw new Error('No valid data found in top10 file')
        }

        setIsPercentageMode(true) // Switch to percentage mode

        // Create maps for quick lookup - now using the new format
        const aggregatedMap = new Map<string, number>()
        aggregatedData.forEach(item => {
          // For each size, create entries for all gap_sizes
          Object.keys(item.gap_counts).forEach(gapSizeStr => {
            const gapSize = parseInt(gapSizeStr)
            const key = `${gapSize}_${item.size}`
            aggregatedMap.set(key, item.gap_counts[gapSize])
          })
        })

        // Get unique gap_sizes and sizes for axes
        const uniqueGapSizes = [...new Set(top10Data.map(item => item.gap_size))].sort((a, b) => a - b)
        const uniqueSizes = [...new Set(top10Data.map(item => item.size))].sort((a, b) => a - b)

        // Create percentage matrix
        const percentageMatrix: number[][] = []
        const hoverMatrix: string[][] = []
        const highlightMatrix: boolean[][] = [] // Nueva matriz para marcar celdas destacadas

        uniqueGapSizes.forEach(gapSize => {
          const row: number[] = []
          const hoverRow: string[] = []
          const highlightRow: boolean[] = [] // Nueva fila para highlights
          
          uniqueSizes.forEach(size => {
            const key = `${gapSize}_${size}`
            // Get ALL motifs for this gap_size and size combination
            const allMotifsForCell = top10Data.filter(item => item.gap_size === gapSize && item.size === size)
            const aggregatedCount = aggregatedMap.get(key)

            let topPercentage = 0
            let shouldHighlight = false
            let hoverText = `Gap Size: ${gapSize}<br>Size: ${size}<br>`

            if (allMotifsForCell.length > 0 && aggregatedCount && aggregatedCount > 0) {
              hoverText += `Total observed: ${aggregatedCount}<br><br>`
              
              // Sort motifs by count (descending) to show most frequent first
              const sortedMotifs = allMotifsForCell.sort((a, b) => b.count - a.count)
              
              // Calculate percentage for top motif (this will be the heatmap value)
              topPercentage = (sortedMotifs[0].count / aggregatedCount) * 100
              
              // Evaluar condiciones para highlight SOLO del primer motivo:
              const firstMotif = sortedMotifs[0]
              const firstMotifCount = firstMotif.count
              const firstMotifPercentage = topPercentage // Es el mismo valor
              
              // Condiciones: count > 10 Y percentage > 20%
              const countCondition = firstMotifCount > 10
              const percentageCondition = firstMotifPercentage > 20
              shouldHighlight = countCondition && percentageCondition
              
              hoverText += `All motifs (${sortedMotifs.length}):<br>`
              sortedMotifs.forEach((motif, index) => {
                const percentage = (motif.count / aggregatedCount) * 100
                hoverText += `${index + 1}. ${motif.motif}: ${motif.count} (${percentage.toFixed(2)}%)<br>`
              })
              
              hoverText += `<br>Heatmap value: ${topPercentage.toFixed(2)}% (top motif)`
              
              // Agregar información sobre highlight en el hover
              if (shouldHighlight) {
                hoverText += `<br><br>🔷 <strong>Highlighted Cell</strong><br>`
                hoverText += `First motif '${sortedMotifs[0].motif}': ${sortedMotifs[0].count} counts (${topPercentage.toFixed(2)}%)<br>`
                hoverText += `Conditions met: count > 10 AND percentage > 20%`
              }
            } else {
              hoverText += `No data available`
            }

            row.push(topPercentage)
            hoverRow.push(hoverText)
            highlightRow.push(shouldHighlight)
          })
          
          percentageMatrix.push(row)
          hoverMatrix.push(hoverRow)
          highlightMatrix.push(highlightRow)
        })

        setData(percentageMatrix)
        setXLabels(uniqueSizes.map(s => s.toString()))
        setYLabels(uniqueGapSizes.map(g => g.toString()))
        setTextMatrix(hoverMatrix)
        setHighlightMatrix(highlightMatrix) // Guardar la matriz de highlights
        setLoading(false)

      } catch (err) {
        console.error('Error fetching percentual heatmap data:', err)
        setError(err instanceof Error ? err.message : 'Unknown error loading percentual heatmap data')
        setLoading(false)
      }
    }

    fetchData()
  }, [id, idReplicon, part])

  if (!id || !idReplicon) return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p>Selecciona un elemento del ACP o de la tabla</p>
      <p>Archivos esperados: {'{id}/analysis/{idReplicon}_{part}_obs_top10_per_gap_size.csv, {id}/analysis/{idReplicon}_{part}_result_obs_aggregated.csv'}</p>
    </div>
  )

  if (loading) return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h3>Loading percentual heatmap...</h3>
      {id && idReplicon && (
        <p>Loading percentual data for {name || id} ({part} analysis)</p>
      )}
    </div>
  )

  if (error) return (
    <div style={{
      backgroundColor: '#4a1a1a',
      border: '1px solid #cc4444',
      borderRadius: '8px',
      padding: '16px',
      margin: '16px',
      color: '#ffffff'
    }}>
      <h3 style={{ color: '#ff6b6b', margin: '0 0 10px 0' }}>⚠️ Percentual Heatmap Data Not Found</h3>
      <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>
        {error}
      </p>
      {id && idReplicon && (
        <div style={{ 
          fontSize: '0.8rem', 
          color: '#999',
          marginTop: '10px',
          padding: '10px',
          backgroundColor: '#2a2a2a',
          borderRadius: '4px'
        }}>
          <strong>Organism:</strong> {name || id}<br/>
          <strong>Replicon:</strong> {idReplicon}<br/>
          <strong>Analysis:</strong> {part}<br/>
          <strong>Expected files:</strong> {id}/analysis/{idReplicon}_{part}_obs_top10_per_gap_size.csv, {id}/analysis/{idReplicon}_{part}_result_obs_aggregated.csv
        </div>
      )}
      <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '10px' }}>
        💡 <strong>Tip:</strong> This plot shows the percentage of top motif counts relative to total observed counts.
      </div>
    </div>
  )

  if (data.length === 0) return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p>No hay datos disponibles para el heatmap percentual</p>
      <p>Gap sizes: {yLabels.join(', ')}</p>
      <p>Sizes: {xLabels.join(', ')}</p>
    </div>
  )

  // Crear las coordenadas de los rectángulos azules para celdas destacadas
  const highlightShapes: any[] = []
  if (highlightMatrix.length > 0 && yLabels.length > 0 && xLabels.length > 0) {
    
    // Crear mapas para convertir valores reales a posiciones en el heatmap
    const gapSizeToYIndex = new Map<number, number>()
    const sizeToXIndex = new Map<number, number>()
    
    yLabels.forEach((label, index) => {
      gapSizeToYIndex.set(parseInt(label), index)
    })
    
    xLabels.forEach((label, index) => {
      sizeToXIndex.set(parseInt(label), index)
    })
    
    for (let yIndex = 0; yIndex < highlightMatrix.length; yIndex++) {
      for (let xIndex = 0; xIndex < highlightMatrix[yIndex].length; xIndex++) {
        if (highlightMatrix[yIndex][xIndex]) {
          // Crear un rectángulo azul para esta celda
          // Ajustar coordenadas X sumando 3 porque size empieza en 3
          highlightShapes.push({
            type: 'rect' as const,
            x0: (xIndex + 3) - 0.4,     // xIndex + 3 para ajustar al valor real de size
            x1: (xIndex + 3) + 0.4,     
            y0: yIndex - 0.4,           // yIndex ya es correcto para gap_size
            y1: yIndex + 0.4,     
            line: {
              color: 'blue',
              width: 3
            },
            fillcolor: 'rgba(0, 0, 255, 0.1)', // Azul transparente
            layer: 'above' as const
          })
        }
      }
    }
  }

  return (
    <Plot
      data={[
        {
          z: data,
          x: xLabels,
          y: yLabels,
          type: 'heatmap' as const,
          colorscale: isPercentageMode ? [
            [0, 'rgb(255, 255, 255)'],      // 0% - blanco
            [0.25, 'rgb(255, 255, 0)'],     // 25% - amarillo
            [0.5, 'rgb(255, 165, 0)'],      // 50% - naranja
            [0.75, 'rgb(255, 0, 0)'],       // 75% - rojo
            [1, 'rgb(139, 0, 0)']           // 100% - rojo oscuro
          ] : [
            [0, 'rgb(255, 255, 255)'],      // 0 counts - blanco
            [0.33, 'rgb(173, 216, 230)'],   // low counts - azul claro
            [0.66, 'rgb(65, 105, 225)'],    // medium counts - azul
            [1, 'rgb(25, 25, 112)']         // high counts - azul oscuro
          ],
          showscale: true,
          text: textMatrix as any,
          hoverinfo: 'text' as const,
          zmin: isPercentageMode ? 0 : Math.min(...data.flat()),
          zmax: isPercentageMode ? 100 : Math.max(...data.flat()),
          colorbar: {
            title: { 
              text: isPercentageMode ? 'Percentage (%)' : 'Count',
              font: { size: 12 }
            },
            tickfont: { size: 10 },
            len: 0.9,
            ...(isPercentageMode ? {
              tickvals: [0, 25, 50, 75, 100],
              ticktext: ['0%', '25%', '50%', '75%', '100%']
            } : {})
          }
        }
      ]}
      layout={{
        title: { 
          text: `${isPercentageMode ? 'Motif Percentage' : 'Motif Counts'} - ${name || idReplicon} ${idReplicon && name ? `(${idReplicon})` : ''}`,
          font: { size: 14 }
        },
        autosize: true,
        margin: { l: 60, r: 100, t: 50, b: 60 },
        xaxis: {
          title: { text: 'Size' },
          tickfont: { size: 10 },
          side: 'bottom'
        },
        yaxis: {
          title: { text: 'Gap Size' },
          tickfont: { size: 10 }
        },
        hoverlabel: {
          bgcolor: 'white',
          font: { size: 11 },
          bordercolor: 'black'
        },
        shapes: highlightShapes // Agregar los rectángulos azules
      }}
      style={{ width: '100%', height: '100%' }}
      useResizeHandler={true}
      config={{ 
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d']
      }}
    />
  )
}

export default PercentualHeatmap
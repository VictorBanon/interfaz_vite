import React, { useState, useEffect } from 'react'
import Plot from 'react-plotly.js'
import Papa from 'papaparse'

interface VectorComparisonProps {
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

const VectorComparisonPlot: React.FC<VectorComparisonProps> = ({ id, idReplicon, name, part }) => {
  const [gapArmVector, setGapArmVector] = useState<number[]>([])
  const [percentualVector, setPercentualVector] = useState<number[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [hoverTexts, setHoverTexts] = useState<string[]>([])

  useEffect(() => {
    if (!id || !idReplicon) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // Load Gap/Arm heatmap data
        const gapArmFilePath = `/data/${id}/analysis/${idReplicon}_hc_${part}.csv`
        
        // Load Percentual heatmap data
        const top10FilePath = `/data/${id}/analysis/${idReplicon}_${part}_obs_top10_per_gap_size.csv`
        const aggregatedFilePath = `/data/${id}/analysis/${idReplicon}_${part}_result_obs_aggregated.csv`
        
        console.log('Loading vector comparison data from:', { gapArmFilePath, top10FilePath, aggregatedFilePath })
        
        const [gapArmResponse, top10Response, aggregatedResponse] = await Promise.all([
          fetch(gapArmFilePath),
          fetch(top10FilePath),
          fetch(aggregatedFilePath)
        ])

        if (!gapArmResponse.ok || !top10Response.ok || !aggregatedResponse.ok) {
          throw new Error(`Failed to load data files. Gap/Arm: ${gapArmResponse.status}, Top10: ${top10Response.status}, Aggregated: ${aggregatedResponse.status}`)
        }

        const gapArmText = await gapArmResponse.text()
        const top10Text = await top10Response.text()
        const aggregatedText = await aggregatedResponse.text()

        // Check if responses are HTML (file not found)
        if (gapArmText.trim().startsWith('<!DOCTYPE html>') || 
            top10Text.trim().startsWith('<!DOCTYPE html>') || 
            aggregatedText.trim().startsWith('<!DOCTYPE html>')) {
          throw new Error('One or more data files not found')
        }

        // Process Gap/Arm heatmap data
        const gapArmVector = await new Promise<number[]>((resolve) => {
          Papa.parse(gapArmText, {
            header: false,
            worker: false,
            complete: (results: any) => {
              const rawData = results.data.filter((row: any[]) => row.length > 1)
              if (rawData[rawData.length - 1].length === 0) {
                rawData.pop()
              }

              // Extract numeric data matrix (skip headers)
              const dataMatrix = rawData.slice(1).map((row: any[]) =>
                row.slice(1).map((value: any) => parseFloat(value) || 0)
              )

              // Transpose the matrix to match the original structure
              const transposed = dataMatrix[0].map((_: any, colIndex: number) =>
                dataMatrix.map((row: any) => row[colIndex])
              )

              // Convert to log10 values like in the original component
              const logMatrix = transposed.map((row: any) =>
                row.map((value: any) => value > 0 ? Math.log10(value) : -1)
              )

              // Flatten matrix to create vector
              const vector = logMatrix.flat()
              resolve(vector)
            },
            error: () => resolve([])
          })
        })

        // Process Percentual heatmap data
        const parseTop10 = new Promise<Top10Data[]>((resolve) => {
          Papa.parse(top10Text, {
            header: true,
            worker: false,
            complete: (results: any) => {
              const cleanData: Top10Data[] = []
              
              results.data.forEach((row: any) => {
                try {
                  const gap_size = parseInt(row.gap_size || row['gap_size'] || row['Gap Size'] || '0')
                  const size = parseInt(row.size || row['Size'] || '0')
                  
                  const motifStr = row.motif || row['Motif'] || row['motif_sequence'] || ''
                  const countStr = row.count || row['Count'] || row['observed_count'] || ''
                  
                  if (!motifStr || !countStr || motifStr.trim() === '' || countStr.trim() === '') {
                    return
                  }
                  
                  let motifs: string[] = []
                  let counts: number[] = []
                  
                  try {
                    const cleanMotifStr = motifStr.replace(/'/g, '"')
                    motifs = JSON.parse(cleanMotifStr)
                    counts = JSON.parse(countStr)
                  } catch (parseErr) {
                    return
                  }
                  
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
            error: () => resolve([])
          })
        })

        const parseAggregated = new Promise<AggregatedData[]>((resolve) => {
          Papa.parse(aggregatedText, {
            header: true,
            worker: false,
            skipEmptyLines: true,
            complete: (results: any) => {
              const cleanData: AggregatedData[] = []
              
              if (results.data.length > 0) {
                const headers = results.meta?.fields || Object.keys(results.data[0])
                
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
            error: () => resolve([])
          })
        })

        const [top10Data, aggregatedData] = await Promise.all([parseTop10, parseAggregated])

        if (aggregatedData.length === 0 || top10Data.length === 0) {
          throw new Error('No valid percentual heatmap data found')
        }

        // Create aggregated map
        const aggregatedMap = new Map<string, number>()
        aggregatedData.forEach(item => {
          Object.keys(item.gap_counts).forEach(gapSizeStr => {
            const gapSize = parseInt(gapSizeStr)
            const key = `${gapSize}_${item.size}`
            aggregatedMap.set(key, item.gap_counts[gapSize])
          })
        })

        // Filter data to only include first 18 columns (values 3-20) and first 21 rows (values 0-20)
        const filteredGapSizes = Array.from({ length: 21 }, (_, i) => i) // 0 to 20
        const filteredSizes = Array.from({ length: 18 }, (_, i) => i + 3) // 3 to 20

        // Create percentage matrix with filtering
        const percentageMatrix: number[][] = []

        filteredGapSizes.forEach(gapSize => {
          const row: number[] = []
          
          filteredSizes.forEach(size => {
            const key = `${gapSize}_${size}`
            const allMotifsForCell = top10Data.filter(item => item.gap_size === gapSize && item.size === size)
            const aggregatedCount = aggregatedMap.get(key)

            let topPercentage = 0

            if (allMotifsForCell.length > 0 && aggregatedCount && aggregatedCount > 0) {
              const sortedMotifs = allMotifsForCell.sort((a, b) => b.count - a.count)
              topPercentage = (sortedMotifs[0].count / aggregatedCount) * 100
            }

            row.push(topPercentage)
          })
          
          percentageMatrix.push(row)
        })

        // Flatten percentage matrix to create vector
        const percentualVector = percentageMatrix.flat()

        // Create hover texts for each point
        const hoverTexts = gapArmVector.map((gapArmValue, index) => {
          const percentualValue = percentualVector[index] || 0
          const rowIndex = Math.floor(index / filteredSizes.length)
          const colIndex = index % filteredSizes.length
          const gapSize = filteredGapSizes[rowIndex]
          const size = filteredSizes[colIndex]
          
          return `Gap Size: ${gapSize}<br>Size: ${size}<br>Gap/Arm Value: ${gapArmValue.toFixed(3)}<br>Percentual Value: ${percentualValue.toFixed(2)}%`
        })

        // Ensure both vectors have the same length
        const minLength = Math.min(gapArmVector.length, percentualVector.length)
        setGapArmVector(gapArmVector.slice(0, minLength))
        setPercentualVector(percentualVector.slice(0, minLength))
        setHoverTexts(hoverTexts.slice(0, minLength))
        setLoading(false)

      } catch (err) {
        console.error('Error fetching vector comparison data:', err)
        setError(err instanceof Error ? err.message : 'Unknown error loading vector comparison data')
        setLoading(false)
      }
    }

    fetchData()
  }, [id, idReplicon, part])

  if (!id || !idReplicon) return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p>Selecciona un elemento del ACP o de la tabla</p>
      <p>Expected files: gap/arm heatmap CSV and percentual heatmap data</p>
    </div>
  )

  if (loading) return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h3>Loading vector comparison...</h3>
      {id && idReplicon && (
        <p>Processing heatmap data for {name || id} ({part} analysis)</p>
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
      <h3 style={{ color: '#ff6b6b', margin: '0 0 10px 0' }}>⚠️ Vector Comparison Data Not Found</h3>
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
          <strong>Required files:</strong> Gap/Arm heatmap and Percentual heatmap data
        </div>
      )}
      <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '10px' }}>
        💡 <strong>Tip:</strong> This plot compares flattened gap/arm heatmap with percentual heatmap vectors.
      </div>
    </div>
  )

  if (gapArmVector.length === 0 || percentualVector.length === 0) return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p>No data available for vector comparison</p>
      <p>Gap/Arm vector length: {gapArmVector.length}</p>
      <p>Percentual vector length: {percentualVector.length}</p>
    </div>
  )

  // Calculate correlation coefficient
  const calculateCorrelation = (x: number[], y: number[]): number => {
    const n = x.length
    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = y.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0)
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0)
    
    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY))
    
    return denominator === 0 ? 0 : numerator / denominator
  }

  const correlation = calculateCorrelation(gapArmVector, percentualVector)

  const openInPopup = () => {
    const popup = window.open('', '_blank', 'width=1000,height=700,scrollbars=yes,resizable=yes')
    
    if (popup) {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${name || idReplicon || 'Vector Comparison'} - Gap/Arm vs Percentual</title>
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
            .stats {
              text-align: center;
              margin-bottom: 10px;
              font-size: 14px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>${name || idReplicon || 'Vector Comparison'} ${idReplicon && name ? `(${idReplicon})` : ''}</h2>
              <p>Gap/Arm vs Percentual Heatmap Vector Comparison - ${part.toUpperCase()}</p>
              <div class="stats">
                <strong>Correlation coefficient: ${correlation.toFixed(4)}</strong> | 
                Data points: ${gapArmVector.length} | 
                Percentual range: 0-20 (gap) × 3-20 (size)
              </div>
            </div>
            <div id="plot" class="plot-container"></div>
          </div>
          <script>
            const plotData = [{
              x: ${JSON.stringify(gapArmVector)},
              y: ${JSON.stringify(percentualVector)},
              mode: 'markers',
              type: 'scatter',
              marker: {
                size: 6,
                color: ${JSON.stringify(percentualVector)},
                colorscale: 'Viridis',
                colorbar: {
                  title: 'Percentual Value (%)',
                  titleside: 'right'
                },
                opacity: 0.7
              },
              text: ${JSON.stringify(hoverTexts)},
              hoverinfo: 'text',
              name: 'Vector Comparison'
            }];
            
            const layout = {
              title: { 
                text: 'Gap/Arm vs Percentual Vector Comparison',
                font: { size: 18 }
              },
              autosize: true,
              margin: { l: 80, r: 120, t: 80, b: 80 },
              xaxis: {
                title: { 
                  text: 'Gap/Arm Heatmap Values (log10)',
                  font: { size: 16 }
                },
                tickfont: { size: 14 }
              },
              yaxis: {
                title: { 
                  text: 'Percentual Heatmap Values (%)',
                  font: { size: 16 }
                },
                tickfont: { size: 14 }
              },
              hoverlabel: {
                bgcolor: 'white',
                font: { size: 12 }
              },
              annotations: [{
                x: 0.02,
                y: 0.98,
                xref: 'paper',
                yref: 'paper',
                text: 'R = ${correlation.toFixed(4)}',
                showarrow: false,
                font: { size: 14, color: 'red' },
                bgcolor: 'rgba(255,255,255,0.8)',
                bordercolor: 'red',
                borderwidth: 1
              }]
            };
            
            const config = {
              responsive: true,
              displayModeBar: true,
              displaylogo: false,
              toImageButtonOptions: {
                format: 'png',
                filename: '${name || idReplicon || 'vector_comparison'}_${part}',
                height: 600,
                width: 800,
                scale: 2
              }
            };
            
            Plotly.newPlot('plot', plotData, layout, config);
            
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
          onClick={openInPopup}
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
          title="Open plot in new window"
        >
          🔗 Open in Popup
        </button>
      </div>
      <Plot
        data={[
          {
            x: gapArmVector,
            y: percentualVector,
            mode: 'markers' as const,
            type: 'scatter' as const,
            marker: {
              size: 5,
              color: percentualVector,
              colorscale: 'Viridis' as const,
              colorbar: {
                title: { text: 'Percentual (%)' },
                tickfont: { size: 10 },
                len: 0.8
              },
              opacity: 0.7
            },
            text: hoverTexts as any,
            hoverinfo: 'text' as const,
            name: 'Vector Comparison'
          }
        ]}
        layout={{
          title: { 
            text: `Vector Comparison - ${name || idReplicon} (R=${correlation.toFixed(3)})`,
            font: { size: 14 }
          },
          autosize: true,
          margin: { l: 60, r: 100, t: 50, b: 60 },
          xaxis: {
            title: { 
              text: 'Gap/Arm (log10)',
              font: { size: 12 }
            },
            tickfont: { size: 10 }
          },
          yaxis: {
            title: { 
              text: 'Percentual (%)',
              font: { size: 12 }
            },
            tickfont: { size: 10 }
          },
          hoverlabel: {
            bgcolor: 'white',
            font: { size: 11 }
          },
          annotations: [{
            x: 0.02,
            y: 0.98,
            xref: 'paper' as const,
            yref: 'paper' as const,
            text: `R = ${correlation.toFixed(4)}`,
            showarrow: false,
            font: { size: 12, color: 'red' },
            bgcolor: 'rgba(255,255,255,0.8)',
            bordercolor: 'red',
            borderwidth: 1
          }]
        }}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler={true}
        config={{ 
          responsive: true,
          displayModeBar: true,
          displaylogo: false
        }}
      />
    </div>
  )
}

export default VectorComparisonPlot
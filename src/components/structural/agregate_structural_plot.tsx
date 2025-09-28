import React, { useState, useEffect } from 'react'
import Plot from 'react-plotly.js'
import Papa from 'papaparse'
import { buildACPFilePath } from '../../utils/taxonomyUtils'
 

interface AggregateProps {
  aggregate: string
  pcX: number
  pcY: number
  id?: string
  idReplicon?: string
  taxon?: string
  taxonValue?: string
  part?: string
}

const AggregateStructural: React.FC<AggregateProps> = ({ 
  aggregate, 
  pcX, 
  pcY,
  taxon,
  taxonValue, 
  part
}) => { 

  const [csvData, setCsvData] = useState<{ pcX: any; pcY: any; minMaxData?: any; meanMedianData?: any }>({ pcX: [], pcY: [] })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchCsvData = async (filePath: string): Promise<any> => {
      return new Promise((resolve, reject) => {
        Papa.parse(filePath, {
          download: true,
          dynamicTyping: true, // let PapaParse turn numeric strings into numbers
          complete: (result: any) => {
            const data = result.data as (string | number)[][]
        
            // Transpose the data
            const transposedData = data[0].map((_, colIndex: number) => data.map(row => row[colIndex]))
        
            const filtered = transposedData.filter(row => row.length > 1)
        
            // header row → x labels
            const header = filtered[0] as string[]
            const xLabels = header.slice(1)
        
            // rows → y labels and z matrix
            const yLabels = filtered.slice(1).map(row => String(row[0]))
            const zMatrix = filtered.slice(1).map(row =>
              row.slice(1).map(value => Number(value))
            )
            const sizeLabels = xLabels
            const positionLabels = yLabels
            const textMatrix = zMatrix.map((row, i) =>
              row.map((value, j) => {
              const logValue = Math.log10(Math.abs(value) + 1)
              return `Size: ${sizeLabels[j]}<br>` +
                  `Position: ${positionLabels[i]}<br>` +
                  `Value: ${value.toFixed(3)}<br>` +
                  `Log10: ${logValue.toFixed(2)}`
              })
            )
            console.log('Parsed CSV Data:', { xLabels, yLabels, zMatrix, textMatrix })

            resolve({ z: zMatrix, x: xLabels, y: yLabels, text: textMatrix }) 
          },
          error: (error: any) => reject(error)
        })
      })
    }

    const fetchMinMaxData = async (filePath: string): Promise<any> => {
      return new Promise((resolve, reject) => {
        Papa.parse(filePath, {
          download: true,
          header: true,
          dynamicTyping: true,
          complete: (result: any) => {
            const data = result.data as any[]
            console.log('Min-Max Data parsed:', data)
            
            // Crear mapas para organizar los datos por arm y gap
            const minData = new Map<string, number>()
            const maxData = new Map<string, number>()
            
            // Determinar si el archivo tiene columna frequency
            const hasFrequencyColumn = data.length > 0 && 'frequency' in data[0]
            console.log('Has frequency column:', hasFrequencyColumn)
            
            // Si no hay columna frequency, calcular el total para calcular frecuencias
            let totalCount = 0
            if (!hasFrequencyColumn) {
              totalCount = data.reduce((sum, row) => sum + (parseInt(row.count) || 0), 0)
              console.log('Total count for frequency calculation:', totalCount)
            }
            
            // Procesar cada fila del CSV
            data.forEach((row: any) => {
              const arm = parseInt(row.arm)
              const gap = parseInt(row.gap)
              const count = parseInt(row.count) || 0
              const minMax = row.min_max
              
              // Calcular frequency basada en si la columna existe o no
              let frequency: number
              if (hasFrequencyColumn && row.frequency !== undefined) {
                frequency = parseFloat(row.frequency) || 0
              } else {
                // Calcular frequency como count/total si no existe la columna
                frequency = totalCount > 0 ? count / totalCount : 0
              }
              
              const key = `${arm},${gap}`
              
              if (minMax === 'min') {
                minData.set(key, frequency)
              } else if (minMax === 'max') {
                maxData.set(key, frequency)
              }
            })
            
            // Forzar rangos específicos para consistencia en la visualización
            const minArm = 3   // Fijo: empezar desde arm = 3
            const maxArm = 20  // Fijo: hasta arm = 20
            const minGap = 0   // Fijo: empezar desde gap = 0
            const maxGap = 20  // Fijo: hasta gap = 20
            
            console.log('Fixed ranges used:', { minArm, maxArm, minGap, maxGap })
            
            // Función para crear matriz
            const createMatrix = (dataMap: Map<string, number>) => {
              const matrix: number[][] = []
              const xLabels: string[] = []
              const yLabels: string[] = []
              
              // Crear etiquetas Y (gap values de minGap a maxGap)
              for (let gap = minGap; gap <= maxGap; gap++) {
                yLabels.push(String(gap))
              }
              
              // Crear etiquetas X (arm values de minArm a maxArm) 
              for (let armValue = minArm; armValue <= maxArm; armValue++) {
                xLabels.push(String(armValue))
              }
              
              // Crear matriz con dimensiones correctas
              for (let i = 0; i <= maxGap - minGap; i++) {
                matrix[i] = new Array(maxArm - minArm + 1).fill(0)
              }
              
              // Llenar matriz con datos
              dataMap.forEach((frequency, key) => {
                const [armStr, gapStr] = key.split(',')
                const armValue = parseInt(armStr)
                const gap = parseInt(gapStr)
                
                // Verificar que los valores estén dentro de los rangos fijos
                if (armValue >= minArm && armValue <= maxArm && gap >= minGap && gap <= maxGap) {
                  const armIndex = armValue - minArm  // Ajustar índice basado en minArm
                  const gapIndex = gap - minGap
                  
                  if (gapIndex >= 0 && gapIndex < matrix.length && 
                      armIndex >= 0 && armIndex < matrix[0].length) {
                    matrix[gapIndex][armIndex] = frequency
                  }
                }
              })
              
              // Crear texto para hover
              const textMatrix = matrix.map((row, i) =>
                row.map((value, j) =>
                  `Gap: ${i + minGap}<br>Arm: ${j + minArm}<br>Frequency: ${value.toFixed(3)}`
                )
              )
              
              return { z: matrix, x: xLabels, y: yLabels, text: textMatrix }
            }
            
            const minResult = createMatrix(minData)
            const maxResult = createMatrix(maxData)
            
            resolve({
              min: minResult,
              max: maxResult
            })
          },
          error: (error: any) => reject(error)
        })
      })
    }

    const fetchMeanMedianData = async (meanFilePath: string, medianFilePath: string): Promise<any> => {
      const processCsvFile = async (filePath: string): Promise<any> => {
        return new Promise((resolve, reject) => {
          Papa.parse(filePath, {
            download: true,
            dynamicTyping: true,
            complete: (result: any) => {
              const data = result.data as (string | number)[][]
              
              // Procesar igual que en structural_plot.tsx
              // Filtrar filas vacías y la última si está vacía
              const cleanData = data.filter(row => row.length > 1)
              if (cleanData[cleanData.length - 1].length === 0) {
                cleanData.pop()
              }
              
              // Extraer etiquetas directamente
              const sizeLabels = cleanData.slice(1).map(row => row[0])
              const positionLabels = cleanData[0].slice(1)
              
              // Crear matriz de datos numéricos
              const dataMatrix = cleanData.slice(1).map(row =>
                row.slice(1).map(value => Number(value) || 0)
              )
              
              // Transponer la matriz
              const transposed = dataMatrix[0].map((_, colIndex) =>
                dataMatrix.map(row => row[colIndex])
              )
              
              // Crear matriz logarítmica
              const logMatrix = transposed.map(row =>
                row.map(value => value > 0 ? Math.log10(value) : -1)
              )
              
              // Crear matriz de texto para hover
              const textMatrix = transposed.map((row, i) =>
                row.map((value, j) => {
                  const logValue = value > 0 ? Math.log10(value) : -1
                  return `Size: ${sizeLabels[j]}<br>Position: ${positionLabels[i]}<br>Value: ${value.toFixed(3)}<br>Log10: ${logValue.toFixed(2)}`
                })
              )
              
              resolve({ z: logMatrix, x: sizeLabels, y: positionLabels, text: textMatrix })
            },
            error: (error: any) => reject(error)
          })
        })
      }
      
      try {
        const [meanResult, medianResult] = await Promise.all([
          processCsvFile(meanFilePath),
          processCsvFile(medianFilePath)
        ])
        
        return {
          mean: meanResult,
          median: medianResult
        }
      } catch (error) {
        throw error
      }
    } 

    const loadCsvData = async () => {
      try {
        setLoading(true)
        console.log('Loading CSV data for aggregate type:', aggregate, { taxon, taxonValue, part })
        
        if (aggregate === "Min-Max") {
          try {
            // Validar parámetros antes de construir ruta dinámica
            if (taxon && taxonValue && part) {
              const dynamicPath = await buildACPFilePath(taxon, taxonValue, part, 'min_max', pcX, pcY)
              console.log('Dynamic Min-Max path built:', dynamicPath)
              console.log('Min-Max parameters used:', { taxon, taxonValue, part })
              const minMaxData = await fetchMinMaxData(dynamicPath)
              console.log('Min-Max data loaded from dynamic path:', minMaxData)
              setCsvData({ 
                pcX: [], 
                pcY: [], 
                minMaxData: minMaxData,
                meanMedianData: undefined
              })
            } else {
              console.log('Missing parameters for Min-Max dynamic path:', { taxon, taxonValue, part })
              throw new Error('Missing required parameters for dynamic path')
            }
          } catch (error) {
            // Fallback a ruta estática
            console.log('Dynamic path failed, using fallback for Min-Max:', error)
            const fallbackPath = `/data/philogenie/Bacteria/hc_Bacteria_${part || 'all'}_min_max.csv`
            console.log('Loading Min-Max from fallback:', fallbackPath)
            const minMaxData = await fetchMinMaxData(fallbackPath)
            setCsvData({ 
              pcX: [], 
              pcY: [], 
              minMaxData: minMaxData,
              meanMedianData: undefined
            })
          }
        } else if (aggregate === "Mean-Median") {
          try {
            // Validar parámetros antes de construir rutas dinámicas
            if (taxon && taxonValue && part) {
              const dynamicMeanPath = await buildACPFilePath(taxon, taxonValue, part, 'mean', pcX, pcY)
              const dynamicMedianPath = await buildACPFilePath(taxon, taxonValue, part, 'median', pcX, pcY)
              console.log('Dynamic Mean-Median paths:', { dynamicMeanPath, dynamicMedianPath })
              const meanMedianData = await fetchMeanMedianData(dynamicMeanPath, dynamicMedianPath)
              console.log('Mean-Median data loaded from dynamic paths:', meanMedianData)
              setCsvData({ 
                pcX: [], 
                pcY: [], 
                meanMedianData: meanMedianData,
                minMaxData: undefined
              })
            } else {
              throw new Error('Missing required parameters for dynamic path')
            }
          } catch (error) {
            // Fallback a rutas estáticas
            console.log('Dynamic paths failed, using fallback for Mean-Median:', error)
            const fallbackMeanPath = `/data/philogenie/Bacteria/hc_Bacteria_${part || 'all'}_mean.csv`
            const fallbackMedianPath = `/data/philogenie/Bacteria/hc_Bacteria_${part || 'all'}_median.csv`
            console.log('Loading Mean-Median from fallback:', { fallbackMeanPath, fallbackMedianPath })
            const meanMedianData = await fetchMeanMedianData(fallbackMeanPath, fallbackMedianPath)
            setCsvData({ 
              pcX: [], 
              pcY: [], 
              meanMedianData: meanMedianData,
              minMaxData: undefined
            })
          }
        } else {
          try {
            // Para PC analysis - usar rutas dinámicas
            if (taxon && taxonValue && part) {
              const dynamicPcXPath = await buildACPFilePath(taxon, taxonValue, part, 'PC', pcX, pcY)
              const dynamicPcYPath = await buildACPFilePath(taxon, taxonValue, part, 'PC', pcX, pcY)
              console.log('Dynamic PC paths:', { dynamicPcXPath, dynamicPcYPath })
              
              const [pcXData, pcYData] = await Promise.all([
                fetchCsvData(dynamicPcXPath.replace(`PC${pcY}`, `PC${pcX}`)),
                fetchCsvData(dynamicPcYPath.replace(`PC${pcX}`, `PC${pcY}`))
              ])
              setCsvData({ 
                pcX: pcXData, 
                pcY: pcYData,
                minMaxData: undefined,
                meanMedianData: undefined 
              })
            } else {
              throw new Error('Missing required parameters for dynamic path')
            }
          } catch (error) {
            // Fallback a rutas estáticas para PC
            console.log('Dynamic paths failed, using fallback for PC:', error)
            const fallbackPcXPath = `/data/philogenie/Bacteria/PC${pcX}_hc_${part || 'all'}_Bacteria.csv`
            const fallbackPcYPath = `/data/philogenie/Bacteria/PC${pcY}_hc_${part || 'all'}_Bacteria.csv`
            console.log('Loading PC data from fallback:', { fallbackPcXPath, fallbackPcYPath })
            
            const [pcXData, pcYData] = await Promise.all([
              fetchCsvData(fallbackPcXPath),
              fetchCsvData(fallbackPcYPath)
            ])
            setCsvData({ 
              pcX: pcXData, 
              pcY: pcYData,
              minMaxData: undefined,
              meanMedianData: undefined 
            })
          }
        }
      } catch (error) {
        console.error('Error loading CSV data:', error)
        setCsvData({ pcX: [], pcY: [] })
      } finally {
        setLoading(false)
      }
    }

    loadCsvData()
  }, [aggregate, pcX, pcY, taxon, taxonValue, part])

  console.log('CSV Data:', csvData)
  console.log('Current aggregate type:', aggregate)
  console.log('Loading state:', loading)
  console.log('MinMax data available:', !!csvData.minMaxData)
  
  if (aggregate === "Min-Max" && csvData.minMaxData) {
    console.log('MinMax data structure:', {
      hasMin: !!csvData.minMaxData.min,
      hasMax: !!csvData.minMaxData.max,
      minData: csvData.minMaxData.min ? Object.keys(csvData.minMaxData.min) : 'no min data',
      maxData: csvData.minMaxData.max ? Object.keys(csvData.minMaxData.max) : 'no max data'
    })
  }

  if (loading) {
    return <div>Cargando datos...</div>
  }

  const DataPlot = {
    pcX: csvData.pcX,
    pcY: csvData.pcY
  }
 

  if (aggregate === "PC") {
    if (!DataPlot.pcX || !DataPlot.pcY || !DataPlot.pcX.z || !DataPlot.pcY.z) {
      return <div>No hay datos PC disponibles</div>
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', height: '100%' }}>
        <div style={{ flex: 1 }}>
          <Plot
            data={[{
              z: DataPlot.pcX.z,
              x: DataPlot.pcX.x,
              y: DataPlot.pcX.y,
              type: 'heatmap',
              colorscale: [
                [0, 'rgb(0, 0, 255)'],
                [0.5, 'rgb(255, 255, 255)'],
                [1, 'rgb(255, 0, 0)']
              ],
              showscale: true,
              text: DataPlot.pcX.text,
              hoverinfo: 'text', 
              zmin: -1,
              zmax: 1,
            }]}
            layout={{
              title: `PC${pcX} Distribution`,
              autosize: true,
              margin: { l: 50, r: 50, t: 30, b: 30 },
              xaxis: {
                title: 'Size',
                titlefont: { size: 10 },
                tickfont: { size: 8 },
                side: 'bottom'
              },
              yaxis: {
                title: 'Position',
                titlefont: { size: 10 },
                tickfont: { size: 8 }
              },
              hoverlabel: {
                bgcolor: 'white',
                font: { size: 12 }
              } 
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
        <div style={{ flex: 1 }}>
          <Plot
            data={[{
              z: DataPlot.pcY.z,
              x: DataPlot.pcY.x,
              y: DataPlot.pcY.y,
              type: 'heatmap',
              colorscale: [
                [0, 'rgb(0, 0, 255)'],
                [0.5, 'rgb(255, 255, 255)'],
                [1, 'rgb(255, 0, 0)']
              ],
              showscale: true,
              text: DataPlot.pcY.text,
              hoverinfo: 'text',
              zmin: -1,
              zmax: 1, 
            }]}
            layout={{
              title: `PC${pcY} Distribution`, // Cambiar de pcX a pcY
              autosize: true,
              margin: { l: 50, r: 50, t: 30, b: 30 },
              xaxis: {
                title: 'Size',
                titlefont: { size: 10 },
                tickfont: { size: 8 },
                side: 'bottom'
              },
              yaxis: {
                title: 'Position',
                titlefont: { size: 10 },
                tickfont: { size: 8 }
              },
              hoverlabel: {
                bgcolor: 'white',
                font: { size: 12 }
              } 
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
      </div>
    )
  }

  // Para Min-Max
  if (aggregate === "Min-Max") {
    const minMaxData = csvData.minMaxData
    if (!minMaxData) {
      return <div>Cargando datos Min-Max...</div>
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', height: '100%' }}>
        <div style={{ flex: 1 }}>
          <Plot
            data={[{
              z: minMaxData.min.z,
              x: minMaxData.min.x,
              y: minMaxData.min.y,
              type: 'heatmap',
              colorscale: [
                [0, 'rgba(255, 255, 255, 1)'],
                [1, 'rgb(0, 0, 255)']
              ],
              showscale: true,
              text: minMaxData.min.text,
              hoverinfo: 'text',
              zmin: 0,
              zmax: 1,
            }]}
            layout={{
              title: 'Minimum Distribution',
              autosize: true,
              margin: { l: 50, r: 50, t: 30, b: 30 },
              xaxis: {
                title: 'Arm Length',
                titlefont: { size: 10 },
                tickfont: { size: 8 },
                side: 'bottom'
              },
              yaxis: {
                title: 'Gap Size',
                titlefont: { size: 10 },
                tickfont: { size: 8 }
              },
              hoverlabel: {
                bgcolor: 'white',
                font: { size: 12 }
              } 
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
        <div style={{ flex: 1 }}>
          <Plot
            data={[{
              z: minMaxData.max.z,
              x: minMaxData.max.x,
              y: minMaxData.max.y,
              type: 'heatmap',
              colorscale: [
                [0, 'hsla(0, 0%, 100%, 1.00)'],
                [1, 'rgb(255, 0, 0)']
              ],
              showscale: true,
              text: minMaxData.max.text,
              hoverinfo: 'text',
              zmin: 0,
              zmax: 1,
            }]}
            layout={{
              title: 'Maximum Distribution',
              autosize: true,
              margin: { l: 50, r: 50, t: 30, b: 30 },
              xaxis: {
                title: 'Arm Length',
                titlefont: { size: 10 },
                tickfont: { size: 8 },
                side: 'bottom'
              },
              yaxis: {
                title: 'Gap Size',
                titlefont: { size: 10 },
                tickfont: { size: 8 }
              },
              hoverlabel: {
                bgcolor: 'white',
                font: { size: 12 }
              } 
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
      </div>
    )
  }

  // Para Mean-Median
  if (aggregate === "Mean-Median") {
    const meanMedianData = csvData.meanMedianData
    if (!meanMedianData) {
      return <div>Cargando datos Mean-Median...</div>
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', height: '100%' }}>
        <div style={{ flex: 1 }}>
          <Plot
            data={[{
              z: meanMedianData.mean.z,
              x: meanMedianData.mean.x,
              y: meanMedianData.mean.y,
              type: 'heatmap',
              colorscale: [
                [0, 'rgb(0, 0, 255)'],
                [0.33, 'rgb(255, 255, 255)'],
                [0.66, 'rgb(255, 0, 0)'],
                [1, 'rgb(0, 0, 0)']
              ],
              showscale: true,
              text: meanMedianData.mean.text,
              hoverinfo: 'text',
              zmin: -1,
              zmax: 2,
              colorbar: {
                title: 'log10(value)',
                titlefont: { size: 10 },
                tickfont: { size: 8 },
                len: 0.9,
                tickvals: [-1, 0, 1, 2],
                ticktext: ['≤0.1', '1', '10', '≥100']
              }
            }]}
            layout={{
              title: 'Mean Distribution',
              autosize: true,
              margin: { l: 50, r: 80, t: 30, b: 50 },
              xaxis: {
                title: 'Size',
                titlefont: { size: 10 },
                tickfont: { size: 8 },
                side: 'bottom'
              },
              yaxis: {
                title: 'Position',
                titlefont: { size: 10 },
                tickfont: { size: 8 }
              },
              hoverlabel: {
                bgcolor: 'white',
                font: { size: 12 }
              } 
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
        <div style={{ flex: 1 }}>
          <Plot
            data={[{
              z: meanMedianData.median.z,
              x: meanMedianData.median.x,
              y: meanMedianData.median.y,
              type: 'heatmap',
              colorscale: [
                [0, 'rgb(0, 0, 255)'],
                [0.33, 'rgb(255, 255, 255)'],
                [0.66, 'rgb(255, 0, 0)'],
                [1, 'rgb(0, 0, 0)']
              ],
              showscale: true,
              text: meanMedianData.median.text,
              hoverinfo: 'text',
              zmin: -1,
              zmax: 2,
              colorbar: {
                title: 'log10(value)',
                titlefont: { size: 10 },
                tickfont: { size: 8 },
                len: 0.9,
                tickvals: [-1, 0, 1, 2],
                ticktext: ['≤0.1', '1', '10', '≥100']
              }
            }]}
            layout={{
              title: 'Median Distribution',
              autosize: true,
              margin: { l: 50, r: 80, t: 30, b: 50 },
              xaxis: {
                title: 'Size',
                titlefont: { size: 10 },
                tickfont: { size: 8 },
                side: 'bottom'
              },
              yaxis: {
                title: 'Position',
                titlefont: { size: 10 },
                tickfont: { size: 8 }
              },
              hoverlabel: {
                bgcolor: 'white',
                font: { size: 12 }
              } 
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
      </div>
    )
  }

  // Para otros tipos de agregación no implementados
  return (
    <div>
      Tipo de agregación no implementado: {aggregate}
    </div>
  )
}

export default AggregateStructural


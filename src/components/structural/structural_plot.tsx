import React, { useState, useEffect } from 'react'
import Plot from 'react-plotly.js'
import Papa from 'papaparse'

interface HeatmapProps {
  id?: string
  idReplicon?: string
  name?: string
  part: string
}

interface ACPData {
  ID: string
  'ID-replicon': string
  PC1: number
  PC2: number
  [key: string]: any
}

interface SequenceData {
  gap_size: number
  size: number
  motifs: string[]
  counts: number[]
}

interface AggregatedData {
  size: number
  positions: { [position: number]: number }
}

interface SimulatedData {
  size: number
  positions: { [position: number]: number[] }
}

const Heatmap: React.FC<HeatmapProps> = ({ id, idReplicon, name, part }) => {
  const [data, setData] = useState<number[][]>([])
  const [originalData, setOriginalData] = useState<number[][]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [xLabels, setXLabels] = useState<string[]>([])
  const [yLabels, setYLabels] = useState<string[]>([])
  const [textMatrix, setTextMatrix] = useState<string[][]>([])
  const [sequenceData, setSequenceData] = useState<SequenceData[]>([])
  const [aggregatedData, setAggregatedData] = useState<AggregatedData[]>([])
  const [simulatedData, setSimulatedData] = useState<SimulatedData[]>([])
  const [acpData, setAcpData] = useState<ACPData | null>(null)
  const [allAcpData, setAllAcpData] = useState<any[]>([]) // Para el cálculo de la media ponderada
  const [pc1WeightedPoint, setPc1WeightedPoint] = useState<any>(null) // Estado para el PC1 weighted mean
  
  // Debug log para ver qué datos llegan
  console.log('Heatmap component props:', { id, idReplicon, name, part })
  
  // Evitar warnings de variables no usadas
  void sequenceData;
  void aggregatedData;
  void simulatedData;
  void originalData;

  // Función para cargar datos de secuencias
  const loadSequenceData = React.useCallback(async (id: string, idReplicon: string, part: string) => {
    if (!id || !idReplicon) return []
    
    try {
      const sequenceFilePath = `/data/${id}/analysis/${idReplicon}_${part}_obs_top10_per_gap_size.csv`
      console.log('Loading sequence data from:', sequenceFilePath)
      const response = await fetch(sequenceFilePath)
      if (!response.ok) {
        console.warn('Failed to load sequence data:', sequenceFilePath)
        return []
      }

      return new Promise<SequenceData[]>((resolve) => {
        Papa.parse(response.url, {
          download: true,
          header: true,
          worker: true,
          complete: (results: any) => {
            const sequenceData = results.data
              .filter((row: any) => row.gap_size !== undefined && row.size !== undefined)
              .map((row: any) => ({
                gap_size: parseInt(row.gap_size),
                size: parseInt(row.size),
                motifs: JSON.parse(row.motif.replace(/'/g, '"')),
                counts: JSON.parse(row.count)
              }))
            resolve(sequenceData)
          },
          error: () => resolve([])
        })
      })
    } catch (err) {
      return []
    }
  }, [])

  // Función para cargar datos ACP específicos para este organismo
  const loadACPData = React.useCallback(async (id: string, idReplicon: string, part: string) => {
    if (!id || !idReplicon) return null
    
    try {
      // Load ACP data from the same path used in the ACP component
      const acpFilePath = `/data/philogenie/Prokaryote/acp_hc_${part}_Prokaryote.csv`
      console.log('Loading ACP data from:', acpFilePath)
      const response = await fetch(acpFilePath)
      if (!response.ok) {
        console.warn('Failed to load ACP data:', acpFilePath)
        return null
      }

      const text = await response.text()
      if (text.trim().startsWith('<!DOCTYPE html>')) {
        console.warn('ACP file not found (HTML response):', acpFilePath)
        return null
      }

      return new Promise<{currentData: ACPData | null, allData: any[]}>((resolve) => {
        Papa.parse(text, {
          header: true,
          worker: false,
          complete: (results: any) => {
            if (results.data && results.data.length > 0) {
              // Find the specific organism data
              const targetData = results.data.find((row: any) => 
                row.ID === id && row['ID-replicon'] === idReplicon
              )
              
              console.log('ACP data search results:', { id, idReplicon, found: !!targetData, totalRows: results.data.length })
              
              let currentData = null
              if (targetData) {
                console.log('Found ACP data:', targetData)
                // Asegurar conversión correcta de tipos
                const pc1 = parseFloat(targetData.PC1)
                const pc2 = parseFloat(targetData.PC2)
                
                console.log('Parsed PC values:', { pc1, pc2, originalPC1: targetData.PC1, originalPC2: targetData.PC2 })
                
                currentData = {
                  ID: targetData.ID,
                  'ID-replicon': targetData['ID-replicon'],
                  PC1: isNaN(pc1) ? 0 : pc1,
                  PC2: isNaN(pc2) ? 0 : pc2,
                  ...targetData
                }
              } else {
                console.warn('Organism not found in ACP data:', { id, idReplicon })
              }
              
              // Return both current data and all data for weighted mean calculation
              resolve({currentData, allData: results.data})
            } else {
              resolve({currentData: null, allData: []})
            }
          },
          error: () => resolve({currentData: null, allData: []})
        })
      })
    } catch (err) {
      console.warn('Error loading ACP data:', err)
      return null
    }
  }, [])

  // Función para cargar datos observados agregados
  const loadAggregatedData = React.useCallback(async (id: string, idReplicon: string, part: string) => {
    if (!id || !idReplicon) return []
    
    try {
      const filePath = `/data/${id}/analysis/${idReplicon}_${part}_result_obs_aggregated.csv`
      console.log('Loading aggregated data from:', filePath)
      const response = await fetch(filePath)
      if (!response.ok) {
        console.warn('Failed to load aggregated data:', filePath)
        return []
      }

      return new Promise<AggregatedData[]>((resolve) => {
        Papa.parse(response.url, {
          download: true,
          header: true,
          worker: true,
          complete: (results: any) => {
            const data = results.data
              .filter((row: any) => row.size !== undefined)
              .map((row: any) => {
                const positions: { [position: number]: number } = {}
                Object.keys(row).forEach(key => {
                  if (key !== 'size' && !isNaN(Number(key))) {
                    positions[Number(key)] = Number(row[key]) || 0
                  }
                })
                return {
                  size: Number(row.size),
                  positions
                }
              })
            resolve(data)
          },
          error: () => resolve([])
        })
      })
    } catch (err) {
      return []
    }
  }, [])

  // Función para cargar datos simulados agregados
  const loadSimulatedData = React.useCallback(async (id: string, idReplicon: string, part: string) => {
    if (!id || !idReplicon) return []
    
    try {
      const filePath = `/data/${id}/analysis/${idReplicon}_${part}_result_sim_aggregated.csv`
      console.log('Loading simulated data from:', filePath)
      const response = await fetch(filePath)
      if (!response.ok) {
        console.warn('Failed to load simulated data:', filePath)
        return []
      }

      return new Promise<SimulatedData[]>((resolve) => {
        Papa.parse(response.url, {
          download: true,
          header: true,
          worker: true,
          complete: (results: any) => {
            const data = results.data
              .filter((row: any) => row.size !== undefined)
              .map((row: any) => {
                const positions: { [position: number]: number[] } = {}
                Object.keys(row).forEach(key => {
                  if (key !== 'size' && !isNaN(Number(key))) {
                    try {
                      const values = JSON.parse(row[key].replace(/'/g, '"'))
                      positions[Number(key)] = Array.isArray(values) ? values : []
                    } catch {
                      positions[Number(key)] = []
                    }
                  }
                })
                return {
                  size: Number(row.size),
                  positions
                }
              })
            resolve(data)
          },
          error: () => resolve([])
        })
      })
    } catch (err) {
      return []
    }
  }, [])

  // Función auxiliar para calcular la media de un array
  const calculateMean = (values: number[]): number => {
    if (values.length === 0) return 0
    return values.reduce((sum, val) => sum + val, 0) / values.length
  }

  // Procesar datos de manera más eficiente
  const processData = React.useCallback((rawData: any[][], sequenceData: SequenceData[], aggregatedData: AggregatedData[], simulatedData: SimulatedData[]) => {
    // Filtrar filas vacías y la última si está vacía
    const cleanData = rawData.filter(row => row.length > 1)
    if (cleanData[cleanData.length - 1].length === 0) {
      cleanData.pop()
    }

    // Extraer etiquetas directamente
    const sizeLabels = cleanData.slice(1).map(row => row[0])
    const positionLabels = cleanData[0].slice(1)

    // Crear matriz de datos numéricos
    const dataMatrix = cleanData.slice(1).map(row =>
      row.slice(1).map(value => parseFloat(value) || 0)
    )

    // Transponer la matriz
    const transposed = dataMatrix[0].map((_, colIndex) =>
      dataMatrix.map(row => row[colIndex])
    )

    // Crear matriz logarítmica
    const logMatrix = transposed.map(row =>
      row.map(value => value > 0 ? Math.log10(value) : -1)
    )

    // Crear mapas de datos para acceso rápido
    const sequenceMap = new Map<string, { motifs: string[], counts: number[] }>()
    sequenceData.forEach(seq => {
      const key = `${seq.gap_size}_${seq.size}`
      sequenceMap.set(key, { motifs: seq.motifs, counts: seq.counts })
    })

    // Crear mapas de datos agregados y simulados
    const aggregatedMap = new Map<string, number>()
    aggregatedData.forEach(aggData => {
      Object.keys(aggData.positions).forEach(position => {
        const key = `${position}_${aggData.size}`
        aggregatedMap.set(key, aggData.positions[Number(position)])
      })
    })

    const simulatedMap = new Map<string, number[]>()
    simulatedData.forEach(simData => {
      Object.keys(simData.positions).forEach(position => {
        const key = `${position}_${simData.size}`
        simulatedMap.set(key, simData.positions[Number(position)])
      })
    })

    // Crear matriz de texto para hover
    const hoverMatrix = transposed.map((row, i) =>
      row.map((value, j) => {
        const logValue = value > 0 ? Math.log10(value) : -1
        const gapSize = i // posición corresponde a gap_size
        const size = parseInt(sizeLabels[j]) // size del label
        const sequenceKey = `${gapSize}_${size}`
        const aggregatedKey = `${gapSize}_${size}`
        
        const sequenceInfo = sequenceMap.get(sequenceKey)
        const observedValue = aggregatedMap.get(aggregatedKey)
        const simulatedValues = simulatedMap.get(aggregatedKey)
        
        let hoverText = `Size: ${sizeLabels[j]}<br>` +
                       `Gap: ${positionLabels[i]}<br>` +
                       `Value: ${value.toFixed(3)}<br>` +
                       `Log10: ${logValue.toFixed(2)}`
        
        // Agregar valor observado si existe
        if (observedValue !== undefined) {
          hoverText += `<br>Observed: ${observedValue}`
        }
        
        // Agregar media de valores simulados si existen
        if (simulatedValues && simulatedValues.length > 0) {
          const mean = calculateMean(simulatedValues)
          hoverText += `<br>Simulated Mean: ${mean.toFixed(2)}`
        }
        
        if (sequenceInfo) {
          // Agregar información de los top 5 motivos más frecuentes
          const topMotifs = sequenceInfo.motifs.slice(0, 5)
          const topCounts = sequenceInfo.counts.slice(0, 5)
          
          hoverText += '<br><br>Top motifs:'
          topMotifs.forEach((motif, idx) => {
            hoverText += `<br>${motif}: ${topCounts[idx]}`
          })
        }
        
        return hoverText
      })
    )

    return {
      logData: logMatrix,
      originalData: transposed,
      xLabels: sizeLabels,
      yLabels: positionLabels,
      textMatrix: hoverMatrix
    }
  }, [])

  useEffect(() => {
    if (!id || !idReplicon) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      
      // Cargar datos del heatmap
      const filePath = `/data/${id}/analysis/${idReplicon}_hc_${part}.csv`
      
      try {
        console.log('filePath:', filePath)
        console.log('Cargando archivo:', filePath)
        
        const response = await fetch(filePath)
        if (!response.ok) throw new Error(`File not found: ${filePath} (HTTP ${response.status})`)

        const text = await response.text()
        
        // Check if the response is actually HTML (happens when file doesn't exist in dev server)
        if (text.trim().toLowerCase().startsWith('<!doctype html>') || text.trim().toLowerCase().startsWith('<html')) {
          throw new Error(`Structural data file not found: ${filePath}. The server returned HTML instead of CSV data.`)
        }

        // Cargar todos los datos en paralelo
        const sequenceDataPromise = loadSequenceData(id, idReplicon, part)
        const aggregatedDataPromise = loadAggregatedData(id, idReplicon, part)
        const simulatedDataPromise = loadSimulatedData(id, idReplicon, part)
        const acpDataPromise = loadACPData(id, idReplicon, part)
        
        Papa.parse(text, {
          header: false,
          worker: true,
          fastMode: true,
          complete: async (results: any) => {
            console.log('Datos cargados:', results.data.length, 'filas')
            
            // Esperar a que se carguen todos los datos
            const [sequenceDataResult, aggregatedDataResult, simulatedDataResult, acpDataResult] = await Promise.all([
              sequenceDataPromise,
              aggregatedDataPromise,
              simulatedDataPromise,
              acpDataPromise
            ])
            
            setSequenceData(sequenceDataResult)
            setAggregatedData(aggregatedDataResult)
            setSimulatedData(simulatedDataResult)
            setAcpData(acpDataResult?.currentData || null)
            setAllAcpData(acpDataResult?.allData || [])
            
            const processed = processData(results.data, sequenceDataResult, aggregatedDataResult, simulatedDataResult)
            
            setData(processed.logData)
            setOriginalData(processed.originalData)
            setXLabels(processed.xLabels)
            setYLabels(processed.yLabels)
            setTextMatrix(processed.textMatrix)
            setLoading(false)
          },
          error: (error: any) => {
            console.error('Error parsing CSV:', error)
            setError(`Error parsing CSV file ${filePath}: ${error.message}`)
            setLoading(false)
          }
        })
      } catch (err) {
        console.error('Error fetching file:', err)
        setError(err instanceof Error ? err.message : `Unknown error loading file: ${filePath}`)
        setLoading(false)
      }
    }

    fetchData()
  }, [id, idReplicon, part, processData, loadSequenceData, loadAggregatedData, loadSimulatedData, loadACPData])

  // Efecto para cargar y calcular PC1 weighted mean
  useEffect(() => {
    const calculatePC1WeightedMean = async () => {
      if (allAcpData.length === 0 || xLabels.length === 0 || yLabels.length === 0) return

      try {
        const pc0FilePath = `/data/philogenie/Prokaryote/PC0_hc_${part}_Prokaryote.csv`
        const response = await fetch(pc0FilePath)
        if (!response.ok) {
          console.warn('Failed to load PC0 data:', pc0FilePath)
          return
        }
        const text = await response.text()
        
        const pc0Data = await new Promise<number[][]>((resolve) => {
          Papa.parse(text, {
            header: false,
            worker: false,
            complete: (results: any) => {
              if (results.data && results.data.length > 0) {
                // Procesar igual que el heatmap principal
                const cleanData = results.data.filter((row: any[]) => row.length > 1)
                if (cleanData[cleanData.length - 1].length === 0) {
                  cleanData.pop()
                }
                
                // Crear matriz de datos numéricos (sin las etiquetas)
                const dataMatrix = cleanData.slice(1).map((row: any[]) =>
                  row.slice(1).map((value: any) => parseFloat(value) || 0)
                )
                
                // Transponer la matriz para que coincida con el formato del heatmap principal
                const transposed = dataMatrix[0].map((_, colIndex) =>
                  dataMatrix.map(row => row[colIndex])
                )
                
                resolve(transposed)
              } else {
                resolve([])
              }
            },
            error: () => resolve([])
          })
        })
        
        if (pc0Data && pc0Data.length > 0) {
          // Calcular la media ponderada 2D usando el heatmap PC0 completo
          // de la misma manera que se calcula para el heatmap actual
          let pc1WeightedSumX = 0
          let pc1WeightedSumY = 0
          let pc1TotalWeight = 0
          
          // Calcular usando todos los puntos del heatmap PC0
          for (let i = 0; i < pc0Data.length; i++) {
            for (let j = 0; j < pc0Data[i].length; j++) {
              const weight = pc0Data[i][j]
              
              // Solo usar valores válidos (positivos)
              if (weight > 0) {
                const xPos = parseInt(xLabels[j])
                const yPos = parseInt(yLabels[i])
                
                pc1WeightedSumX += xPos * weight
                pc1WeightedSumY += yPos * weight
                pc1TotalWeight += weight
              }
            }
          }
          
          if (pc1TotalWeight > 0) {
            const pc1WeightedMeanX = pc1WeightedSumX / pc1TotalWeight
            const pc1WeightedMeanY = pc1WeightedSumY / pc1TotalWeight
            
            setPc1WeightedPoint({
              x: [pc1WeightedMeanX],
              y: [pc1WeightedMeanY],
              mode: 'markers' as const,
              type: 'scatter' as const,
              marker: {
                size: 12,
                color: 'blue',
                symbol: 'diamond',
                line: {
                  color: 'black',
                  width: 2
                }
              },
              text: [`PC0 2D Weighted Mean<br>X: ${pc1WeightedMeanX.toFixed(2)}<br>Y: ${pc1WeightedMeanY.toFixed(2)}<br>Total Weight: ${pc1TotalWeight.toFixed(3)}`],
              hoverinfo: 'text' as const,
              name: 'PC0 2D Weighted Mean',
              showlegend: true
            })
          }
        }
      } catch (err) {
        console.warn('Error calculating PC1 weighted mean:', err)
      }
    }

    calculatePC1WeightedMean()
  }, [allAcpData, xLabels, yLabels, part])

  // Actualizamos también los mensajes de ruta en la interfaz
  if (!id || !idReplicon) return (
    <div>
      <p>Selecciona un elemento del ACP o de la tabla</p>
      <p>Ruta actual: ninguna</p>
    </div>
  )

  if (loading) return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h3>Loading structural data...</h3>
      {id && idReplicon && (
        <p>Loading heatmap for {name || id} ({part} analysis)</p>
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
      <h3 style={{ color: '#ff6b6b', margin: '0 0 10px 0' }}>⚠️ Structural Data Not Found</h3>
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
          <strong>Expected file:</strong> {id}/analysis/{idReplicon}_hc_{part}.csv
        </div>
      )}
      <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '10px' }}>
        💡 <strong>Tip:</strong> This file contains structural analysis data for gap/arm visualization.
      </div>
    </div>
  )

  const openInPopup = () => {
    // Create a popup window
    const popup = window.open('', '_blank', 'width=1000,height=700,scrollbars=yes,resizable=yes')
    
    if (popup) {
      // Create the HTML content for the popup
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${name || idReplicon || 'Structural Plot'} - Gap/Arm Analysis</title>
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
              height: calc(100% - 60px);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>${name || idReplicon || 'Structural Plot'} ${idReplicon && name ? `(${idReplicon})` : ''}</h2>
              <p>Gap/Arm Analysis - ${part.toUpperCase()}</p>
            </div>
            <div id="plot" class="plot-container"></div>
          </div>
          <script>
            const plotData = [{
              z: ${JSON.stringify(data)},
              x: ${JSON.stringify(xLabels)},
              y: ${JSON.stringify(yLabels)},
              type: 'heatmap',
              colorscale: [
                [0, 'rgb(0, 0, 255)'],
                [0.33, 'rgb(255, 255, 255)'],
                [0.66, 'rgb(255, 0, 0)'],
                [1, 'rgb(0, 0, 0)']
              ],
              showscale: true,
              text: ${JSON.stringify(textMatrix)},
              hoverinfo: 'text',
              zmin: -1,
              zmax: 2,
              colorbar: {
                title: { text: 'log10(value)' },
                tickfont: { size: 12 },
                len: 0.9,
                tickvals: [-1, 0, 1, 2],
                ticktext: ['≤0.1', '1', '10', '≥100']
              }
            }];
            
            // Add additional points (mean and PC1)
            const data2d = ${JSON.stringify(data)};
            const xLabels = ${JSON.stringify(xLabels)};
            const yLabels = ${JSON.stringify(yLabels)};
            const acpData = ${JSON.stringify(acpData)};
            
            // Calculate weighted mean point (2D weighted mean)
            let weightedSumX = 0;
            let weightedSumY = 0;
            let totalWeight = 0;
            
            for (let i = 0; i < data2d.length; i++) {
              for (let j = 0; j < data2d[i].length; j++) {
                const logValue = data2d[i][j];
                if (logValue > -1) {
                  const weight = logValue; // Usar directamente el valor log
                  const xPos = parseInt(xLabels[j]);
                  const yPos = parseInt(yLabels[i]);
                  
                  weightedSumX += xPos * weight;
                  weightedSumY += yPos * weight;
                  totalWeight += weight;
                }
              }
            }
            
            // Fórmula correcta para media ponderada 2D
            const weightedMeanX = totalWeight > 0 ? weightedSumX / totalWeight : (parseInt(xLabels[0]) + parseInt(xLabels[xLabels.length - 1])) / 2;
            const weightedMeanY = totalWeight > 0 ? weightedSumY / totalWeight : (parseInt(yLabels[0]) + parseInt(yLabels[yLabels.length - 1])) / 2;
            
            // Add weighted mean point
            plotData.push({
              x: [weightedMeanX],
              y: [weightedMeanY],
              mode: 'markers',
              type: 'scatter',
              marker: {
                size: 12,
                color: 'red',
                symbol: 'circle',
                line: { color: 'black', width: 2 }
              },
              text: ['2D Weighted Mean (log weights)<br>X: ' + weightedMeanX.toFixed(2) + '<br>Y: ' + weightedMeanY.toFixed(2) + '<br>Total Weight: ' + totalWeight.toFixed(3)],
              hoverinfo: 'text',
              name: '2D Weighted Mean',
              showlegend: true
            });
            
            // Calculate mean around maximum (5x5 window)
            let maxValue = -Infinity;
            let maxI = 0;
            let maxJ = 0;
            
            // Find maximum value and its position
            for (let i = 0; i < data2d.length; i++) {
              for (let j = 0; j < data2d[i].length; j++) {
                const logValue = data2d[i][j];
                if (logValue > maxValue) {
                  maxValue = logValue;
                  maxI = i;
                  maxJ = j;
                }
              }
            }
            
            // Calculate mean in 5x5 window around maximum
            let sumX = 0;
            let sumY = 0;
            let count = 0;
            const windowSize = 2; // radius of 2 for 5x5 window
            
            for (let i = maxI - windowSize; i <= maxI + windowSize; i++) {
              for (let j = maxJ - windowSize; j <= maxJ + windowSize; j++) {
                // Check bounds
                if (i >= 0 && i < data2d.length && j >= 0 && j < data2d[i].length) {
                  const logValue = data2d[i][j];
                  if (logValue > -1) { // Only valid values
                    const xPos = parseInt(xLabels[j]);
                    const yPos = parseInt(yLabels[i]);
                    sumX += xPos;
                    sumY += yPos;
                    count++;
                  }
                }
              }
            }
            
            if (count > 0) {
              const meanAroundMaxX = sumX / count;
              const meanAroundMaxY = sumY / count;
              
              plotData.push({
                x: [meanAroundMaxX],
                y: [meanAroundMaxY],
                mode: 'markers',
                type: 'scatter',
                marker: {
                  size: 12,
                  color: 'green',
                  symbol: 'square',
                  line: { color: 'black', width: 2 }
                },
                text: ['Mean Around Max (5x5 window)<br>X: ' + meanAroundMaxX.toFixed(2) + '<br>Y: ' + meanAroundMaxY.toFixed(2) + '<br>Max Value: ' + maxValue.toFixed(3) + '<br>Window Points: ' + count],
                hoverinfo: 'text',
                name: 'Mean Around Max',
                showlegend: true
              });
            }
            
            // Calculate mean around minimum (5x5 window)
            let minValue = Infinity;
            let minI = 0;
            let minJ = 0;
            
            // Find minimum valid value and its position
            for (let i = 0; i < data2d.length; i++) {
              for (let j = 0; j < data2d[i].length; j++) {
                const logValue = data2d[i][j];
                if (logValue > -1 && logValue < minValue) { // Only valid values
                  minValue = logValue;
                  minI = i;
                  minJ = j;
                }
              }
            }
            
            // Calculate mean in 5x5 window around minimum
            let minSumX = 0;
            let minSumY = 0;
            let minCount = 0;
            
            for (let i = minI - windowSize; i <= minI + windowSize; i++) {
              for (let j = minJ - windowSize; j <= minJ + windowSize; j++) {
                // Check bounds
                if (i >= 0 && i < data2d.length && j >= 0 && j < data2d[i].length) {
                  const logValue = data2d[i][j];
                  if (logValue > -1) { // Only valid values
                    const xPos = parseInt(xLabels[j]);
                    const yPos = parseInt(yLabels[i]);
                    minSumX += xPos;
                    minSumY += yPos;
                    minCount++;
                  }
                }
              }
            }
            
            if (minCount > 0 && minValue !== Infinity) {
              const meanAroundMinX = minSumX / minCount;
              const meanAroundMinY = minSumY / minCount;
              
              plotData.push({
                x: [meanAroundMinX],
                y: [meanAroundMinY],
                mode: 'markers',
                type: 'scatter',
                marker: {
                  size: 12,
                  color: 'orange',
                  symbol: 'triangle-up',
                  line: { color: 'black', width: 2 }
                },
                text: ['Mean Around Min (5x5 window)<br>X: ' + meanAroundMinX.toFixed(2) + '<br>Y: ' + meanAroundMinY.toFixed(2) + '<br>Min Value: ' + minValue.toFixed(3) + '<br>Window Points: ' + minCount],
                hoverinfo: 'text',
                name: 'Mean Around Min',
                showlegend: true
              });
            }
            
            // Add PC1 weighted mean if ACP data is available
            const allAcpData = ${JSON.stringify(allAcpData)};
            if (allAcpData.length > 0) {
              // Load PC0 data for weights
              fetch('/data/philogenie/Prokaryote/PC0_hc_${part}_Prokaryote.csv')
                .then(response => response.text())
                .then(text => {
                  // Parse PC0 data
                  const lines = text.split('\\n').filter(line => line.trim());
                  if (lines.length > 1) {
                    const pc0Data = [];
                    for (let i = 1; i < lines.length; i++) {
                      const values = lines[i].split(',').slice(1); // Skip first column (row labels)
                      const numericValues = values.map(v => parseFloat(v) || 0);
                      if (numericValues.length > 0) {
                        pc0Data.push(numericValues);
                      }
                    }
                    
                    // Transpose PC0 data to match heatmap format
                    const transposedPC0 = pc0Data[0].map((_, colIndex) =>
                      pc0Data.map(row => row[colIndex])
                    );
                    
                    if (transposedPC0.length > 0) {
                      let pc1WeightedSumX = 0;
                      let pc1WeightedSumY = 0;
                      let pc1TotalWeight = 0;
                      
                      // Calcular usando todos los puntos del heatmap PC0
                      for (let i = 0; i < transposedPC0.length; i++) {
                        for (let j = 0; j < transposedPC0[i].length; j++) {
                          const weight = transposedPC0[i][j];
                          
                          // Solo usar valores válidos (positivos)
                          if (weight > 0) {
                            const xPos = parseInt(xLabels[j]);
                            const yPos = parseInt(yLabels[i]);
                            
                            pc1WeightedSumX += xPos * weight;
                            pc1WeightedSumY += yPos * weight;
                            pc1TotalWeight += weight;
                          }
                        }
                      }
                      
                      if (pc1TotalWeight > 0) {
                        const pc1WeightedMeanX = pc1WeightedSumX / pc1TotalWeight;
                        const pc1WeightedMeanY = pc1WeightedSumY / pc1TotalWeight;
                        
                        plotData.push({
                          x: [pc1WeightedMeanX],
                          y: [pc1WeightedMeanY],
                          mode: 'markers',
                          type: 'scatter',
                          marker: {
                            size: 12,
                            color: 'blue',
                            symbol: 'diamond',
                            line: { color: 'black', width: 2 }
                          },
                          text: ['PC0 2D Weighted Mean<br>X: ' + pc1WeightedMeanX.toFixed(2) + '<br>Y: ' + pc1WeightedMeanY.toFixed(2) + '<br>Total Weight: ' + pc1TotalWeight.toFixed(3)],
                          hoverinfo: 'text',
                          name: 'PC0 2D Weighted Mean',
                          showlegend: true
                        });
                        
                        // Re-plot with the new data
                        Plotly.newPlot('plot', plotData, layout, config);
                      }
                    }
                  }
                })
                .catch(err => {
                  console.warn('Could not load PC0 data for popup:', err);
                });
            }
            
            const layout = {
              title: { 
                text: '${name || idReplicon || ''} ${idReplicon && name ? `(${idReplicon})` : ''}',
                font: { size: 18 }
              },
              autosize: true,
              margin: { l: 100, r: 120, t: 80, b: 100 },
              xaxis: {
                title: { 
                  text: 'Size',
                  font: { size: 18 }
                },
                tickfont: { size: 16 },
                side: 'bottom'
              },
              yaxis: {
                title: { 
                  text: 'Gap',
                  font: { size: 18 }
                },
                tickfont: { size: 16 }
              },
              hoverlabel: {
                bgcolor: 'white',
                font: { size: 14 }
              }
            };
            
            const config = {
              responsive: true,
              displayModeBar: true,
              displaylogo: false,
              toImageButtonOptions: {
                format: 'png',
                filename: '${name || idReplicon || 'structural_plot'}_${part}',
                height: 600,
                width: 800,
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

  // Función para calcular puntos adicionales (mean y PC1)
  const calculateAdditionalPoints = () => {
    const additionalTraces = []

    console.log('calculateAdditionalPoints called with:', { 
      xLabelsLength: xLabels.length, 
      yLabelsLength: yLabels.length, 
      acpData: acpData,
      allAcpDataLength: allAcpData.length,
      acpDataType: typeof acpData,
      pc1Type: acpData ? typeof acpData.PC1 : 'no acpData',
      dataLength: data.length,
      dataFirstRowLength: data.length > 0 ? data[0].length : 0
    })

    if (xLabels.length > 0 && yLabels.length > 0 && data.length > 0) {
      // Calcular punto medio PONDERADO por los valores log del heatmap (2D weighted mean)
      let weightedSumX = 0
      let weightedSumY = 0
      let totalWeight = 0
      
      for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data[i].length; j++) {
          const logValue = data[i][j]
          // Solo usar valores válidos (no -1 que representa log de 0)
          if (logValue > -1) {
            // Usar directamente el valor log como peso (no convertir a lineal)
            const weight = logValue // Ya está en log10
            const xPos = parseInt(xLabels[j])
            const yPos = parseInt(yLabels[i])
            
            weightedSumX += xPos * weight
            weightedSumY += yPos * weight
            totalWeight += weight
          }
        }
      }
      
      // Fórmula correcta para media ponderada 2D
      const weightedMeanX = totalWeight > 0 ? weightedSumX / totalWeight : (parseInt(xLabels[0]) + parseInt(xLabels[xLabels.length - 1])) / 2
      const weightedMeanY = totalWeight > 0 ? weightedSumY / totalWeight : (parseInt(yLabels[0]) + parseInt(yLabels[yLabels.length - 1])) / 2

      // Punto mean ponderado
      additionalTraces.push({
        x: [weightedMeanX],
        y: [weightedMeanY],
        mode: 'markers' as const,
        type: 'scatter' as const,
        marker: {
          size: 12,
          color: 'red',
          symbol: 'circle',
          line: {
            color: 'black',
            width: 2
          }
        },
        text: [`2D Weighted Mean (log weights)<br>X: ${weightedMeanX.toFixed(2)}<br>Y: ${weightedMeanY.toFixed(2)}<br>Total Weight: ${totalWeight.toFixed(3)}`],
        hoverinfo: 'text' as const,
        name: '2D Weighted Mean',
        showlegend: true
      })

      // Calcular punto de media alrededor del máximo (ventana 5x5)
      let maxValue = -Infinity
      let maxI = 0
      let maxJ = 0
      
      // Encontrar el máximo valor y su posición
      for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data[i].length; j++) {
          const logValue = data[i][j]
          if (logValue > maxValue) {
            maxValue = logValue
            maxI = i
            maxJ = j
          }
        }
      }
      
      // Calcular media en ventana 5x5 alrededor del máximo
      let sumX = 0
      let sumY = 0
      let count = 0
      const windowSize = 2 // radio de 2 para ventana 5x5
      
      for (let i = maxI - windowSize; i <= maxI + windowSize; i++) {
        for (let j = maxJ - windowSize; j <= maxJ + windowSize; j++) {
          // Verificar que esté dentro de los límites
          if (i >= 0 && i < data.length && j >= 0 && j < data[i].length) {
            const logValue = data[i][j]
            if (logValue > -1) { // Solo valores válidos
              const xPos = parseInt(xLabels[j])
              const yPos = parseInt(yLabels[i])
              sumX += xPos
              sumY += yPos
              count++
            }
          }
        }
      }
      
      if (count > 0) {
        const meanAroundMaxX = sumX / count
        const meanAroundMaxY = sumY / count
        
        additionalTraces.push({
          x: [meanAroundMaxX],
          y: [meanAroundMaxY],
          mode: 'markers' as const,
          type: 'scatter' as const,
          marker: {
            size: 12,
            color: 'green',
            symbol: 'square',
            line: {
              color: 'black',
              width: 2
            }
          },
          text: [`Mean Around Max (5x5 window)<br>X: ${meanAroundMaxX.toFixed(2)}<br>Y: ${meanAroundMaxY.toFixed(2)}<br>Max Value: ${maxValue.toFixed(3)}<br>Window Points: ${count}`],
          hoverinfo: 'text' as const,
          name: 'Mean Around Max',
          showlegend: true
        })
      }

      // Calcular punto de media alrededor del mínimo (ventana 5x5)
      let minValue = Infinity
      let minI = 0
      let minJ = 0
      
      // Encontrar el mínimo valor válido y su posición
      for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data[i].length; j++) {
          const logValue = data[i][j]
          if (logValue > -1 && logValue < minValue) { // Solo valores válidos
            minValue = logValue
            minI = i
            minJ = j
          }
        }
      }
      
      // Calcular media en ventana 5x5 alrededor del mínimo
      let minSumX = 0
      let minSumY = 0
      let minCount = 0
      
      for (let i = minI - windowSize; i <= minI + windowSize; i++) {
        for (let j = minJ - windowSize; j <= minJ + windowSize; j++) {
          // Verificar que esté dentro de los límites
          if (i >= 0 && i < data.length && j >= 0 && j < data[i].length) {
            const logValue = data[i][j]
            if (logValue > -1) { // Solo valores válidos
              const xPos = parseInt(xLabels[j])
              const yPos = parseInt(yLabels[i])
              minSumX += xPos
              minSumY += yPos
              minCount++
            }
          }
        }
      }
      
      if (minCount > 0 && minValue !== Infinity) {
        const meanAroundMinX = minSumX / minCount
        const meanAroundMinY = minSumY / minCount
        
        additionalTraces.push({
          x: [meanAroundMinX],
          y: [meanAroundMinY],
          mode: 'markers' as const,
          type: 'scatter' as const,
          marker: {
            size: 12,
            color: 'orange',
            symbol: 'triangle-up',
            line: {
              color: 'black',
              width: 2
            }
          },
          text: [`Mean Around Min (5x5 window)<br>X: ${meanAroundMinX.toFixed(2)}<br>Y: ${meanAroundMinY.toFixed(2)}<br>Min Value: ${minValue.toFixed(3)}<br>Window Points: ${minCount}`],
          hoverinfo: 'text' as const,
          name: 'Mean Around Min',
          showlegend: true
        })
      }
    }

    return additionalTraces
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
            z: data,
            x: xLabels,
            y: yLabels,
            type: 'heatmap' as const,
            colorscale: [
              [0, 'rgb(0, 0, 255)'],
              [0.33, 'rgb(255, 255, 255)'],
              [0.66, 'rgb(255, 0, 0)'],
              [1, 'rgb(0, 0, 0)']
            ],
            showscale: true,
            text: textMatrix as any,
            hoverinfo: 'text' as const,
            zmin: -1,
            zmax: 2,
            colorbar: {
              title: { text: 'log10(value)' },
              tickfont: { size: 8 },
              len: 0.9,
              tickvals: [-1, 0, 1, 2],
              ticktext: ['≤0.1', '1', '10', '≥100']
            }
          },
          ...calculateAdditionalPoints(),
          ...(pc1WeightedPoint ? [pc1WeightedPoint] : [])
        ]}
        layout={{
          title: { text: `${name || idReplicon || ''} ${idReplicon && name ? `(${idReplicon})` : ''}` },
          autosize: true,
          margin: { l: 80, r: 100, t: 40, b: 80 },
          xaxis: {
            title: { 
              text: 'Size',
              font: { size: 16 }
            },
            tickfont: { size: 14 },
            side: 'bottom'
          },
          yaxis: {
            title: { 
              text: 'Gap',
              font: { size: 16 }
            },
            tickfont: { size: 14 }
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
  )
}

export default Heatmap
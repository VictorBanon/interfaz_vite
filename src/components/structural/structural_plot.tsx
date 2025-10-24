import React, { useState, useEffect } from 'react'
import Plot from 'react-plotly.js'
import Papa from 'papaparse'

interface HeatmapProps {
  id?: string
  idReplicon?: string
  name?: string
  part: string
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
  
  // Debug log para ver qué datos llegan
  console.log('Heatmap component props:', { id, idReplicon, name, part })
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [xLabels, setXLabels] = useState<string[]>([])
  const [yLabels, setYLabels] = useState<string[]>([])
  const [textMatrix, setTextMatrix] = useState<string[][]>([])
  const [sequenceData, setSequenceData] = useState<SequenceData[]>([])
  const [aggregatedData, setAggregatedData] = useState<AggregatedData[]>([])
  const [simulatedData, setSimulatedData] = useState<SimulatedData[]>([])
  
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
                       `Position: ${positionLabels[i]}<br>` +
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

    console.log('Processed Data:', { logMatrix, transposed, sizeLabels, positionLabels, hoverMatrix })

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
        
        Papa.parse(text, {
          header: false,
          worker: true,
          fastMode: true,
          complete: async (results: any) => {
            console.log('Datos cargados:', results.data.length, 'filas')
            
            // Esperar a que se carguen todos los datos
            const [sequenceDataResult, aggregatedDataResult, simulatedDataResult] = await Promise.all([
              sequenceDataPromise,
              aggregatedDataPromise,
              simulatedDataPromise
            ])
            
            setSequenceData(sequenceDataResult)
            setAggregatedData(aggregatedDataResult)
            setSimulatedData(simulatedDataResult)
            
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
  }, [id, idReplicon, part, processData, loadSequenceData, loadAggregatedData, loadSimulatedData])

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

  return (
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
        }
      ]}
      layout={{
        title: { text: `Heatmap ${name || idReplicon || ''} ${idReplicon && name ? `(${idReplicon})` : ''}` },
        autosize: true,
        margin: { l: 50, r: 80, t: 30, b: 50 },
        xaxis: {
          title: { text: 'Size' },
          tickfont: { size: 8 },
          side: 'bottom'
        },
        yaxis: {
          title: { text: 'Gap' },
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
  )
}

export default Heatmap
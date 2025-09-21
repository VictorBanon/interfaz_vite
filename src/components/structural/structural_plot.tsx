import React, { useState, useEffect } from 'react'
import Plot from 'react-plotly.js'
import Papa from 'papaparse'

interface HeatmapProps {
  id?: string
  idReplicon?: string
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

const Heatmap: React.FC<HeatmapProps> = ({ id, idReplicon, part }) => {
  const [data, setData] = useState<number[][]>([])
  const [originalData, setOriginalData] = useState<number[][]>([]) // Nuevo estado
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [xLabels, setXLabels] = useState<string[]>([])
  const [yLabels, setYLabels] = useState<string[]>([])
  const [textMatrix, setTextMatrix] = useState<string[][]>([]) // Nueva matriz de texto
  const [sequenceData, setSequenceData] = useState<SequenceData[]>([]) // Datos de secuencias
  const [aggregatedData, setAggregatedData] = useState<AggregatedData[]>([]) // Datos observados agregados
  const [simulatedData, setSimulatedData] = useState<SimulatedData[]>([]) // Datos simulados

  // Función para cargar datos de secuencias
  const loadSequenceData = React.useCallback(async (id: string, part: string) => {
    if (!id) return []
    
    try {
      const sequenceFilePath = `/data/${id}/analysis/chromosome_${id}_${part}_obs_top10_per_gap_size.csv`
      const response = await fetch(sequenceFilePath)
      if (!response.ok) return []

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
  const loadAggregatedData = React.useCallback(async (id: string, part: string) => {
    if (!id) return []
    
    try {
      const filePath = `/data/${id}/analysis/chromosome_${id}_${part}_result_obs_aggregated.csv`
      const response = await fetch(filePath)
      if (!response.ok) return []

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
  const loadSimulatedData = React.useCallback(async (id: string, part: string) => {
    if (!id) return []
    
    try {
      const filePath = `/data/${id}/analysis/chromosome_${id}_${part}_result_sim_aggregated.csv`
      const response = await fetch(filePath)
      if (!response.ok) return []

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
          // Agregar información de los top 3 motivos más frecuentes
          const topMotifs = sequenceInfo.motifs.slice(0, 3)
          const topCounts = sequenceInfo.counts.slice(0, 3)
          
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
      
      try {
        // Cargar datos del heatmap
        const filePath = `/data/${id}/analysis/${idReplicon}_hc_${part}.csv`
        console.log('filePath:', filePath)
        console.log('Cargando archivo:', filePath)
        
        const response = await fetch(filePath)
        if (!response.ok) throw new Error('No se pudo cargar el archivo')

        // Cargar todos los datos en paralelo
        const sequenceDataPromise = loadSequenceData(id, part)
        const aggregatedDataPromise = loadAggregatedData(id, part)
        const simulatedDataPromise = loadSimulatedData(id, part)
        
        Papa.parse(response.url, {
          download: true,
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
            console.error('Error al parsear CSV:', error)
            setError(error.message)
            setLoading(false)
          }
        })
      } catch (err) {
        console.error('Error en fetch:', err)
        setError(err instanceof Error ? err.message : 'Error desconocido')
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
    <div>
      <p>Cargando...</p>
      <p>Ruta: /data/{id}/analysis/{idReplicon}_hc_{part}.csv</p>
    </div>
  )

  if (error) return (
    <div>
      <p>Error: {error}</p>
      <p>Ruta intentada: /data/{id}/analysis/{idReplicon}_hc_{part}.csv</p>
    </div>
  )

  return (
    <Plot
      data={[
        {
          z: data,
          x: xLabels,
          y: yLabels,
          type: 'heatmap',
          colorscale: [
            [0, 'rgb(0, 0, 255)'],
            [0.33, 'rgb(255, 255, 255)'],
            [0.66, 'rgb(255, 0, 0)'],
            [1, 'rgb(0, 0, 0)']
          ],
          showscale: true,
          text: textMatrix,
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
        }
      ]}
      layout={{
        title: `Heatmap ${idReplicon || ''}`,
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
  );;
}

export default Heatmap
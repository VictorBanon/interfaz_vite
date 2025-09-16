import React, { useState, useEffect } from 'react'
import Plot from 'react-plotly.js'
import Papa from 'papaparse'

interface HeatmapProps {
  id?: string
  idReplicon?: string
  part: string
}

const Heatmap: React.FC<HeatmapProps> = ({ id, idReplicon, part }) => {
  const [data, setData] = useState<number[][]>([])
  const [originalData, setOriginalData] = useState<number[][]>([]) // Nuevo estado
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [xLabels, setXLabels] = useState<string[]>([])
  const [yLabels, setYLabels] = useState<string[]>([])
  const [textMatrix, setTextMatrix] = useState<string[][]>([]) // Nueva matriz de texto

  // Memoizar la función safeLog10 para evitar recálculos innecesarios
  const safeLog10 = React.useMemo(() => (value: number) => {
    if (value <= 0) return -1
    return Math.log10(value)
  }, [])

  // Procesar datos de manera más eficiente
  const processData = React.useCallback((rawData: any[][]) => {
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

    // Crear matriz de texto para hover
    const hoverMatrix = transposed.map((row, i) =>
      row.map((value, j) => {
        const logValue = value > 0 ? Math.log10(value) : -1
        return `Size: ${sizeLabels[j]}<br>` +
               `Position: ${positionLabels[i]}<br>` +
               `Value: ${value.toFixed(3)}<br>` +
               `Log10: ${logValue.toFixed(2)}`
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
        const filePath = `/data/${id}/analysis/${idReplicon}_hc_${part}.csv`
        console.log('Cargando archivo:', filePath)
        
        const response = await fetch(filePath)
        if (!response.ok) throw new Error('No se pudo cargar el archivo')

        Papa.parse(response.url, {
          download: true,
          header: false,
          worker: true,
          fastMode: true,
          complete: (results) => {
            console.log('Datos cargados:', results.data.length, 'filas')
            const processed = processData(results.data)
            
            setData(processed.logData)
            setOriginalData(processed.originalData)
            setXLabels(processed.xLabels)
            setYLabels(processed.yLabels)
            setTextMatrix(processed.textMatrix)
            setLoading(false)
          },
          error: (error) => {
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
  }, [id, idReplicon, part, processData])

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
import React, { useState, useEffect } from 'react'
import Plot from 'react-plotly.js'
import Papa from 'papaparse'

interface TotalPlotProps {
  id?: string
  idReplicon?: string
  part: string
}

interface TotalData {
  [key: string]: any
}

interface DatasetInfo {
  observedValue: number | null
  simulatedValues: number[]
  name: string
  color: string
}

const TotalPlot: React.FC<TotalPlotProps> = ({ id, idReplicon, part }) => {
  const [datasets, setDatasets] = useState<DatasetInfo[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id || !idReplicon) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const dataTypes = ['all', 'cod', 'non']
        const colors = ['#2ca02c', '#1f77b4', '#ff7f0e'] // verde, azul, naranja
        const datasetPromises = dataTypes.map(async (type, index) => {
          const filePath = `/data/${id}/analysis/${idReplicon}_ha_${type}.csv`
          console.log('Loading total data from:', filePath)
          
          try {
            const response = await fetch(filePath)
            if (!response.ok) {
              console.warn(`Could not load ${type} data:`, filePath)
              return null
            }

            return new Promise<DatasetInfo | null>((resolve) => {
              Papa.parse(response.url, {
                download: true,
                header: true,
                worker: true,
                complete: (results: any) => {
                  console.log(`${type} data loaded:`, results.data.length, 'rows')
                  
                  if (results.data && results.data.length > 0) {
                    // Filtrar filas vacías
                    const cleanData = results.data.filter((row: any) => 
                      row['IR count'] && row.origin
                    )
                    
                    // Separar valores observados y simulados
                    let obsValue: number | null = null
                    const simValues: number[] = []
                    
                    cleanData.forEach((row: any) => {
                      const irCount = parseFloat(row['IR count'])
                      if (!isNaN(irCount)) {
                        if (row.origin === 'obs') {
                          obsValue = irCount
                        } else if (row.origin === 'sim') {
                          simValues.push(irCount)
                        }
                      }
                    })
                    
                    resolve({
                      observedValue: obsValue,
                      simulatedValues: simValues,
                      name: type.toUpperCase(),
                      color: colors[index]
                    })
                  } else {
                    resolve(null)
                  }
                },
                error: () => resolve(null)
              })
            })
          } catch (err) {
            console.warn(`Error loading ${type} data:`, err)
            return null
          }
        })

        const results = await Promise.all(datasetPromises)
        const validDatasets = results.filter((dataset): dataset is DatasetInfo => dataset !== null)
        
        setDatasets(validDatasets)
        setLoading(false)
      } catch (err) {
        console.error('Error fetching total data:', err)
        setError(err instanceof Error ? err.message : 'Error desconocido')
        setLoading(false)
      }
    }

    fetchData()
  }, [id, idReplicon, part])

  if (!id || !idReplicon) return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p>Selecciona un elemento del ACP o de la tabla</p>
      <p>Archivos esperados: *_ha_all.csv, *_ha_cod.csv, *_ha_non.csv</p>
    </div>
  )

  if (loading) return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p>Cargando total plots...</p>
      <p>Archivos: /data/{id}/analysis/{idReplicon}_ha_*.csv</p>
    </div>
  )

  if (error) return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p>Error: {error}</p>
      <p>Archivos intentados: /data/{id}/analysis/{idReplicon}_ha_*.csv</p>
    </div>
  )

  if (datasets.length === 0) return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p>No hay datos disponibles para el total plot</p>
      <p>Datasets cargados: {datasets.map(d => d.name).join(', ')}</p>
      <p>Se esperan datos con columnas "IR count" y "origin"</p>
    </div>
  )

  // Preparar histogramas para cada dataset
  const traces: any[] = []
  const shapes: any[] = []
  const annotations: any[] = []

  datasets.forEach((dataset, index) => {
    if (dataset.simulatedValues.length > 0) {
      // Añadir histograma para valores simulados
      traces.push({
        x: dataset.simulatedValues,
        type: 'histogram',
        name: `${dataset.name} (sim)`,
        marker: {
          color: dataset.color,
          opacity: 0.7
        },
        nbinsx: 20,
        yaxis: `y${index === 0 ? '' : index + 1}`
      })

      // Añadir línea roja para valor observado si existe
      if (dataset.observedValue !== null) {
        shapes.push({
          type: 'line',
          x0: dataset.observedValue,
          x1: dataset.observedValue,
          y0: 0,
          y1: 1,
          yref: index === 0 ? 'paper' : `y${index + 1} domain`,
          line: {
            color: 'red',
            width: 2,
            dash: 'dash'
          }
        })

        annotations.push({
          x: dataset.observedValue,
          y: 0.9 - (index * 0.3), // Separar anotaciones verticalmente
          yref: 'paper',
          text: `${dataset.name} obs: ${dataset.observedValue}`,
          showarrow: true,
          arrowhead: 2,
          arrowcolor: 'red',
          arrowwidth: 1,
          font: { color: 'red', size: 10 },
          bgcolor: 'white',
          bordercolor: 'red',
          borderwidth: 1
        })
      }
    }
  })

  return (
    <Plot
      data={traces}
      layout={{
        title: `Total Plot - ${idReplicon}`,
        autosize: true,
        margin: { l: 50, r: 20, t: 60, b: 50 },
        xaxis: {
          title: 'IR count',
          titlefont: { size: 12 },
          tickfont: { size: 10 }
        },
        yaxis: {
          title: 'Frecuencia',
          titlefont: { size: 12 },
          tickfont: { size: 10 }
        },
        shapes: shapes,
        annotations: annotations,
        hoverlabel: {
          bgcolor: 'white',
          font: { size: 11 }
        },
        legend: {
          x: 1,
          y: 1,
          bgcolor: 'rgba(255,255,255,0.8)',
          bordercolor: 'rgba(0,0,0,0.2)',
          borderwidth: 1
        },
        barmode: 'overlay' // Para superponer histogramas
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

export default TotalPlot
import React, { useState, useEffect } from 'react'
import Plot from 'react-plotly.js'
import Papa from 'papaparse'

interface GapPlotProps {
  id?: string
  idReplicon?: string
  part: string
}

interface GapData {
  [key: string]: any
}

interface DatasetInfo {
  data: GapData[]
  name: string
  color: string
}

const GapPlot: React.FC<GapPlotProps> = ({ id, idReplicon, part }) => {
  const [datasets, setDatasets] = useState<DatasetInfo[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [availableColumns, setAvailableColumns] = useState<string[]>([])

  useEffect(() => {
    if (!id || !idReplicon) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const dataTypes = ['all', 'cod', 'non']
        const colors = ['#1f77b4', '#ff7f0e', '#2ca02c'] // azul, naranja, verde
        const datasetPromises = dataTypes.map(async (type, index) => {
          const filePath = `/data/${id}/analysis/${idReplicon}_hb_gap_${type}.csv`
          console.log('Loading gap data from:', filePath)
          
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
                      Object.values(row).some(value => value !== '' && value !== null && value !== undefined)
                    )
                    
                    resolve({
                      data: cleanData,
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
        
        // Obtener columnas de la primera dataset válida
        if (validDatasets.length > 0) {
          const firstData = validDatasets[0].data[0] || {}
          const columns = Object.keys(firstData).filter(col => {
            const sample = firstData[col]
            return !isNaN(parseFloat(sample)) && isFinite(sample)
          })
          setAvailableColumns(columns)
        }
        
        setLoading(false)
      } catch (err) {
        console.error('Error fetching gap data:', err)
        setError(err instanceof Error ? err.message : 'Error desconocido')
        setLoading(false)
      }
    }

    fetchData()
  }, [id, idReplicon, part])

  if (!id || !idReplicon) return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p>Selecciona un elemento del ACP o de la tabla</p>
      <p>Archivos esperados: *_hb_gap_all.csv, *_hb_gap_cod.csv, *_hb_gap_non.csv</p>
    </div>
  )

  if (loading) return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p>Cargando gap plots...</p>
      <p>Archivos: /data/{id}/analysis/{idReplicon}_hb_gap_*.csv</p>
    </div>
  )

  if (error) return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p>Error: {error}</p>
      <p>Archivos intentados: /data/{id}/analysis/{idReplicon}_hb_gap_*.csv</p>
    </div>
  )

  if (datasets.length === 0 || availableColumns.length < 2) return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p>No hay datos disponibles para el gap plot</p>
      <p>Datasets cargados: {datasets.map(d => d.name).join(', ')}</p>
      <p>Columnas disponibles: {availableColumns.join(', ')}</p>
    </div>
  )

  // Usar las primeras dos columnas numéricas disponibles
  const xColumn = availableColumns[0]
  const yColumn = availableColumns[1]

  // Crear traces para cada dataset
  const traces = datasets.map((dataset) => {
    const xValues = dataset.data.map((row: any) => parseFloat(row[xColumn])).filter((val: any) => !isNaN(val))
    const yValues = dataset.data.map((row: any) => parseFloat(row[yColumn])).filter((val: any) => !isNaN(val))
    
    const hoverText = dataset.data.map((row: any) => {
      const info = Object.keys(row)
        .filter(key => key !== xColumn && key !== yColumn)
        .slice(0, 3) // Mostrar solo las primeras 3 columnas adicionales
        .map(key => `${key}: ${row[key]}`)
        .join('<br>')
      
      return `${xColumn}: ${row[xColumn]}<br>${yColumn}: ${row[yColumn]}<br>Dataset: ${dataset.name}<br>${info}`
    })

    return {
      x: xValues,
      y: yValues,
      type: 'bar',
      marker: {
        color: dataset.color,
        opacity: 0.7
      },
      text: hoverText,
      hoverinfo: 'text',
      name: dataset.name
    }
  })

  return (
    <Plot
      data={traces}
      layout={{
        title: `Gap Plot - ${idReplicon}`,
        autosize: true,
        margin: { l: 50, r: 20, t: 40, b: 50 },
        xaxis: {
          title: xColumn,
          titlefont: { size: 12 },
          tickfont: { size: 10 }
        },
        yaxis: {
          title: yColumn,
          titlefont: { size: 12 },
          tickfont: { size: 10 }
        },
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
        barmode: 'group' // Barras agrupadas para mejor comparación
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

export default GapPlot
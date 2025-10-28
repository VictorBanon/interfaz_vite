import React, { useState, useEffect } from 'react'
import Plot from 'react-plotly.js'
import Papa from 'papaparse'

interface ArmPlotProps {
  id?: string
  idReplicon?: string
  name?: string
  part: string
}

interface ArmData {
  [key: string]: any
}

interface DatasetInfo {
  data: ArmData[]
  name: string
  color: string
}

const ArmPlot: React.FC<ArmPlotProps> = ({ id, idReplicon, name, part }) => {
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
        const colors = ['#ff7f0e', '#1f77b4', '#2ca02c'] // naranja, azul, verde
        const datasetPromises = dataTypes.map(async (type, index) => {
          const filePath = `/data/${id}/analysis/${idReplicon}_hb_arm_${type}.csv`
          console.log('Loading arm data from:', filePath)
          
          try {
            const response = await fetch(filePath)
            if (!response.ok) {
              console.warn(`Could not load ${type} data:`, filePath)
              return null
            }

            // Check if response is HTML (dev server returns HTML for missing files)
            const contentType = response.headers.get('content-type')
            const text = await response.text()
            
            if (contentType?.includes('text/html') || text.trim().startsWith('<!DOCTYPE html>') || text.trim().startsWith('<html')) {
              console.warn(`File not found (HTML response): ${filePath}`)
              return null
            }

            return new Promise<DatasetInfo | null>((resolve) => {
              Papa.parse(text, {
                header: true,
                worker: false,  // Use text instead of URL
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
            console.warn(`Error loading ${type} data from ${filePath}:`, err)
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
        console.error('Error fetching arm data:', err)
        setError(err instanceof Error ? err.message : 'Error desconocido')
        setLoading(false)
      }
    }

    fetchData()
  }, [id, idReplicon, part])

  if (!id || !idReplicon) return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p>Selecciona un elemento del ACP o de la tabla</p>
      <p>Archivos esperados: *_hb_arm_all.csv, *_hb_arm_cod.csv, *_hb_arm_non.csv</p>
    </div>
  )

  if (loading) return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h3>Loading arm analysis...</h3>
      {id && idReplicon && (
        <p>Loading arm plots for {name || id} ({part} analysis)</p>
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
      <h3 style={{ color: '#ff6b6b', margin: '0 0 10px 0' }}>⚠️ Arm Analysis Data Not Found</h3>
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
          <strong>Expected files:</strong> {id}/analysis/{idReplicon}_hb_arm_*.csv (all, cod, non)
        </div>
      )}
      <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '10px' }}>
        💡 <strong>Tip:</strong> These files contain arm analysis data for structural visualization.
      </div>
    </div>
  )

  if (datasets.length === 0 || availableColumns.length < 2) return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p>No hay datos disponibles para el arm plot</p>
      <p>Datasets cargados: {datasets.map(d => d.name).join(', ')}</p>
      <p>Columnas disponibles: {availableColumns.join(', ')}</p>
    </div>
  )

  // Usar las primeras dos columnas numéricas disponibles
  const xColumn = availableColumns[0]
  const yColumn = availableColumns[1]

  // Función para obtener nombres de display mejorados
  const getDisplayName = (columnName: string) => {
    if (!columnName) return columnName
    
    const lowerName = columnName.toLowerCase().trim()
    
    // Mapeo específico para términos científicos - más agresivo
    if (lowerName === 'position' || lowerName === 'pos' || lowerName.endsWith('position') || lowerName.includes('pos')) {
      return 'gap'
    }
    
    if (lowerName === 'size' || lowerName === 'length' || lowerName.includes('size') || lowerName.includes('length')) {
      return 'arm size'
    }
    
    if (lowerName.includes('start')) {
      return 'gap start'
    }
    
    if (lowerName.includes('end')) {
      return 'gap end'
    }
    
    return columnName
  }

  // Crear traces para cada dataset
  const traces = datasets.map((dataset) => {
    const xValues = dataset.data.map((row: any) => parseFloat(row[xColumn])).filter((val: any) => !isNaN(val))
    const yValues = dataset.data.map((row: any) => parseFloat(row[yColumn])).filter((val: any) => !isNaN(val))
    
    const hoverText = dataset.data.map((row: any) => {
      const info = Object.keys(row)
        .filter(key => key !== xColumn && key !== yColumn)
        .slice(0, 3) // Mostrar solo las primeras 3 columnas adicionales
        .map(key => `${getDisplayName(key)}: ${row[key]}`)
        .join('<br>')
      
      return `${getDisplayName(xColumn)}: ${row[xColumn]}<br>${getDisplayName(yColumn)}: ${row[yColumn]}<br>Dataset: ${dataset.name}<br>${info}`
    })

    return {
      x: xValues,
      y: yValues,
      type: 'bar' as const,
      marker: {
        color: dataset.color,
        opacity: 0.7
      },
      text: hoverText,
      hoverinfo: 'text' as const,
      name: dataset.name
    }
  })

  return (
    <Plot
      data={traces}
      layout={{
        title: { text: `Arm Plot - ${name || idReplicon} ${idReplicon && name ? `(${idReplicon})` : ''}` },
        autosize: true,
        margin: { l: 50, r: 20, t: 40, b: 50 },
        xaxis: {
          title: { text: getDisplayName(xColumn) },
          tickfont: { size: 10 }
        },
        yaxis: {
          title: { text: getDisplayName(yColumn) },
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

export default ArmPlot
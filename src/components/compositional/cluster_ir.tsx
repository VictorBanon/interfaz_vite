import React, { useState, useEffect, useMemo } from 'react'
import Papa from 'papaparse'
import '../table/Table.css'
import { TAXONOMIC_COLUMNS } from '../../utils/constants.ts'

interface ClusterData {
  string: string
  cluster_id: number
  'ID-replicon': string
  species: string
}

interface ClusterIRProps {
  taxon?: string
  taxonValue?: string
}

// Función para construir la ruta del archivo cluster IR
const buildClusterIRFilePath = async (taxon: string, taxonValue: string) => {
  try {
    // Cargar los datos de taxonomía
    const response = await fetch('/data/taxonomy.csv')
    if (!response.ok) {
      throw new Error(`Could not load taxonomy file (HTTP ${response.status})`)
    }
    
    const text = await response.text()
    
    // Check if the response is actually HTML (happens when file doesn't exist in dev server)
    if (text.trim().toLowerCase().startsWith('<!doctype html>') || text.trim().toLowerCase().startsWith('<html')) {
      throw new Error('Taxonomy file not found. The server returned HTML instead of CSV data.')
    }
    
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',')
    
    // Definir el orden jerárquico de las columnas taxonómicas
    const hierarchyOrder = TAXONOMIC_COLUMNS
    
    // Encontrar el índice del taxón seleccionado
    const taxonIndex = hierarchyOrder.indexOf(taxon)
    if (taxonIndex === -1) {
      throw new Error(`Taxón no válido: ${taxon}`)
    }
    
    // Obtener la jerarquía hasta el taxón seleccionado
    const relevantHierarchy = hierarchyOrder.slice(0, taxonIndex + 1)
    
    // Encontrar los índices de las columnas relevantes
    const columnIndices: { [key: string]: number } = {}
    relevantHierarchy.forEach(col => {
      columnIndices[col] = headers.indexOf(col)
    })
    
    // Buscar la fila que coincide con el taxonValue
    let hierarchyValues: { [key: string]: string } | null = null
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',')
      const targetColumnIndex = columnIndices[taxon]
      if (values[targetColumnIndex] === taxonValue) {
        // Extraer todos los valores de la jerarquía para esta fila
        hierarchyValues = {}
        relevantHierarchy.forEach(col => {
          const colIndex = columnIndices[col]
          hierarchyValues![col] = values[colIndex]
        })
        break
      }
    }
    
    if (!hierarchyValues) {
      throw new Error(`No se encontró el valor ${taxonValue} en la columna ${taxon}`)
    }
    
    // Construir la ruta de la carpeta jerárquica
    const folderPath = relevantHierarchy.map(level => hierarchyValues![level]).join('/')
    
    // Construir el nombre del archivo
    const fileName = `cluster_IR_${taxonValue}_all.csv`
    
    // Ruta completa
    const fullPath = `/data/philogenie/${folderPath}/${fileName}`
    
    return fullPath
    
  } catch (error) {
    console.error('Error construyendo ruta Cluster IR:', error)
    // Ruta por defecto en caso de error
    return `/data/philogenie/Bacteria/cluster_IR_Bacteria_all.csv`
  }
}

const ClusterIR: React.FC<ClusterIRProps> = ({ taxon = 'superkingdom', taxonValue = 'Bacteria' }) => {
  const [data, setData] = useState<ClusterData[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [generalFilter, setGeneralFilter] = useState<string>('')
  const [clusterFilter, setClusterFilter] = useState<string>('')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [currentCsvPath, setCurrentCsvPath] = useState<string>('')
  const [rowsPerPage, setRowsPerPage] = useState<number>(10)

  // Efecto para calcular el número de filas automáticamente
  useEffect(() => {
    const calculateRowsPerPage = () => {
      const tableContainer = document.querySelector('.table-container')
      
      if (tableContainer) {
        const containerHeight = tableContainer.clientHeight
        const rowHeight = 21 // Altura de cada fila de datos (20px + 1px border)
        const headerHeight = 26 // Altura fija del header (25px + 1px border)
        const minReservedSpace = 2 // Espacio mínimo para evitar cortes
        
        const availableHeight = containerHeight - headerHeight - minReservedSpace
        const calculatedRows = Math.floor(availableHeight / rowHeight)
        
        setRowsPerPage(Math.max(1, calculatedRows))
      }
    }

    // Calcular al montar el componente
    setTimeout(calculateRowsPerPage, 200) // Más tiempo para que el DOM esté listo

    // Recalcular al redimensionar la ventana
    window.addEventListener('resize', calculateRowsPerPage)
    return () => window.removeEventListener('resize', calculateRowsPerPage)
  }, [])

  // Construir ruta dinámica cuando cambien los parámetros
  useEffect(() => {
    const updateCsvPath = async () => {
      if (taxon && taxonValue) {
        try {
          const dynamicPath = await buildClusterIRFilePath(taxon, taxonValue)
          setCurrentCsvPath(dynamicPath)
        } catch (error) {
          console.error('Error building dynamic path:', error)
          // Usar ruta por defecto si hay error
          setCurrentCsvPath(`/data/philogenie/Bacteria/cluster_IR_Bacteria_all.csv`)
        }
      }
    }
    
    updateCsvPath()
  }, [taxon, taxonValue])

  // Cargar datos cuando cambie la ruta del CSV
  useEffect(() => {
    if (!currentCsvPath) return
    
    const loadClusterData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // Leer el archivo manualmente primero
        const response = await fetch(currentCsvPath)
        if (!response.ok) {
          throw new Error(`File not found: ${currentCsvPath} (HTTP ${response.status})`)
        }
        
        const text = await response.text()
        
        // Check if the response is actually HTML (happens when file doesn't exist in dev server)
        if (text.trim().toLowerCase().startsWith('<!doctype html>') || text.trim().toLowerCase().startsWith('<html')) {
          throw new Error(`Cluster IR file not found: ${currentCsvPath}. The server returned HTML instead of CSV data.`)
        }
        
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          delimiter: ',',
          quoteChar: '"',
          complete: (result: any) => {
            if (result.errors.length > 0) {
              console.error('Errores al parsear CSV:', result.errors)
            }
            
            // Procesar los datos
            const processedData = result.data.map((row: any) => {
              return {
                string: row.string || '',
                cluster_id: parseInt(row.cluster_id, 10) || 0,
                'ID-replicon': row['ID-replicon'] || '',
                species: row.Species || row.species || ''  // Try both capital and lowercase
              }
            }) as ClusterData[]
            setData(processedData)
            setCurrentPage(1)
            setLoading(false)
            
            // Recalcular filas después de cargar datos
            setTimeout(() => {
              const calculateRowsPerPage = () => {
                const tableContainer = document.querySelector('.table-container')
                
                if (tableContainer) {
                  const containerHeight = tableContainer.clientHeight
                  const rowHeight = 21 // Altura de cada fila de datos (20px + 1px border)
                  const headerHeight = 26 // Altura fija del header (25px + 1px border)
                  const minReservedSpace = 2 // Espacio mínimo para evitar cortes
                  
                  const availableHeight = containerHeight - headerHeight - minReservedSpace
                  const calculatedRows = Math.floor(availableHeight / rowHeight)
                  
                  setRowsPerPage(Math.max(1, calculatedRows))
                }
              }
              calculateRowsPerPage()
            }, 200)
          },
          error: (err: any) => {
            setError(`Error al cargar el archivo CSV: ${err.message}`)
            setLoading(false)
          }
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
        setLoading(false)
      }
    }

    loadClusterData()
  }, [currentCsvPath])

  // Filtrar datos
  const filteredData = useMemo(() => {
    return data.filter(row => {
      // Aplicar filtro general
      const matchesGeneral = generalFilter === '' || 
        row.string.toLowerCase().includes(generalFilter.toLowerCase()) ||
        row.cluster_id.toString().includes(generalFilter) ||
        row['ID-replicon'].toLowerCase().includes(generalFilter.toLowerCase()) ||
        row.species.toLowerCase().includes(generalFilter.toLowerCase())

      // Aplicar filtro de cluster específico
      const matchesCluster = clusterFilter === '' || 
        row.cluster_id.toString() === clusterFilter

      return matchesGeneral && matchesCluster
    })
  }, [data, generalFilter, clusterFilter])

  // Paginación
  const totalPages = Math.ceil(filteredData.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const currentData = filteredData.slice(startIndex, startIndex + rowsPerPage)

  // Obtener clusters únicos para el filtro
  const uniqueClusters = useMemo(() => {
    const clusters = Array.from(new Set(data.map(row => row.cluster_id))).sort((a, b) => a - b)
    return clusters
  }, [data])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Función para generar botones de paginación limitados
  const getPaginationButtons = () => {
    const maxButtons = 7 // Máximo 7 botones
    const buttons = []
    
    if (totalPages <= maxButtons) {
      // Si hay pocas páginas, mostrar todas
      for (let i = 1; i <= totalPages; i++) {
        buttons.push(i)
      }
    } else {
      // Lógica para páginas limitadas
      const startPage = Math.max(1, currentPage - 2)
      const endPage = Math.min(totalPages, currentPage + 2)
      
      if (startPage > 1) {
        buttons.push(1)
        if (startPage > 2) buttons.push('...')
      }
      
      for (let i = startPage; i <= endPage; i++) {
        buttons.push(i)
      }
      
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) buttons.push('...')
        buttons.push(totalPages)
      }
    }
    
    return buttons
  }

  // Función para calcular el número máximo de caracteres por columna
  const calculateMaxCharsPerColumn = (): number => {
    const tableContainer = document.querySelector('.table-container')
    if (!tableContainer || data.length === 0) return 10
    
    const containerWidth = tableContainer.clientWidth
    const numColumns = 4 // string, cluster_id, ID-replicon, species
    const columnWidth = containerWidth / numColumns
    // Estimando ~5px por carácter con el nuevo tamaño de fuente reducido
    const maxChars = Math.floor((columnWidth - 15) / 5) // 15px para padding y bordes
    return Math.max(10, maxChars) // Mínimo 10 caracteres
  }

  // Función para truncar texto dinámicamente
  const truncateText = (text: string, maxLength?: number): string => {
    const dynamicMaxLength = maxLength || calculateMaxCharsPerColumn()
    if (text.length <= dynamicMaxLength) return text
    return text.substring(0, dynamicMaxLength) + '...'
  }

  if (loading) {
    return (
      <div className="csv-window">
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h3>Loading cluster IR data...</h3>
          <p>Loading {taxonValue} clusters for {taxon} analysis...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="csv-window">
        <div style={{
          backgroundColor: '#4a1a1a',
          border: '1px solid #cc4444',
          borderRadius: '8px',
          padding: '16px',
          margin: '16px',
          color: '#ffffff'
        }}>
          <h3 style={{ color: '#ff6b6b', margin: '0 0 10px 0' }}>⚠️ Cluster IR Data Not Found</h3>
          <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>
            {error}
          </p>
          <div style={{ 
            fontSize: '0.8rem', 
            color: '#999',
            marginTop: '10px',
            padding: '10px',
            backgroundColor: '#2a2a2a',
            borderRadius: '4px'
          }}>
            <strong>Taxon:</strong> {taxon}<br/>
            <strong>Value:</strong> {taxonValue}<br/>
            <strong>Expected file:</strong> /data/philogenie/{taxonValue}/cluster_IR_{taxonValue}_all.csv
          </div>
          <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '10px' }}>
            💡 <strong>Tip:</strong> This file contains cluster analysis data for compositional studies.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="csv-window">
      <div className="table-header">
        <h3>Clusters IR - {taxonValue} ({taxon})</h3>
        <div className="controls">
          <input
            type="text"
            placeholder="Filtro general..."
            value={generalFilter}
            onChange={(e) => setGeneralFilter(e.target.value)}
            className="general-filter"
          />
          <select
            value={clusterFilter}
            onChange={(e) => setClusterFilter(e.target.value)}
            className="cluster-filter"
          >
            <option value="">Todos los clusters</option>
            {uniqueClusters.map(clusterId => (
              <option key={clusterId} value={clusterId.toString()}>
                Cluster {clusterId}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {data.length === 0 ? (
        <div className="empty-state">
          <p>No hay datos de clusters IR disponibles</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="csv-table">
              <thead>
                <tr>
                  <th>String</th>
                  <th>Cluster ID</th>
                  <th>ID-replicon</th>
                  <th>Species</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((row, index) => (
                  <tr key={index}>
                    <td title={row.string}>
                      {truncateText(row.string)}
                    </td>
                    <td title={row.cluster_id.toString()}>
                      {truncateText(row.cluster_id.toString())}
                    </td>
                    <td title={row['ID-replicon']}>
                      {truncateText(row['ID-replicon'])}
                    </td>
                    <td title={row.species}>
                      {truncateText(row.species)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="pagination">
              <span>Total: {filteredData.length} registros</span>
              {getPaginationButtons().map((page, index) => (
                <button
                  key={index}
                  className={
                    typeof page === 'number' && currentPage === page ? 'active' : 
                    typeof page === 'string' ? 'dots' : ''
                  }
                  onClick={() => typeof page === 'number' && handlePageChange(page)}
                  disabled={typeof page === 'string'}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ClusterIR

import React, { useState, useEffect, useMemo } from 'react'
import Papa from 'papaparse'
import './Table.css'

// Añadir nueva interfaz para el estado del popup
interface PopupState {
  column: string | null
  position: { x: number; y: number }
}

interface SortState {
  column: string | null
  direction: 'asc' | 'desc' | null
}

interface CSVWindowProps {
  onRowClick: (row: any) => void
}

const CSVWindow: React.FC<CSVWindowProps> = ({ onRowClick }) => {
  const [data, setData] = useState<any[]>([])
  const [filters, setFilters] = useState<{ [key: string]: string }>({})
  const [generalFilter, setGeneralFilter] = useState<string>('')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [popup, setPopup] = useState<PopupState>({ column: null, position: { x: 0, y: 0 } })
  const [sortState, setSortState] = useState<SortState>({ column: null, direction: null })
  const [rowsPerPage, setRowsPerPage] = useState<number>(10)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

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
        
        const finalRows = Math.max(1, calculatedRows)
        
        console.log('Cálculo optimizado:', {
          containerHeight,
          headerHeight,
          minReservedSpace,
          availableHeight,
          rowHeight,
          calculatedRows: finalRows
        })
        
        // Establecer variable CSS para distribución uniforme
        const tableElement = document.querySelector('.csv-table')
        if (tableElement) {
          (tableElement as HTMLElement).style.setProperty('--rows-count', finalRows.toString())
        }
        
        setRowsPerPage(finalRows)
      }
    }

    setTimeout(calculateRowsPerPage, 200) // Más tiempo para que el DOM esté listo
    window.addEventListener('resize', calculateRowsPerPage)
    return () => window.removeEventListener('resize', calculateRowsPerPage)
  }, [])

  // Load default CSV on mount
  useEffect(() => {
    const defaultCsvPath = '/data/taxonomy.csv'
    setLoading(true)
    setError(null)
    
    Papa.parse(defaultCsvPath, {
      header: true,
      download: true,
      skipEmptyLines: true,
      complete: (result) => {
        setData(result.data)
        setLoading(false)
      },
      error: (err) => {
        console.error(`Error loading default CSV from ${defaultCsvPath}:`, err)
        setError(`Could not load taxonomy data: ${err.message || 'Unknown error'}`)
        setLoading(false)
      }
    })
  }, [])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          setData(result.data)
        },
      })
    }
  }

  // Obtener valores únicos para cada columna basado en los datos ya filtrados por otras columnas
  const getUniqueValues = (currentColumn: string, allData: any[]) => {
    // Filtrar los datos usando todos los filtros excepto el de la columna actual
    const dataFilteredByOtherColumns = allData.filter(row => {
      return Object.entries(filters).every(([column, value]) => {
        if (column === currentColumn) return true // Ignorar el filtro de la columna actual
        return value ? row[column]?.toString() === value : true
      })
    })

    // Obtener valores únicos de la columna actual desde los datos filtrados
    const values = new Set(dataFilteredByOtherColumns.map(row => row[currentColumn]))
    return Array.from(values).filter(Boolean).sort()
  }

  // Filtrar y ordenar datos basado en todos los filtros
  const filteredData = useMemo(() => {
    let filtered = data.filter(row => {
      // Aplicar filtro general
      const matchesGeneral = generalFilter === '' || 
        Object.values(row).some(value => 
          value?.toString().toLowerCase().includes(generalFilter.toLowerCase())
        )

      // Aplicar filtros de columna
      const matchesColumns = Object.entries(filters).every(([key, value]) =>
        value ? row[key]?.toString() === value : true
      )

      return matchesGeneral && matchesColumns
    })

    // Aplicar ordenamiento si está configurado
    if (sortState.column && sortState.direction) {
      filtered = filtered.sort((a, b) => {
        const aVal = a[sortState.column!]?.toString() || ''
        const bVal = b[sortState.column!]?.toString() || ''
        
        const comparison = aVal.localeCompare(bVal, undefined, { numeric: true })
        return sortState.direction === 'asc' ? comparison : -comparison
      })
    }

    return filtered
  }, [data, filters, generalFilter, sortState])

  // Obtener datos paginados
  const totalPages = Math.ceil(filteredData.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const currentData = filteredData.slice(startIndex, startIndex + rowsPerPage)

  const handleFilterChange = (column: string, value: string) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      [column]: value === 'todos' ? '' : value
    }))
    setCurrentPage(1) // Resetear la página al cambiar un filtro
    setPopup({ column: null, position: { x: 0, y: 0 } }) // Cerrar popup
  }

  const handleSort = (column: string) => {
    setSortState(prevSort => {
      if (prevSort.column === column) {
        // Si ya está ordenando por esta columna, cambiar dirección
        const newDirection = prevSort.direction === 'asc' ? 'desc' : 'asc'
        return { column, direction: newDirection }
      } else {
        // Nueva columna, empezar con ascendente
        return { column, direction: 'asc' }
      }
    })
    setPopup({ column: null, position: { x: 0, y: 0 } }) // Cerrar popup
  }

  const clearFilter = (column: string) => {
    setFilters(prevFilters => {
      const newFilters = { ...prevFilters }
      delete newFilters[column]
      return newFilters
    })
    setCurrentPage(1)
    setPopup({ column: null, position: { x: 0, y: 0 } })
  }

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
    const numColumns = Object.keys(data[0]).length
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

  const handleColumnClick = (event: React.MouseEvent, column: string) => {
    event.stopPropagation()
    console.log('Column clicked:', column)
    const rect = event.currentTarget.getBoundingClientRect()
    const newPopup = {
      column: popup.column === column ? null : column,
      position: { x: rect.left, y: rect.bottom }
    }
    console.log('Setting popup:', newPopup)
    setPopup(newPopup)
  }

  // Cerrar popup al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = () => {
      setPopup({ column: null, position: { x: 0, y: 0 } })
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  if (loading) {
    return (
      <div className="csv-window">
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h3>Loading taxonomy data...</h3>
          <p>Please wait while we load the organism data.</p>
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
          <h3 style={{ color: '#ff6b6b', margin: '0 0 10px 0' }}>⚠️ Taxonomy Data Not Found</h3>
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
            <strong>Expected file:</strong> /data/taxonomy.csv<br/>
            This file contains the list of organisms available for analysis.
          </div>
          <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '10px' }}>
            💡 <strong>Tip:</strong> Make sure the taxonomy.csv file is available in the /data/ directory.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="csv-window">
      <div className="controls">
        <input 
          type="file" 
          accept=".csv"
          onChange={handleFileUpload}
          className="file-input"
        />
        <input
          type="text"
          placeholder="Filtro general..."
          value={generalFilter}
          onChange={(e) => setGeneralFilter(e.target.value)}
          className="general-filter"
        />
      </div>
      <div className="table-container">
        <table className="csv-table">
          <thead>
            <tr>
              {data.length > 0 &&
                Object.keys(data[0]).map((key) => (
                  <th key={key}>
                    <div
                      className="column-header"
                      onClick={(e) => handleColumnClick(e, key)}
                    >
                      <span className="column-name">{key}</span>
                      <div className="column-indicators">
                        {sortState.column === key && (
                          <span className="sort-indicator">
                            {sortState.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                        {filters[key] && <span className="filter-indicator">•</span>}
                      </div>
                    </div>
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {currentData.map((row, index) => (
              <tr 
                key={index} 
                onClick={() => {
                  console.log('Fila seleccionada:', row)
                  onRowClick(row)
                }}
                style={{ cursor: 'pointer' }}
              >
                {Object.values(row).map((value, i) => {
                  const valueStr = value?.toString() || ''
                  return (
                    <td key={i} title={valueStr}>
                      {truncateText(valueStr)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pagination">
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

      {/* Popup de filtros y ordenamiento */}
      {popup.column && (
        <div
          className="column-popup"
          style={{
            position: 'fixed',
            left: popup.position.x,
            top: popup.position.y,
            zIndex: 99999
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="popup-content">
            <div className="popup-header">
              <strong>{popup.column}</strong>
              <button 
                className="close-popup"
                onClick={() => setPopup({ column: null, position: { x: 0, y: 0 } })}
              >
                ×
              </button>
            </div>
            
            <div className="popup-actions">
              {/* Ordenamiento */}
              <button
                className={`sort-btn ${sortState.column === popup.column && sortState.direction === 'asc' ? 'active' : ''}`}
                onClick={() => handleSort(popup.column!)}
              >
                ↑ Ordenar A-Z
              </button>
              <button
                className={`sort-btn ${sortState.column === popup.column && sortState.direction === 'desc' ? 'active' : ''}`}
                onClick={() => handleSort(popup.column!)}
              >
                ↓ Ordenar Z-A
              </button>
              
              {/* Limpiar filtro si existe */}
              {filters[popup.column] && (
                <button
                  className="clear-filter-btn"
                  onClick={() => clearFilter(popup.column!)}
                >
                  Limpiar filtro
                </button>
              )}
            </div>

            {/* Lista de valores únicos */}
            <div className="filter-values">
              <div className="filter-option">
                <label>
                  <input
                    type="radio"
                    name={`filter-${popup.column}`}
                    value=""
                    checked={!filters[popup.column]}
                    onChange={() => handleFilterChange(popup.column!, '')}
                  />
                  <span>Todos ({filteredData.length})</span>
                </label>
              </div>
              
              {getUniqueValues(popup.column, data).map((value, index) => {
                // Contar cuántos elementos tienen este valor después de aplicar otros filtros
                const countWithThisValue = data.filter(row => {
                  const matchesThisValue = row[popup.column!]?.toString() === value
                  const matchesOtherFilters = Object.entries(filters).every(([col, filterVal]) => {
                    if (col === popup.column) return true
                    return filterVal ? row[col]?.toString() === filterVal : true
                  })
                  const matchesGeneral = generalFilter === '' || 
                    Object.values(row).some(val => 
                      val?.toString().toLowerCase().includes(generalFilter.toLowerCase())
                    )
                  return matchesThisValue && matchesOtherFilters && matchesGeneral
                }).length

                return (
                  <div key={index} className="filter-option">
                    <label>
                      <input
                        type="radio"
                        name={`filter-${popup.column}`}
                        value={value}
                        checked={filters[popup.column!] === value}
                        onChange={() => handleFilterChange(popup.column!, value)}
                      />
                      <span>{value} ({countWithThisValue})</span>
                    </label>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CSVWindow

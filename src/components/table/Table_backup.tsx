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
  const rowsPerPage = 10

  // Load default CSV on mount
  useEffect(() => {
    const defaultCsvPath = '/data/taxonomy.csv'
    Papa.parse(defaultCsvPath, {
      header: true,
      download: true,
      skipEmptyLines: true,
      complete: (result) => {
        setData(result.data)
      },
      error: (err) => console.error('Error loading default CSV:', err)
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

  const handleColumnClick = (event: React.MouseEvent, column: string) => {
    event.stopPropagation()
    const rect = event.currentTarget.getBoundingClientRect()
    setPopup({
      column: popup.column === column ? null : column,
      position: { x: rect.left, y: rect.bottom }
    })
  }

  // Cerrar popup al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = () => {
      setPopup({ column: null, position: { x: 0, y: 0 } })
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

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
                {Object.values(row).map((value, i) => (
                  <td key={i}>{value?.toString() || ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        {Array.from({ length: totalPages }, (_, index) => (
          <button
            key={index + 1}
            className={currentPage === index + 1 ? 'active' : ''}
            onClick={() => handlePageChange(index + 1)}
          >
            {index + 1}
          </button>
        ))}
      </div>

      {/* Popup de filtros y ordenamiento */}
      {popup.column && (
        <div
          className="column-popup"
          style={{
            position: 'absolute',
            left: popup.position.x,
            top: popup.position.y,
            zIndex: 1000
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

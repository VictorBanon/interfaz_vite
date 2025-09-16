import React, { useState, useEffect, useMemo } from 'react'
import Papa from 'papaparse'
import './Table.css'

// Añadir nueva interfaz para el estado del popup
interface PopupState {
  column: string | null
  position: { x: number; y: number }
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

  // Filtrar datos basado en todos los filtros
  const filteredData = useMemo(() => {
    return data.filter(row => {
      // Aplicar filtro general
      const matchesGeneral = generalFilter === '' || 
        Object.values(row).some(value => 
          value.toString().toLowerCase().includes(generalFilter.toLowerCase())
        )

      // Aplicar filtros de columna
      const matchesColumns = Object.entries(filters).every(([key, value]) =>
        value ? row[key]?.toString() === value : true
      )

      return matchesGeneral && matchesColumns
    })
  }, [data, filters, generalFilter])

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
                      {key}
                      {filters[key] && <span className="filter-indicator">•</span>}
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
                  <td key={i}>{value}</td>
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
    </div>
  )
}

export default CSVWindow

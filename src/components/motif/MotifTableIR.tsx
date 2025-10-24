import React, { useState, useEffect, useMemo } from 'react'
import Papa from 'papaparse'
import '../table/Table.css'

interface IRData {
  motif_complete: string
  count: number
  ir_start_concat: string
}

interface MotifTableIRProps {
  selectedOrganism: any | null
  onRowClick?: (row: IRData | null) => void
}

const MotifTableIR: React.FC<MotifTableIRProps> = ({ selectedOrganism, onRowClick }) => {
  const [data, setData] = useState<IRData[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [filters] = useState<{ [key: string]: string }>({})
  const [generalFilter, setGeneralFilter] = useState<string>('')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [rowsPerPage, setRowsPerPage] = useState<number>(10)
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null)

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

    setTimeout(calculateRowsPerPage, 200) // Más tiempo para que el DOM esté listo
    window.addEventListener('resize', calculateRowsPerPage)
    return () => window.removeEventListener('resize', calculateRowsPerPage)
  }, [])

  // Efecto para cargar el CSV cuando cambia el organismo seleccionado
  useEffect(() => {
    if (!selectedOrganism) {
      setData([])
      setSelectedRowIndex(null) // Reset selection when organism changes
      return
    }

    const loadIRData = async () => {
      setLoading(true)
      setError(null)
      
      const assemblyId = selectedOrganism.ID || selectedOrganism.id
      const repliconId = selectedOrganism['ID-replicon']
      
      if (!assemblyId || !repliconId) {
        setError('Could not identify sample ID or replicon ID')
        setLoading(false)
        return
      }

      const csvPath = `/data/${assemblyId}/analysis/${repliconId}_rich_ir.csv`
      
      try {
        const response = await fetch(csvPath)
        if (!response.ok) {
          throw new Error(`File not found: ${csvPath} (HTTP ${response.status})`)
        }
        
        const csvText = await response.text()
        
        // Check if the response is actually HTML (happens when file doesn't exist in dev server)
        if (csvText.trim().toLowerCase().startsWith('<!doctype html>') || csvText.trim().toLowerCase().startsWith('<html')) {
          setError(`IR data file not found: ${csvPath}. The server returned HTML instead of CSV data.`)
          setLoading(false)
          return
        }
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (result: any) => {
            if (result.errors.length > 0) {
              console.error('Errores al parsear CSV:', result.errors)
            }
            
            const processedData = result.data.map((row: any) => ({
              ...row,
              count: parseInt(row.count, 10) || 0
            })) as IRData[]
            
            setData(processedData)
            setCurrentPage(1)
            setSelectedRowIndex(null) // Reset selection when new data loads
            setLoading(false)
          },
          error: (err: any) => {
            setError(`Error parsing CSV file ${csvPath}: ${err.message}`)
            setLoading(false)
          }
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : `Unknown error loading file: ${csvPath}`)
        setLoading(false)
      }
    }

    loadIRData()
  }, [selectedOrganism])

  const filteredData = useMemo(() => {
    return data.filter(row => {
      const matchesGeneral = generalFilter === '' || 
        Object.values(row).some(value => 
          value.toString().toLowerCase().includes(generalFilter.toLowerCase())
        )

      const matchesColumns = Object.entries(filters).every(([key, value]) =>
        value ? row[key as keyof IRData]?.toString() === value : true
      )

      return matchesGeneral && matchesColumns
    })
  }, [data, filters, generalFilter])

  const totalPages = Math.ceil(filteredData.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const currentData = filteredData.slice(startIndex, startIndex + rowsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleRowClick = (row: IRData, rowIndex: number) => {
    const globalRowIndex = (currentPage - 1) * rowsPerPage + rowIndex;
    
    if (selectedRowIndex === globalRowIndex) {
      // Si es la misma fila, toggle (deseleccionar)
      setSelectedRowIndex(null);
      onRowClick && onRowClick(null); // Pasar null para limpiar marcadores
    } else {
      // Seleccionar nueva fila
      setSelectedRowIndex(globalRowIndex);
      onRowClick && onRowClick(row);
    }
  };

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
    const numColumns = 2 // motif_complete, count
    const columnWidth = containerWidth / numColumns
    // Estimando ~5px por carácter con el nuevo tamaño de fuente reducido
    const maxChars = Math.floor((columnWidth - 15) / 5) // 15px para padding y bordes
    return Math.max(10, maxChars) // Mínimo 10 caracteres
  }

  // Función para truncar texto dinámicamente
  const truncateText = (text: string | undefined | null, maxLength?: number): string => {
    if (!text || typeof text !== 'string') return '';
    const dynamicMaxLength = maxLength || calculateMaxCharsPerColumn()
    if (text.length <= dynamicMaxLength) return text
    return text.substring(0, dynamicMaxLength) + '...'
  }

  if (!selectedOrganism) {
    return (
      <div className="csv-window">
        <div className="empty-state">
          <p>Selecciona un organismo de la tabla principal para ver los datos IR</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="csv-window">
        <div className="loading-state">
          <p>Cargando datos IR...</p>
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
          <h3 style={{ color: '#ff6b6b', margin: '0 0 10px 0' }}>⚠️ IR Data Not Found</h3>
          <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>
            {error}
          </p>
          {selectedOrganism && (
            <div style={{ 
              fontSize: '0.8rem', 
              color: '#999',
              marginTop: '10px',
              padding: '10px',
              backgroundColor: '#2a2a2a',
              borderRadius: '4px'
            }}>
              <strong>Organism:</strong> <em>{selectedOrganism.genus} {selectedOrganism.species}</em> ({selectedOrganism.ID})<br/>
              <strong>Replicon:</strong> {selectedOrganism['ID-replicon']}<br/>
              <strong>Expected file:</strong> {selectedOrganism.ID}/analysis/{selectedOrganism['ID-replicon']}_rich_ir.csv
            </div>
          )}
          <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '10px' }}>
            💡 <strong>Tip:</strong> This file contains inverted repeat motif data for the selected organism.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="csv-window">
      <div className="table-header">
        <h3>Datos IR - {selectedOrganism.genus} {selectedOrganism.species} ({selectedOrganism.ID})</h3>
        <div className="controls">
          <input
            type="text"
            placeholder="Filtro general..."
            value={generalFilter}
            onChange={(e) => setGeneralFilter(e.target.value)}
            className="general-filter"
          />
        </div>
      </div>
      
      {data.length === 0 ? (
        <div className="empty-state">
          <p>No hay datos IR disponibles para esta muestra</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="csv-table">
              <thead>
                <tr>
                  <th>Motif Complete</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((row, index) => {
                  const globalRowIndex = (currentPage - 1) * rowsPerPage + index;
                  const isSelected = selectedRowIndex === globalRowIndex;
                  
                  return (
                    <tr 
                      key={index}
                      onClick={() => handleRowClick(row, index)}
                      style={{ 
                        cursor: onRowClick ? 'pointer' : 'default',
                        backgroundColor: isSelected ? '#e3f2fd' : 'transparent',
                        borderLeft: isSelected ? '4px solid #2196f3' : '4px solid transparent'
                      }}
                    >
                      <td title={row.motif_complete}>
                        {truncateText(row.motif_complete)}
                      </td>
                      <td title={row.count.toString()}>
                        {truncateText(row.count.toString())}
                      </td>
                    </tr>
                  );
                })}
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

export default MotifTableIR
import React, { useState, useEffect, useMemo } from 'react'
import Papa from 'papaparse'
import '../table/Table.css'

interface IRData {
  motif_complete: string
  count: number
}

interface TableIRProps {
  selectedRow: any | null
}

const TableIR: React.FC<TableIRProps> = ({ selectedRow }) => {
  const [data, setData] = useState<IRData[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const filters: { [key: string]: string } = {}
  const [generalFilter, setGeneralFilter] = useState<string>('')
  const [currentPage, setCurrentPage] = useState<number>(1)
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

    setTimeout(calculateRowsPerPage, 200) // Más tiempo para que el DOM esté listo
    window.addEventListener('resize', calculateRowsPerPage)
    return () => window.removeEventListener('resize', calculateRowsPerPage)
  }, [])

  // Efecto para cargar el CSV cuando cambia la fila seleccionada
  useEffect(() => {
    if (!selectedRow) {
      setData([])
      return
    }

    const loadIRData = async () => {
      setLoading(true)
      setError(null)
      
      const assemblyId = selectedRow.ID || selectedRow.id
      const repliconId = selectedRow['ID-replicon']
      
      if (!assemblyId || !repliconId) {
        setError('No se pudo identificar el ID de la muestra o del replicón')
        setLoading(false)
        return
      }

      const csvPath = `/data/${assemblyId}/analysis/${repliconId}_rich_ir.csv`
      
      try {
        const response = await fetch(csvPath)
        if (!response.ok) {
          throw new Error(`No se pudo cargar el archivo: ${csvPath}`)
        }
        
        const csvText = await response.text()
        
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
            setLoading(false)
          },
          error: (err: any) => {
            setError(`Error al parsear el archivo CSV: ${err.message}`)
            setLoading(false)
          }
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
        setLoading(false)
      }
    }

    loadIRData()
  }, [selectedRow])

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
  const truncateText = (text: string, maxLength?: number): string => {
    const dynamicMaxLength = maxLength || calculateMaxCharsPerColumn()
    if (text.length <= dynamicMaxLength) return text
    return text.substring(0, dynamicMaxLength) + '...'
  }

  if (!selectedRow) {
    return (
      <div className="csv-window">
        <div className="empty-state">
          <p>Selecciona una fila de la tabla principal para ver los datos IR</p>
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
        <div className="error-state">
          <p style={{ color: 'red' }}>Error: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="csv-window">
      <div className="table-header">
        <h3>Datos IR - {selectedRow.species} ({selectedRow.ID})</h3>
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
                {currentData.map((row, index) => (
                  <tr key={index}>
                    <td title={row.motif_complete}>
                      {truncateText(row.motif_complete)}
                    </td>
                    <td title={row.count.toString()}>
                      {truncateText(row.count.toString())}
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

export default TableIR

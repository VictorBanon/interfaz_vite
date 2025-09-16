import React, { useState, useEffect } from 'react'
import Papa from 'papaparse'
import './CSVWindow.css'

interface CSVWindowProps {
  onRowClick: (row: any) => void
}

const CSVWindow: React.FC<CSVWindowProps> = ({ onRowClick }) => {
  const [data, setData] = useState<any[]>([])
  const [filters, setFilters] = useState<{ [key: string]: string }>({})
  const [generalFilter, setGeneralFilter] = useState<string>('')
  const [currentPage, setCurrentPage] = useState<number>(1)
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

  const handleFilterChange = (column: string, value: string) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      [column]: value,
    }))
  }

  const filteredData = data.filter((row) =>
    Object.keys(filters).every((key) =>
      filters[key] ? row[key]?.toString().toLowerCase().includes(filters[key].toLowerCase()) : true
    ) &&
    Object.values(row).some((value) =>
      value.toString().toLowerCase().includes(generalFilter.toLowerCase())
    )
  )

  const totalPages = Math.ceil(filteredData.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const currentData = filteredData.slice(startIndex, startIndex + rowsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  return (
    <div className="csv-window">
      <div className="controls">
        <input type="file" accept=".csv" onChange={handleFileUpload} />
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
                    <div>
                      {key}
                      <input
                        type="text"
                        placeholder={`Filtrar ${key}`}
                        value={filters[key] || ''}
                        onChange={(e) => handleFilterChange(key, e.target.value)}
                        className="filter-input"
                      />
                    </div>
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {currentData.map((row, index) => (
              <tr key={index} onClick={() => onRowClick(row)}>
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

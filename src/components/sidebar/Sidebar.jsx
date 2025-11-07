import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './Sidebar.css'
import { 
  readTaxonomyData, 
  getTaxonValues, 
  readExplainedVarianceData, 
  getExplainedVarianceRatio,
  getCumulativeExplainedVariance 
} from '../../utils/taxonomyUtils'
import { TAXONOMIC_COLUMNS } from '../../utils/constants.ts'

const Sidebar = ({  
  onPartChange, 
  onPCChange, 
  onAggregateChange,
  onTaxonChange,
  onTaxonValueChange,
  onMaxPCChange,
  onSelectedPCsChange,
  onGroupByChange,
  onTaxonomyPlotChange, // Nuevo prop para manejar el cambio de plot en taxonomy
  onFilterChange, // Nuevo prop para manejar el filtro multi-select
  onIndividualFilterChange, // Nuevo prop para manejar el filtro de individuos
  aggregate,
  taxon: initialTaxon,
  taxonValue: initialTaxonValue,
  maxPC: initialMaxPC,
  selectedPCs: initialSelectedPCs,
  groupBy: initialGroupBy,
  selectedFilters: initialSelectedFilters, // Nuevo prop para los filtros seleccionados
  availableFilterOptions: initialAvailableFilterOptions // Nuevo prop para opciones disponibles
}) => {
  const location = useLocation()

  // local state for the 
  const [taxon, setTaxon] = useState(initialTaxon || "superkingdom")  
  const [taxon_value, setTaxon_value] = useState(initialTaxonValue || "Bacteria")
  const [part, setPart] = useState("all")
  const [aggregateState, setAggregateState] = useState(aggregate || "PC")
  const [groupBy, setGroupBy] = useState(initialGroupBy || "Superdomain")
  // Reemplazar pcNumber por pcX y pcY
  const [pcX, setPcX] = useState(1)
  const [pcY, setPcY] = useState(2)
  const [maxPC, setMaxPC] = useState(initialMaxPC || 6)
  const [selectedPCs, setSelectedPCs] = useState(initialSelectedPCs || [1, 2, 3, 4, 5, 6])
  
  // Estado para sidebar colapsable
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  // Estado para tipo de plot en taxonomy
  const [taxonomyPlotType, setTaxonomyPlotType] = useState("icicle")
  
  // Estados para filtro multi-select
  const [selectedFilters, setSelectedFilters] = useState(initialSelectedFilters || {})
  const [availableFilterOptions, setAvailableFilterOptions] = useState(initialAvailableFilterOptions || {})
  const [selectedFilterColumn, setSelectedFilterColumn] = useState('Superdomain') // Currently selected column for filtering
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false)
  const [filterSearchTerm, setFilterSearchTerm] = useState("")
  
  // Estados específicos para Interesting Individuals
  const [individualSearchTerm, setIndividualSearchTerm] = useState("")
  
  // Estados para datos de taxonomía
  const [taxonomyData, setTaxonomyData] = useState(null)
  const [availableValues, setAvailableValues] = useState([])
  
  // Estados para datos de explained variance
  const [explainedVarianceData, setExplainedVarianceData] = useState(null)
  const [availablePCs, setAvailablePCs] = useState(10) // Número de PCs disponibles

  // Cargar datos de taxonomía al montar el componente
  useEffect(() => {
    const loadTaxonomyData = async () => {
      const data = await readTaxonomyData()
      setTaxonomyData(data)
      // Establecer los valores iniciales para el taxón por defecto
      const initialValues = getTaxonValues(data, taxon)
      setAvailableValues(initialValues)
      // Si el valor actual no está en la lista, seleccionar el primero
      if (initialValues.length > 0 && !initialValues.includes(taxon_value)) {
        setTaxon_value(initialValues[0])
      }
    }
    
    loadTaxonomyData()
  }, [])

  // Cargar datos de explained variance cuando cambien los parámetros relevantes
  useEffect(() => {
    const loadExplainedVarianceData = async () => {
      // Determinar el tipo de análisis basándose en la ruta actual
      const analysisType = location.pathname === '/kmer' ? 'kmer' : 'hc'
      const data = await readExplainedVarianceData(taxon, taxon_value, part, analysisType)
      setExplainedVarianceData(data)
      
      // Determinar el número de PCs disponibles
      if (data && Object.keys(data).length > 0) {
        // Obtener todos los PCs disponibles del archivo
        const pcKeys = Object.keys(data).filter(key => key.startsWith('PC'))
        const pcNumbers = pcKeys.map(key => parseInt(key.replace('PC', ''))).sort((a, b) => a - b)
        setAvailablePCs(pcNumbers.length > 0 ? Math.max(...pcNumbers) : 10)
      } else {
        // Si no hay datos, usar 10 PCs por defecto
        setAvailablePCs(10)
      }
    }
    
    loadExplainedVarianceData()
  }, [taxon, taxon_value, part, location.pathname])

  // Load filter options from ACP component (all available columns)
  useEffect(() => {
    // Filter options will be populated by the ACP component via onFilterOptionsChange
    // No need to depend on groupBy anymore
  }, [])

  // Sync with parent's filter options when they change
  useEffect(() => {
    if (initialSelectedFilters !== undefined && typeof initialSelectedFilters === 'object') {
      setSelectedFilters(initialSelectedFilters)
    }
  }, [initialSelectedFilters])

  // Update available filter options when they come from parent
  useEffect(() => {
    if (initialAvailableFilterOptions) {
      setAvailableFilterOptions(initialAvailableFilterOptions)
      
      // Set default selected column if it exists in the new options
      const availableColumns = Object.keys(initialAvailableFilterOptions)
      if (availableColumns.length > 0 && !availableColumns.includes(selectedFilterColumn)) {
        setSelectedFilterColumn(availableColumns[0])
      }
    }
  }, [initialAvailableFilterOptions, selectedFilterColumn])

  // Validar y ajustar PCs seleccionados cuando cambie el número de PCs disponibles
  useEffect(() => {
    let newPcX = pcX
    let newPcY = pcY
    let needsUpdate = false
    
    // Solo cambiar pcX si es un número y está fuera del rango
    if (typeof pcX === 'number' && pcX > availablePCs) {
      newPcX = 1
      setPcX(1)
      needsUpdate = true
    }
    
    // Solo cambiar pcY si es un número y está fuera del rango
    if (typeof pcY === 'number' && pcY > availablePCs) {
      newPcY = 2
      setPcY(2)
      needsUpdate = true
    }
    
    // Solo llamar handlePCChange si realmente algo cambió
    if (needsUpdate) {
      handlePCChange(newPcX, newPcY)
    }
  }, [availablePCs])

  // Actualizar valores disponibles cuando cambie el taxón
  useEffect(() => {
    if (taxonomyData) {
      const values = getTaxonValues(taxonomyData, taxon)
      setAvailableValues(values)
      // Seleccionar el primer valor si el actual no está disponible
      if (values.length > 0 && !values.includes(taxon_value)) {
        const newValue = values[0]
        setTaxon_value(newValue)
        onTaxonValueChange?.(newValue)
      }
    }
  }, [taxon, taxonomyData])

  // Manejar cambios en taxon
  const handleTaxonChange = (newTaxon) => {
    setTaxon(newTaxon)
    onTaxonChange?.(newTaxon)
  }

  // Manejar cambios en taxon_value
  const handleTaxonValueChange = (newTaxonValue) => {
    setTaxon_value(newTaxonValue)
    onTaxonValueChange?.(newTaxonValue)
  }

  // Manejar cambios en aggregate
  const handleAggregateChange = (newAggregate) => {
    setAggregateState(newAggregate)
    onAggregateChange?.(newAggregate)
  }

  const handlePCChange = (newX, newY) => {
    // Manejar valores string y number
    const processedX = newX !== undefined && newX !== null ? (newX === "GC" || newX === "size" ? newX : Number(newX)) : pcX
    const processedY = newY !== undefined && newY !== null ? (newY === "GC" || newY === "size" ? newY : Number(newY)) : pcY
    
    if (newX !== undefined && newX !== null) setPcX(processedX)
    if (newY !== undefined && newY !== null) setPcY(processedY)
    onPCChange?.(processedX, processedY)
  }

  const handlePartChange = (newpart) => {
    if (newpart) {
      setPart(newpart)
      onPartChange?.(newpart)
    }
  }

  const [isPCListOpen, setIsPCListOpen] = useState(false)

  const handleMaxPCChange = (newMaxPC) => {
    setMaxPC(newMaxPC)
    onMaxPCChange?.(newMaxPC)
  }

  const handleSelectedPCsChange = (newSelectedPCs) => {
    setSelectedPCs(newSelectedPCs)
    onSelectedPCsChange?.(newSelectedPCs)
  }

  const togglePC = (pcNumber) => {
    setSelectedPCs(prev => {
      const newSelected = prev.includes(pcNumber) 
        ? prev.filter(pc => pc !== pcNumber)
        : [...prev, pcNumber].sort((a, b) => a - b)
      onSelectedPCsChange?.(newSelected)
      return newSelected
    })
  }

  const handleGroupByChange = (newGroupBy) => {
    setGroupBy(newGroupBy)
    onGroupByChange?.(newGroupBy)
  }

  const handleTaxonomyPlotChange = (newPlotType) => {
    setTaxonomyPlotType(newPlotType)
    onTaxonomyPlotChange?.(newPlotType)
  }

    // Handlers for multi-select filter
  const handleFilterToggle = (option) => {
    const columnValues = selectedFilters[selectedFilterColumn] || []
    const newColumnValues = columnValues.includes(option)
      ? columnValues.filter(item => item !== option)
      : [...columnValues, option]
    
    const newFilters = { ...selectedFilters, [selectedFilterColumn]: newColumnValues }
    setSelectedFilters(newFilters)
    onFilterChange?.(newFilters)
  }

  const handleFilterRemove = (option) => {
    const columnValues = selectedFilters[selectedFilterColumn] || []
    const newColumnValues = columnValues.filter(item => item !== option)
    const newFilters = { ...selectedFilters, [selectedFilterColumn]: newColumnValues }
    setSelectedFilters(newFilters)
    onFilterChange?.(newFilters)
  }

  const handleFilterClear = () => {
    const newFilters = { ...selectedFilters, [selectedFilterColumn]: [] }
    setSelectedFilters(newFilters)
    onFilterChange?.(newFilters)
  }

  const handleFilterSelectAll = () => {
    const currentColumnOptions = availableFilterOptions[selectedFilterColumn] || []
    const currentColumnValues = selectedFilters[selectedFilterColumn] || []
    const newColumnValues = currentColumnValues.length === currentColumnOptions.length 
      ? [] 
      : [...currentColumnOptions]
    
    const newFilters = { ...selectedFilters, [selectedFilterColumn]: newColumnValues }
    setSelectedFilters(newFilters)
    onFilterChange?.(newFilters)
  }

  // Handler para filtro de individuos
  const handleIndividualSearchChange = (searchTerm) => {
    setIndividualSearchTerm(searchTerm)
    onIndividualFilterChange?.(searchTerm)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.select-wrapper')) {
        setIsFilterDropdownOpen(false)
        setFilterSearchTerm("")
      }
    }
    
    if (isFilterDropdownOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isFilterDropdownOpen])

  // Función para mostrar texto completo o abreviado
  const getLinkText = (fullText, shortText) => {
    return isCollapsed ? shortText : fullText
  }

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <h2 className={isCollapsed ? 'hidden' : ''}>IR interface</h2>
        <button 
          className="collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          {isCollapsed ? '▶' : '◀'}
        </button>
      </div>
      <ul className={isCollapsed ? 'collapsed-menu' : ''}>
        <li>
          <Link to="/taxonomy" title={isCollapsed ? 'Taxonomy' : ''}>
            {getLinkText('Taxonomy', 'Tax')}
          </Link>
          {!isCollapsed && location.pathname === '/taxonomy' && (
            <div className="manager">
              <label>
                Plot Type:
                <select value={taxonomyPlotType} onChange={e => handleTaxonomyPlotChange(e.target.value)}>
                  <option value="icicle">Icicle</option>
                  <option value="treemap">Treemap</option>
                </select>
              </label>
            </div>
          )}
        </li>

        <li>
          <Link to="/structural" title={isCollapsed ? 'Structural' : ''}>
            {getLinkText('Structural', 'Struct')}
          </Link>
          {!isCollapsed && location.pathname === '/structural' && (
            <div className="manager">
              {/* Multi-select Filter Component */}
              <div className="multi-select-container">
                <label>Filter Data:</label>
                {/* Column Selector */}
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.85em', color: '#666' }}>
                    Filter Column:
                    <select 
                      value={selectedFilterColumn} 
                      onChange={(e) => setSelectedFilterColumn(e.target.value)}
                      style={{ 
                        marginLeft: '8px', 
                        padding: '4px', 
                        fontSize: '0.85em',
                        backgroundColor: '#2c3e50',
                        color: 'white',
                        border: '1px solid #34495e',
                        borderRadius: '3px'
                      }}
                    >
                      {Object.keys(availableFilterOptions).map(column => (
                        <option key={column} value={column}>
                          {column} ({availableFilterOptions[column]?.length || 0} options)
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                
                <div className="select-wrapper">
                  <div 
                    className={`select has-value is-clearable is-searchable select--multi ${isFilterDropdownOpen ? 'is-focused' : ''}`}
                    onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                  >
                    <div className="select__control">
                      <div className="select__value-container">
                        {(!selectedFilters[selectedFilterColumn] || selectedFilters[selectedFilterColumn].length === 0) ? (
                          <div className="select__placeholder">Select {selectedFilterColumn} values to filter...</div>
                        ) : (
                          <div className="select__multi-value-container">
                            {selectedFilters[selectedFilterColumn].slice(0, 3).map((filter, index) => (
                              <div key={filter} className="select__multi-value">
                                <div className="select__multi-value__label">{filter}</div>
                                <div 
                                  className="select__multi-value__remove"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleFilterRemove(filter);
                                  }}
                                >
                                  ×
                                </div>
                              </div>
                            ))}
                            {selectedFilters[selectedFilterColumn].length > 3 && (
                              <div className="select__multi-value">
                                <div className="select__multi-value__label">
                                  +{selectedFilters[selectedFilterColumn].length - 3} more
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="select__indicators">
                        {selectedFilters[selectedFilterColumn] && selectedFilters[selectedFilterColumn].length > 0 && (
                          <div 
                            className="select__clear-indicator"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFilterClear();
                            }}
                          >
                            ×
                          </div>
                        )}
                        <div className="select__dropdown-indicator">▼</div>
                      </div>
                    </div>
                    {isFilterDropdownOpen && availableFilterOptions[selectedFilterColumn] && (
                      <div className="select__menu">
                        <div className="select__menu-list">
                          <div className="select__search-container">
                            <input
                              type="text"
                              className="select__search-input"
                              placeholder="Search..."
                              value={filterSearchTerm}
                              onChange={(e) => setFilterSearchTerm(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div 
                            className="select__option select__option--all"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFilterSelectAll();
                            }}
                          >
                            <input 
                              type="checkbox" 
                              checked={(selectedFilters[selectedFilterColumn] || []).length === (availableFilterOptions[selectedFilterColumn] || []).length}
                              onChange={() => {}}
                            />
                            Select All ({(availableFilterOptions[selectedFilterColumn] || []).length})
                          </div>
                          {(availableFilterOptions[selectedFilterColumn] || [])
                            .filter(option => 
                              option.toLowerCase().includes(filterSearchTerm.toLowerCase())
                            )
                            .map(option => (
                              <div 
                                key={option}
                                className={`select__option ${(selectedFilters[selectedFilterColumn] || []).includes(option) ? 'select__option--is-selected' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFilterToggle(option);
                                }}
                              >
                                <input 
                                  type="checkbox" 
                                  checked={(selectedFilters[selectedFilterColumn] || []).includes(option)}
                                  onChange={() => {}}
                                />
                                {option}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Active Filters Summary */}
                {Object.keys(selectedFilters).some(col => selectedFilters[col] && selectedFilters[col].length > 0) && (
                  <div style={{ 
                    marginTop: '8px', 
                    padding: '8px', 
                    backgroundColor: '#34495e', 
                    borderRadius: '4px',
                    fontSize: '0.8em' 
                  }}>
                    <strong>Active Filters:</strong>
                    {Object.entries(selectedFilters).map(([column, values]) => 
                      values && values.length > 0 ? (
                        <div key={column} style={{ marginTop: '4px' }}>
                          <span style={{ color: '#3498db', fontWeight: 'bold' }}>{column}:</span> {values.length} selected
                        </div>
                      ) : null
                    )}
                  </div>
                )}
              </div>

              <label>
                Taxon:
                <select value={taxon} onChange={e => handleTaxonChange(e.target.value)}>
                  {taxonomyData?.columns.map(column => (
                    <option key={column} value={column}>
                      {column.charAt(0).toUpperCase() + column.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Taxon Value:
                <select value={taxon_value} onChange={e => handleTaxonValueChange(e.target.value)}>
                  {availableValues.map(value => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label> 

              <label>
                Part:
                <select value={part} onChange={e => handlePartChange(e.target.value)}>
                  <option value="all">All</option>
                  <option value="cod">Coding</option>
                  <option value="non">Non Coding</option>
                </select>
              </label>

              <label>
                Group By:
                <select value={groupBy} onChange={e => handleGroupByChange(e.target.value)}>
                  <option value="Superdomain">Superdomain</option>
                  <option value="Domain">Domain</option>
                  <option value="Phylum">Phylum</option>
                  <option value="Class">Class</option>
                  <option value="Order">Order</option>
                  <option value="Family">Family</option>
                  <option value="Genus">Genus</option>
                  <option value="Species">Species</option>
                  <option value="Replicons_type">Replicons Type</option>
                  <option value="GC">GC</option>
                  <option value="size">Size</option>
                </select>
              </label>

              <label>
                Aggregate:
                <select value={aggregateState} onChange={e => handleAggregateChange(e.target.value)}>
                  <option value="PC">PC</option>
                  <option value="Min-Max">Min-Max</option>
                  <option value="Mean-Median">Mean-Median</option>
                  <option value="ACPvsAll">ACPvsAll</option>
                  <option value="PCA_Taxon">PCA Taxon</option>
                  <option value="Variance explained">Variance explained</option>
                 </select>
              </label>

              {(aggregateState === "PC" || aggregateState === "ACPvsAll") && (
                <>
                  <label>
                    X axe:
                    <select 
                      value={pcX} 
                      onChange={e => handlePCChange(e.target.value, undefined)}
                    >
                      {Array.from({ length: availablePCs }, (_, i) => i + 1).map(pc => (
                        <option key={pc} value={pc}>
                          PC{pc} {explainedVarianceData ? `(${getExplainedVarianceRatio(explainedVarianceData, pc)}% | ${getCumulativeExplainedVariance(explainedVarianceData, pc)}%)` : ''}
                        </option>
                      ))}
                      <option value="GC">GC</option>
                      <option value="size">Size</option>
                    </select>
                  </label>
                  <label>
                    Y axe:
                    <select 
                      value={pcY} 
                      onChange={e => handlePCChange(undefined, e.target.value)}
                    >
                      {Array.from({ length: availablePCs }, (_, i) => i + 1).map(pc => (
                        <option key={pc} value={pc}>
                          PC{pc} {explainedVarianceData ? `(${getExplainedVarianceRatio(explainedVarianceData, pc)}% | ${getCumulativeExplainedVariance(explainedVarianceData, pc)}%)` : ''}
                        </option>
                      ))}
                      <option value="GC">GC</option>
                      <option value="size">Size</option>
                    </select>
                  </label>
                </>
              )}

              {aggregateState === "ACPvsAll" && (
                <div>
                  <div 
                    style={{ 
                      cursor: 'pointer', 
                      padding: '8px',
                      backgroundColor: '#2c3e50',
                      color: 'white',
                      border: '1px solid #34495e',
                      borderRadius: '4px',
                      marginBottom: '4px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onClick={() => setIsPCListOpen(!isPCListOpen)}
                  >
                    <span style={{ fontWeight: 'bold' }}>
                      Select PCs ({selectedPCs.length} selected)
                    </span>
                    <span style={{ fontSize: '12px', color: '#ecf0f1' }}>
                      {isPCListOpen ? '▼' : '▶'}
                    </span>
                  </div>
                  
                  {isPCListOpen && (
                    <div style={{ 
                      border: '1px solid #34495e',
                      borderRadius: '4px',
                      backgroundColor: '#34495e',
                      color: 'white',
                      padding: '8px',
                      marginBottom: '8px'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        gap: '4px', 
                        marginBottom: '8px',
                        fontSize: '0.75rem' 
                      }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectedPCsChange(Array.from({ length: Math.min(availablePCs, 9) }, (_, i) => i + 1))
                          }}
                          style={{
                            padding: '4px 8px',
                            fontSize: '0.7rem',
                            backgroundColor: '#27ae60',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          Select All
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectedPCsChange([])
                          }}
                          style={{
                            padding: '4px 8px',
                            fontSize: '0.7rem',
                            backgroundColor: '#e74c3c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          Clear All
                        </button>
                      </div>
                      
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(3, 1fr)', 
                        gap: '4px'
                      }}>
                        {Array.from({ length: Math.min(availablePCs, 9) }, (_, i) => i + 1).map(pc => (
                          <label 
                            key={pc} 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              padding: '4px',
                              backgroundColor: selectedPCs.includes(pc) ? '#3498db' : '#2c3e50',
                              color: 'white',
                              border: `1px solid ${selectedPCs.includes(pc) ? '#2980b9' : '#34495e'}`,
                              borderRadius: '3px',
                              fontWeight: selectedPCs.includes(pc) ? 'bold' : 'normal',
                              transition: 'all 0.2s ease'
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              togglePC(pc)
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedPCs.includes(pc)}
                              onChange={() => togglePC(pc)}
                              style={{ 
                                marginRight: '6px',
                                transform: 'scale(1.1)'
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            PC{pc}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </li>

        <li>
          <Link to="/kmer" title={isCollapsed ? 'Kmer' : ''}>
            {getLinkText('Kmer', 'Kmer')}
          </Link>
          {!isCollapsed && location.pathname === '/kmer' && (
            <div className="manager">
              <label>
                Taxon:
                <select value={taxon} onChange={e => handleTaxonChange(e.target.value)}>
                  {taxonomyData?.columns.map(column => (
                    <option key={column} value={column}>
                      {column.charAt(0).toUpperCase() + column.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Taxon Value:
                <select value={taxon_value} onChange={e => handleTaxonValueChange(e.target.value)}>
                  {availableValues.map(value => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label> 
 

              <label>
                Group By:
                <select value={groupBy} onChange={e => handleGroupByChange(e.target.value)}>
                  <option value="Superdomain">Superdomain</option>
                  <option value="Domain">Domain</option>
                  <option value="Phylum">Phylum</option>
                  <option value="Class">Class</option>
                  <option value="Order">Order</option>
                  <option value="Family">Family</option>
                  <option value="Genus">Genus</option>
                  <option value="Species">Species</option>
                  <option value="Replicons_type">Replicons Type</option>
                  <option value="GC">GC</option>
                  <option value="size">Size</option>
                </select>
              </label>

              <label>
                Aggregate:
                <select value={aggregateState} onChange={e => handleAggregateChange(e.target.value)}>
                  <option value="PC">PC</option>
                  <option value="ACPvsAll">ACPvsAll</option>
                </select>
              </label>

              {(aggregateState === "PC" || aggregateState === "ACPvsAll") && (
                <>
                  <label>
                    X axe:
                    <select 
                      value={pcX} 
                      onChange={e => handlePCChange(e.target.value, undefined)}
                    >
                      {Array.from({ length: availablePCs }, (_, i) => i + 1).map(pc => (
                        <option key={pc} value={pc}>
                          PC{pc} {explainedVarianceData ? `(${getExplainedVarianceRatio(explainedVarianceData, pc)}% | ${getCumulativeExplainedVariance(explainedVarianceData, pc)}%)` : ''}
                        </option>
                      ))}
                      <option value="GC">GC</option>
                      <option value="size">Size</option>
                    </select>
                  </label>
                  <label>
                    Y axe:
                    <select 
                      value={pcY} 
                      onChange={e => handlePCChange(undefined, e.target.value)}
                    >
                      {Array.from({ length: availablePCs }, (_, i) => i + 1).map(pc => (
                        <option key={pc} value={pc}>
                          PC{pc} {explainedVarianceData ? `(${getExplainedVarianceRatio(explainedVarianceData, pc)}% | ${getCumulativeExplainedVariance(explainedVarianceData, pc)}%)` : ''}
                        </option>
                      ))}
                      <option value="GC">GC</option>
                      <option value="size">Size</option>
                    </select>
                  </label>
                </>
              )}

              {aggregateState === "ACPvsAll" && (
                <label>
                  Max PCs:
                  <select 
                    value={maxPC} 
                    onChange={e => handleMaxPCChange(Number(e.target.value))}
                  >
                    {Array.from({ length: Math.min(availablePCs, 7) }, (_, i) => i + 3).map(num => (
                      <option key={num} value={num}>
                        {num}x{num} grid
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}
        </li>

        <li>
          <Link to="/spatial" title={isCollapsed ? 'Spatial' : ''}>
            {getLinkText('Spatial', 'Spat')}
          </Link>
          {!isCollapsed && location.pathname === '/spatial' && (
            <p className="test-text">✅ Test: You are on Spatial</p>
          )}
        </li>

        <li>
          <Link to="/motif" title={isCollapsed ? 'Motif Search' : ''}>
            {getLinkText('Motif Search', 'Motif')}
          </Link>
          {!isCollapsed && location.pathname === '/motif' && (
            <p className="test-text">✅ Test: You are on Motif Search</p>
          )}
        </li>

        <li>
          <Link to="/compositional" title={isCollapsed ? 'Compositional' : ''}>
            {getLinkText('Compositional', 'Comp')}
          </Link>
          {!isCollapsed && location.pathname === '/compositional' && (
            <div className="manager">
              <label>
                Taxon:
                <select value={taxon} onChange={e => handleTaxonChange(e.target.value)}>
                  {taxonomyData?.columns.map(column => (
                    <option key={column} value={column}>
                      {column.charAt(0).toUpperCase() + column.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Taxon Value:
                <select value={taxon_value} onChange={e => handleTaxonValueChange(e.target.value)}>
                  {availableValues.map(value => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </li>

        <li>
          <Link to="/errors" title={isCollapsed ? 'File System Analysis' : ''}>
            {getLinkText('File System Analysis', 'Errors')}
          </Link>
          {!isCollapsed && location.pathname === '/errors' && (
            <p className="test-text">✅ Test: You are on File System Analysis</p>
          )}
        </li>

        <li>
          <Link to="/interesting-individuals" title={isCollapsed ? 'Interesting Individuals' : ''}>
            {getLinkText('Interesting Individuals', 'Indiv')}
          </Link>
          {!isCollapsed && location.pathname === '/interesting-individuals' && (
            <div className="manager">
              <div className="individual-filter-container">
                <label>Filter Individuals:</label>
                <div className="search-input-container">
                  <input
                    type="text"
                    className="individual-search-input"
                    placeholder="Search by organism ID or species name..."
                    value={individualSearchTerm}
                    onChange={(e) => handleIndividualSearchChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '14px',
                      backgroundColor: '#2c3e50',
                      color: 'white',
                      border: '1px solid #34495e',
                      borderRadius: '4px',
                      outline: 'none',
                      transition: 'border-color 0.3s ease'
                    }}
                  />
                  {individualSearchTerm && (
                    <button
                      onClick={() => handleIndividualSearchChange('')}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#95a5a6',
                        cursor: 'pointer',
                        fontSize: '16px',
                        padding: '0',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Clear search"
                    >
                      ×
                    </button>
                  )}
                </div>
                {individualSearchTerm && (
                  <div style={{ 
                    marginTop: '8px', 
                    padding: '6px 8px', 
                    backgroundColor: '#34495e', 
                    borderRadius: '3px',
                    fontSize: '0.8em',
                    color: '#ecf0f1'
                  }}>
                    <span style={{ color: '#3498db', fontWeight: 'bold' }}>Filter active:</span> "{individualSearchTerm}"
                  </div>
                )}
              </div>
            </div>
          )}
        </li>
      </ul>
    </aside>
  )
}

export default Sidebar

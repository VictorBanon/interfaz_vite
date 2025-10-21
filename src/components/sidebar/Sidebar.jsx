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
  aggregate,
  taxon: initialTaxon,
  taxonValue: initialTaxonValue,
  maxPC: initialMaxPC,
  selectedPCs: initialSelectedPCs,
  groupBy: initialGroupBy
}) => {
  const location = useLocation()

  // local state for the 
  const [taxon, setTaxon] = useState(initialTaxon || "superkingdom")  
  const [taxon_value, setTaxon_value] = useState(initialTaxonValue || "Bacteria")
  const [part, setPart] = useState("all")
  const [aggregateState, setAggregateState] = useState(aggregate || "PC")
  const [groupBy, setGroupBy] = useState(initialGroupBy || "superkingdom")
  // Reemplazar pcNumber por pcX y pcY
  const [pcX, setPcX] = useState(1)
  const [pcY, setPcY] = useState(1)
  const [maxPC, setMaxPC] = useState(initialMaxPC || 6)
  const [selectedPCs, setSelectedPCs] = useState(initialSelectedPCs || [1, 2, 3, 4, 5, 6])
  
  // Estado para sidebar colapsable
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  // Estado para tipo de plot en taxonomy
  const [taxonomyPlotType, setTaxonomyPlotType] = useState("icicle")
  
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

  // Validar y ajustar PCs seleccionados cuando cambie el número de PCs disponibles
  useEffect(() => {
    if (pcX > availablePCs) {
      setPcX(1)
      handlePCChange(1, pcY)
    }
    if (pcY > availablePCs) {
      setPcY(1)
      handlePCChange(pcX, 1)
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
    if (newX) setPcX(newX)
    if (newY) setPcY(newY)
    onPCChange?.(newX || pcX, newY || pcY)
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

  // Función para mostrar texto completo o abreviado
  const getLinkText = (fullText, shortText) => {
    return isCollapsed ? shortText : fullText
  }

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <h2 className={isCollapsed ? 'hidden' : ''}>Menú</h2>
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
          <Link to="/introduction" title={isCollapsed ? 'Introduction' : ''}>
            {getLinkText('Introduction', 'Intro')}
          </Link>
          {!isCollapsed && location.pathname === '/introduction' && (
            <p className="test-text">✅ Test: You are on Introduction</p>
          )}
        </li>

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
                  <option value="superkingdom">Superkingdom</option>
                  <option value="class">Class</option>
                  <option value="order">Order</option>
                  <option value="family">Family</option>
                  <option value="genus">Genus</option>
                  <option value="species">Species</option>
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
                 </select>
              </label>

              {(aggregateState === "PC" || aggregateState === "ACPvsAll") && (
                <>
                  <label>
                    PCx:
                    <select 
                      value={pcX} 
                      onChange={e => handlePCChange(Number(e.target.value), null)}
                    >
                      {Array.from({ length: availablePCs }, (_, i) => i + 1).map(pc => (
                        <option key={pc} value={pc}>
                          PC{pc} {explainedVarianceData ? `(${getExplainedVarianceRatio(explainedVarianceData, pc)}% | ${getCumulativeExplainedVariance(explainedVarianceData, pc)}%)` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    PCy:
                    <select 
                      value={pcY} 
                      onChange={e => handlePCChange(null, Number(e.target.value))}
                    >
                      {Array.from({ length: availablePCs }, (_, i) => i + 1).map(pc => (
                        <option key={pc} value={pc}>
                          PC{pc} {explainedVarianceData ? `(${getExplainedVarianceRatio(explainedVarianceData, pc)}% | ${getCumulativeExplainedVariance(explainedVarianceData, pc)}%)` : ''}
                        </option>
                      ))}
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
                  <option value="superkingdom">Superkingdom</option>
                  <option value="class">Class</option>
                  <option value="order">Order</option>
                  <option value="family">Family</option>
                  <option value="genus">Genus</option>
                  <option value="species">Species</option>
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
                    PCx:
                    <select 
                      value={pcX} 
                      onChange={e => handlePCChange(Number(e.target.value), null)}
                    >
                      {Array.from({ length: availablePCs }, (_, i) => i + 1).map(pc => (
                        <option key={pc} value={pc}>
                          PC{pc} {explainedVarianceData ? `(${getExplainedVarianceRatio(explainedVarianceData, pc)}% | ${getCumulativeExplainedVariance(explainedVarianceData, pc)}%)` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    PCy:
                    <select 
                      value={pcY} 
                      onChange={e => handlePCChange(null, Number(e.target.value))}
                    >
                      {Array.from({ length: availablePCs }, (_, i) => i + 1).map(pc => (
                        <option key={pc} value={pc}>
                          PC{pc} {explainedVarianceData ? `(${getExplainedVarianceRatio(explainedVarianceData, pc)}% | ${getCumulativeExplainedVariance(explainedVarianceData, pc)}%)` : ''}
                        </option>
                      ))}
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
      </ul>
    </aside>
  )
}

export default Sidebar

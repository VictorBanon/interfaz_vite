import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './Sidebar.css'
import { readTaxonomyData, getTaxonValues } from '../../utils/taxonomyUtils'

const Sidebar = ({  
  onPartChange, 
  onPCChange, 
  onAggregateChange,
  onTaxonChange,
  onTaxonValueChange,
  aggregate,
  taxon: initialTaxon,
  taxonValue: initialTaxonValue
}) => {
  const location = useLocation()

  // local state for the 
  const [taxon, setTaxon] = useState(initialTaxon || "superkingdom")  
  const [taxon_value, setTaxon_value] = useState(initialTaxonValue || "Bacteria")
  const [part, setPart] = useState("all")
  const [aggregateState, setAggregateState] = useState(aggregate || "PC")
  // Reemplazar pcNumber por pcX y pcY
  const [pcX, setPcX] = useState(1)
  const [pcY, setPcY] = useState(1)
  
  // Estados para datos de taxonomía
  const [taxonomyData, setTaxonomyData] = useState(null)
  const [availableValues, setAvailableValues] = useState([])

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
    if (newpart) setPart(newpart) 
      onPartChange?.(newpart || part)
  }

  return (
    <aside className="sidebar">
      <h2>Menú</h2>
      <ul>
        <li>
          <Link to="/introduction">Introduction</Link>
          {location.pathname === '/introduction' && (
            <p className="test-text">✅ Test: You are on Introduction</p>
          )}
        </li>

        <li>
          <Link to="/taxonomy">Taxonomy</Link> 
        </li>

        <li>
          <Link to="/structural">Structural</Link>
          {location.pathname === '/structural' && (
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
                Aggregate:
                <select value={aggregateState} onChange={e => handleAggregateChange(e.target.value)}>
                  <option value="PC">PC</option>
                  <option value="max">Max</option>
                  <option value="min">Min</option>
                  <option value="median">Median</option>
                </select>
              </label>

              {aggregateState === "PC" && (
                <>
                  <label>
                    PCx:
                    <select 
                      value={pcX} 
                      onChange={e => handlePCChange(Number(e.target.value), null)}
                    >
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(pc => (
                        <option key={pc} value={pc}>PC{pc}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    PCy:
                    <select 
                      value={pcY} 
                      onChange={e => handlePCChange(null, Number(e.target.value))}
                    >
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(pc => (
                        <option key={pc} value={pc}>PC{pc}</option>
                      ))}
                    </select>
                  </label>
                </>
              )}
            </div>
          )}
        </li>

        <li>
          <Link to="/kmer">Kmer</Link>
          {location.pathname === '/kmer' && (
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
                <select value={part} onChange={e => setPart(e.target.value)}>
                  <option value="all">All</option>
                  <option value="cod">Coding</option>
                  <option value="non">Non Coging</option>
                </select>
              </label>

              <label>
                Aggregate:
                <select value={aggregateState} onChange={e => handleAggregateChange(e.target.value)}>
                  <option value="PC">PC</option>
                  <option value="max">Max</option>
                  <option value="min">Min</option>
                  <option value="median">Median</option>
                </select>
              </label>

              {aggregateState === "PC" && (
                <>
                  <label>
                    PCx:
                    <select 
                      value={pcX} 
                      onChange={e => handlePCChange(Number(e.target.value), null)}
                    >
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(pc => (
                        <option key={pc} value={pc}>PC{pc}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    PCy:
                    <select 
                      value={pcY} 
                      onChange={e => handlePCChange(null, Number(e.target.value))}
                    >
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(pc => (
                        <option key={pc} value={pc}>PC{pc}</option>
                      ))}
                    </select>
                  </label>
                </>
              )}
            </div>
          )}
        </li>

        <li>
          <Link to="/spatial">Spatial</Link>
          {location.pathname === '/spatial' && (
            <p className="test-text">✅ Test: You are on Spatial</p>
          )}
        </li>

        <li>
          <Link to="/compositional">Compositional</Link>
          {location.pathname === '/compositional' && (
            <p className="test-text">✅ Test: You are on Compositional</p>
          )}
        </li>
      </ul>
    </aside>
  )
}

export default Sidebar

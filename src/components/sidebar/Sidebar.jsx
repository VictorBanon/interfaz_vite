import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './Sidebar.css'

const Sidebar = () => {
  const location = useLocation()

  // local state for the 
  const [taxon, setTaxon] = useState("superkingdom")  
  const [taxon_value, setTaxon_value] = useState("Bacteria")
  const [part, setPart] = useState("all")
  const [aggregate, setAggregate] = useState("PC")
  const [pcNumber, setNumPC] = useState(1)

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
          {location.pathname === '/taxonomy' && (
            <div className="manager">
              <label>
                Taxon:
                <select value={taxon} onChange={e => setTaxon(e.target.value)}>
                  <option value="superkingdom">Superkingdom</option> 
                </select>
              </label>
              <label>
                Taxon Value:
                <select value={taxon_value} onChange={e => setTaxon_value(e.target.value)}>
                  <option value="Bacteria">Bacteria</option> 
                </select>
              </label>  
            </div>
          )}
        </li>

        <li>
          <Link to="/structural">Structural</Link>
          {location.pathname === '/structural' && (
            <div className="manager">
              <label>
                Taxon:
                <select value={taxon} onChange={e => setTaxon(e.target.value)}>
                  <option value="superkingdom">Superkingdom</option> 
                </select>
              </label>
              <label>
                Taxon Value:
                <select value={taxon_value} onChange={e => setTaxon_value(e.target.value)}>
                  <option value="Bacteria">Bacteria</option> 
                </select>
              </label> 

              <label>
                Part:
                <select value={part} onChange={e => setPart(e.target.value)}>
                  <option value="all">All</option>
                  <option value="code">Code</option>
                  <option value="non">Non</option>
                </select>
              </label>

              <label>
                Aggregate:
                <select value={aggregate} onChange={e => setAggregate(e.target.value)}>
                  <option value="PC">PC</option>
                  <option value="max">Max</option>
                  <option value="min">Min</option>
                  <option value="median">Median</option>
                </select>
              </label>

              {aggregate === "PC" && (
                <label>
                  PC Number:
                  <select value={pcNumber} onChange={e => setPCNumber(Number(e.target.value))}>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((pc) => (
                      <option key={pc} value={pc}>PC{pc}</option>
                    ))}
                  </select>
                </label> 
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
                <select value={taxon} onChange={e => setTaxon(e.target.value)}>
                  <option value="superkingdom">Superkingdom</option> 
                </select>
              </label>
              <label>
                Taxon Value:
                <select value={taxon_value} onChange={e => setTaxon_value(e.target.value)}>
                  <option value="Bacteria">Bacteria</option> 
                </select>
              </label> 

              <label>
                Part:
                <select value={part} onChange={e => setPart(e.target.value)}>
                  <option value="all">All</option>
                  <option value="code">Code</option>
                  <option value="non">Non</option>
                </select>
              </label>

              <label>
                Aggregate:
                <select value={aggregate} onChange={e => setAggregate(e.target.value)}>
                  <option value="PC">PC</option>
                  <option value="max">Max</option>
                  <option value="min">Min</option>
                  <option value="median">Median</option>
                </select>
              </label>


              {aggregate === "PC" && (
                <label>
                  PC Number:
                  <select value={pcNumber} onChange={e => setPCNumber(Number(e.target.value))}>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((pc) => (
                      <option key={pc} value={pc}>PC{pc}</option>
                    ))}
                  </select>
                </label> 
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

import React from 'react'
import { Link } from 'react-router-dom'
import './Sidebar.css'

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <h2>Menú</h2>
      <ul>
        <li><Link to="/introduction">Introduction</Link></li>
        <li><Link to="/taxonomy">Taxonomy</Link></li>
        <li><Link to="/structural">Structural</Link></li>
        <li><Link to="/kmer">Kmer</Link></li>
        <li><Link to="/spatial">Spatial</Link></li>
        <li><Link to="/compositional">Compositional</Link></li>
      </ul>
    </aside>
  )
}

export default Sidebar

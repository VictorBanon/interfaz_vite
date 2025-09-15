import React from 'react'
import Sidebar from '../components/Sidebar'
import './Structural.css'


{/* https://www.youtube.com/watch?v=7D3kXabIUoM */}

const Structural = () => {
  return (
    <div className="dashboard">
      <Sidebar />
      <main className="main-content">
        <div className="grid">
          <div className="card">Ventana 1</div>
          <div className="card">Ventana 2</div>
          <div className="card">Ventana 3</div>
          <div className="card">Ventana 4</div>
        </div>
      </main>
    </div>
  )
}

export default Structural
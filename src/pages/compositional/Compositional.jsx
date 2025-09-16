import React from 'react'
import Sidebar from '../../components/sidebar/Sidebar' 
import CSVWindow from '../../components/table/Table' 

const Compositional = () => {
  return (
    <div className="dashboard">
      <Sidebar />
      <main className="main-content">
        <div className="grid">
          <div className="card">Ventana 1</div>
          <div className="card">Ventana 2</div>
          <div className="card">Ventana 3</div>
          <div className="card">
          {/* Ventana 4 */ }
          <CSVWindow />
          </div>
        </div>
      </main>     
    </div>
  )
}

export default Compositional
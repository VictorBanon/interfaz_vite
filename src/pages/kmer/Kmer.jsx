import React, { useState, useEffect } from 'react'
import Sidebar from '../../components/sidebar/Sidebar'
import './Kmer.css'
import CSVWindow from '../../components/table/Table' 
import ACP from '../../components/ACP/ACP'
import KmerPlot from '../../components/kmer/kmer_plot'

const Kmer = () => {  
  const [selectedElement, setSelectedElement] = useState({
    id: null,
    idReplicon: null
  });
  const [part, setPart] = useState("all")
  const [pcConfig, setPcConfig] = useState({ x: 1, y: 1 })
  const [aggregate, setAggregate] = useState("PC") // Añadir estado para aggregate

  const handleACPClick = (point) => {
    console.log('ACP click:', point);
    setSelectedElement({
      id: point.ID,
      idReplicon: point['ID-replicon']
    });
  }

  const handleTableClick = (row) => {
    setSelectedElement({
      id: row.ID,
      idReplicon: row['ID-replicon']
    })
  }

  const handlePartChange = (newPart) => {
    setPart(newPart)
  }

  const handlePCChange = (x, y) => {
    console.log('PC values updated:', { x, y })
    setPcConfig({ x, y })
  }

  // Nuevo manejador para aggregate
  const handleAggregateChange = (newAggregate) => {
    setAggregate(newAggregate)
  }

  return (
    <div className="dashboard">
    <Sidebar 
      onPartChange={handlePartChange}
      onPCChange={handlePCChange}
      onAggregateChange={handleAggregateChange} // Añadir prop
      aggregate={aggregate} // Pasar el estado actual
    />
      <main className="main-content">
        <div className="grid">
          <div className="card">
            {/* Ventana 1 */ }
            <ACP 
              csvPath="/data/philogenie/Bacteria/acp_kmer_Bacteria.csv" 
              pcX={pcConfig.x}
              pcY={pcConfig.y}
              onPointClick={handleACPClick}
            />

          </div>
          <div className="card">Ventana 2</div>
          <div className="card">
            <KmerPlot 
              id={selectedElement.id} 
              idReplicon={selectedElement.idReplicon}
            />
          </div>
          <div className="card">
          {/* Ventana 4 */ }
          <CSVWindow onRowClick={handleTableClick} />
          </div>
        </div>
      </main>
    </div>
  )
}

export default Kmer
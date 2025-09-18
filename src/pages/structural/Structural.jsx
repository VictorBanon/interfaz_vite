import React, { useState } from 'react'
import Sidebar from '../../components/sidebar/Sidebar'
import CSVWindow from '../../components/table/Table' 
import ACP from '../../components/ACP/ACP'
import Heatmap from '../../components/structural/structural_plot'
import AggregateStructural from '../../components/structural/agregate_structural_plot'

import './Structural.css' 

const Structural = () => {
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
    console.log('Part changed to:', newPart)
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
              csvPath="/data/philogenie/Bacteria/acp_hc_all_Bacteria.csv" 
              pcX={pcConfig.x}
              pcY={pcConfig.y}
              onPointClick={handleACPClick}
            />
            

          </div> 
          <div className="card">
            <AggregateStructural
              aggregate={aggregate}
              pcX={pcConfig.x}
              pcY={pcConfig.y}
              id={selectedElement.id}
              idReplicon={selectedElement.fullname}
            />
          </div>
          <div className="card">  
            <Heatmap id={selectedElement.id} idReplicon={selectedElement.idReplicon} part={part} />
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

export default Structural
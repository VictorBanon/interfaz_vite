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
  
  // Estados para taxonomía
  const [taxon, setTaxon] = useState("superkingdom")
  const [taxonValue, setTaxonValue] = useState("Bacteria")

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

  // Manejadores para taxonomía
  const handleTaxonChange = (newTaxon) => {
    console.log('Taxon changed to:', newTaxon)
    setTaxon(newTaxon)
  }

  const handleTaxonValueChange = (newTaxonValue) => {
    console.log('Taxon value changed to:', newTaxonValue)
    setTaxonValue(newTaxonValue)
  }

  return (
    <div className="dashboard">
      <Sidebar 
        onPartChange={handlePartChange}
        onPCChange={handlePCChange}
        onAggregateChange={handleAggregateChange}
        onTaxonChange={handleTaxonChange}
        onTaxonValueChange={handleTaxonValueChange}
        aggregate={aggregate}
        taxon={taxon}
        taxonValue={taxonValue}
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
              taxon={taxon}
              taxonValue={taxonValue}
              part={part}
            />
            

          </div> 
          <div className="card">
            <AggregateStructural
              aggregate={aggregate}
              pcX={pcConfig.x}
              pcY={pcConfig.y}
              id={selectedElement.id}
              idReplicon={selectedElement.fullname}
              taxon={taxon}
              taxonValue={taxonValue}
              part={part}
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
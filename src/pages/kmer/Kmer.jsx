import React, { useState, useEffect } from 'react'
import Sidebar from '../../components/sidebar/Sidebar'
import './Kmer.css'
import CSVWindow from '../../components/table/Table' 
import ACP from '../../components/ACP/ACP'
import KmerPlot from '../../components/kmer/kmer_plot'
import AggregateKmer from '../../components/kmer/agregate_kmer_plot'

const Kmer = () => {  
  const [selectedElement, setSelectedElement] = useState({
    id: null,
    idReplicon: null
  });
  const [part, setPart] = useState("all")
  const [pcConfig, setPcConfig] = useState({ x: 1, y: 2 })
  const [aggregate, setAggregate] = useState("PC")
  const [groupBy, setGroupBy] = useState("superkingdom") // Estado para agrupar por
  
  // Estados para taxonomía
  const [taxon, setTaxon] = useState("superkingdom")
  const [taxonValue, setTaxonValue] = useState("Bacteria")

  const handleACPClick = (point) => {
    console.log('ACP click:', point);
    console.log('Setting selectedElement to:', {
      id: point.ID,
      idReplicon: point['ID-replicon'] || point.idReplicon
    });
    setSelectedElement({
      id: point.ID,
      idReplicon: point['ID-replicon'] || point.idReplicon
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

  // Manejador para groupBy
  const handleGroupByChange = (newGroupBy) => {
    console.log('Group By changed to:', newGroupBy)
    setGroupBy(newGroupBy)
  }

  return (
    <div className="dashboard">
      <Sidebar 
        onPartChange={handlePartChange}
        onPCChange={handlePCChange}
        onAggregateChange={handleAggregateChange}
        onTaxonChange={handleTaxonChange}
        onTaxonValueChange={handleTaxonValueChange}
        onGroupByChange={handleGroupByChange}
        aggregate={aggregate}
        taxon={taxon}
        taxonValue={taxonValue}
        groupBy={groupBy}
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
              taxon={taxon}
              taxonValue={taxonValue}
              part="all" // Kmer doesn't use part parameter
              groupBy={groupBy}
              analysisType="kmer"
            />

          </div>
          <div className="card">
            <AggregateKmer
              aggregate={aggregate}
              pcX={pcConfig.x}
              pcY={pcConfig.y}
              id={selectedElement.id}
              idReplicon={selectedElement.idReplicon}
              taxon={taxon}
              taxonValue={taxonValue}
              part="all" // Kmer doesn't use part parameter
            />
          </div>
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
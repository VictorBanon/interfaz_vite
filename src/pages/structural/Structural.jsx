import React, { useState } from 'react'
import Sidebar from '../../components/sidebar/Sidebar'
import CSVWindow from '../../components/table/Table' 
import ACP from '../../components/ACP/ACP'
import Heatmap from '../../components/structural/structural_plot'
import AggregateStructural from '../../components/structural/agregate_structural_plot'
import GapPlot from '../../components/structural/gap_plot'
import ArmPlot from '../../components/structural/arm_plot'
import TotalPlot from '../../components/structural/total_plot'

import './Structural.css' 

const Structural = () => {
  const [selectedElement, setSelectedElement] = useState({
    id: null,
    idReplicon: null
  });
  const [part, setPart] = useState("all")
  const [pcConfig, setPcConfig] = useState({ x: 1, y: 1 })
  const [aggregate, setAggregate] = useState("PC") // Añadir estado para aggregate
  const [maxPC, setMaxPC] = useState(6) // Nuevo estado para número máximo de PCs
  const [selectedPCs, setSelectedPCs] = useState([1, 2, 3, 4, 5, 6]) // Estado para PCs seleccionados
  const [groupBy, setGroupBy] = useState("superkingdom") // Estado para agrupar por
  const [isCard2Expanded, setIsCard2Expanded] = useState(false) // Estado para expansión de card 2
  const [activeTab, setActiveTab] = useState("gap/arm") // Estado para la pestaña activa en card 3
  
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

  // Nuevo manejador para maxPC
  const handleMaxPCChange = (newMaxPC) => {
    console.log('Max PC changed to:', newMaxPC)
    setMaxPC(newMaxPC)
  }

  // Nuevo manejador para selectedPCs
  const handleSelectedPCsChange = (newSelectedPCs) => {
    console.log('Selected PCs changed to:', newSelectedPCs)
    setSelectedPCs(newSelectedPCs)
  }

  // Nuevo manejador para groupBy
  const handleGroupByChange = (newGroupBy) => {
    console.log('Group By changed to:', newGroupBy)
    setGroupBy(newGroupBy)
  }

  // Función para alternar la expansión de la card 2
  const toggleCard2Expansion = () => {
    setIsCard2Expanded(prev => !prev)
  }

  // Función para cambiar la pestaña activa en card 3
  const handleTabChange = (tabName) => {
    setActiveTab(tabName)
  }

  return (
    <div className="dashboard">
      <Sidebar 
        onPartChange={handlePartChange}
        onPCChange={handlePCChange}
        onAggregateChange={handleAggregateChange}
        onTaxonChange={handleTaxonChange}
        onTaxonValueChange={handleTaxonValueChange}
        onMaxPCChange={handleMaxPCChange}
        onSelectedPCsChange={handleSelectedPCsChange}
        onGroupByChange={handleGroupByChange}
        aggregate={aggregate}
        taxon={taxon}
        taxonValue={taxonValue}
        maxPC={maxPC}
        selectedPCs={selectedPCs}
        groupBy={groupBy}
      />
      <main className="main-content">
        {isCard2Expanded ? (
          // Vista expandida - solo mostrar la card 2
          <div className="expanded-view">
            <div className="expanded-card">
              <button 
                className="collapse-button"
                onClick={toggleCard2Expansion}
                title="Volver a vista normal"
              >
                ✕
              </button>
              <AggregateStructural
                aggregate={aggregate}
                pcX={pcConfig.x}
                pcY={pcConfig.y}
                id={selectedElement.id}
                idReplicon={selectedElement.fullname}
                taxon={taxon}
                taxonValue={taxonValue}
                part={part}
                maxPC={maxPC}
                selectedPCs={selectedPCs}
              />
            </div>
          </div>
        ) : (
          // Vista normal - grid con todas las cards
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
                groupBy={groupBy}
              />
            </div> 
            <div className="card">
              <button 
                className="expand-button"
                onClick={toggleCard2Expansion}
                title="Expandir vista"
              >
                ⛶
              </button>
              <AggregateStructural
                aggregate={aggregate}
                pcX={pcConfig.x}
                pcY={pcConfig.y}
                id={selectedElement.id}
                idReplicon={selectedElement.fullname}
                taxon={taxon}
                taxonValue={taxonValue}
                part={part}
                maxPC={maxPC}
                selectedPCs={selectedPCs}
              />
            </div>
            <div className="card">  
              <div className="card-tabs">
                <div className="tabs-header">
                  {["gap/arm", "gap", "arm", "total"].map((tab) => (
                    <button
                      key={tab}
                      className={`tab-button ${activeTab === tab ? "active" : ""}`}
                      onClick={() => handleTabChange(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="tab-content">
                  {activeTab === "gap/arm" && (
                    <Heatmap id={selectedElement.id} idReplicon={selectedElement.idReplicon} part={part} />
                  )}
                  {activeTab === "gap" && (
                    <GapPlot id={selectedElement.id} idReplicon={selectedElement.idReplicon} part={part} />
                  )}
                  {activeTab === "arm" && (
                    <ArmPlot id={selectedElement.id} idReplicon={selectedElement.idReplicon} part={part} />
                  )}
                  {activeTab === "total" && (
                    <TotalPlot id={selectedElement.id} idReplicon={selectedElement.idReplicon} part={part} />
                  )}
                </div>
              </div>
            </div>
            <div className="card">
            {/* Ventana 4 */ }
            <CSVWindow onRowClick={handleTableClick} />
            </div>       
          </div>
        )}
      </main>
    </div>
  )
}

export default Structural
import React, { useState } from 'react'
import Sidebar from '../../components/sidebar/Sidebar'
import CSVWindow from '../../components/table/Table'
import TaxonomicTree from '../../components/taxonomy/tree'
import WikipediaViewer from '../../components/taxonomy/wikipedia'
import TaxonomyPlots from '../../components/taxonomy/TaxonomyPlots'

const Taxonomy = () => {
  const [selectedNode, setSelectedNode] = useState(null)
  const [taxonomyPlotType, setTaxonomyPlotType] = useState('icicle')

  const handleNodeSelect = (nodeName) => {
    setSelectedNode(nodeName)
  }

  const handleTaxonomyPlotChange = (plotType) => {
    setTaxonomyPlotType(plotType)
  }

  return (
    <div className="dashboard">
      <Sidebar onTaxonomyPlotChange={handleTaxonomyPlotChange} />
      <main className="main-content">
        <div className="grid">
          <div className="card"  >
            <TaxonomicTree onNodeSelect={handleNodeSelect} />
          </div>
          <div className="card">
            <WikipediaViewer searchTerm={selectedNode} />
          </div>
          <div className="card">
            <TaxonomyPlots plotType={taxonomyPlotType} />
          </div>
          <div className="card">
            <CSVWindow />
          </div>
        </div>
      </main>
    </div>
  )
}

export default Taxonomy
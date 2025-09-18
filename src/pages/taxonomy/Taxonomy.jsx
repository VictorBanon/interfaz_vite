import React, { useState } from 'react'
import Sidebar from '../../components/sidebar/Sidebar'
import CSVWindow from '../../components/table/Table'
import TaxonomicTree from '../../components/taxonomy/tree'
import WikipediaViewer from '../../components/taxonomy/wikipedia'

const Taxonomy = () => {
  const [selectedNode, setSelectedNode] = useState(null)

  const handleNodeSelect = (nodeName) => {
    setSelectedNode(nodeName)
  }

  return (
    <div className="dashboard">
      <Sidebar />
      <main className="main-content">
        <div className="grid">
          <div className="card"  >
            <TaxonomicTree onNodeSelect={handleNodeSelect} />
          </div>
          <div className="card">
            <WikipediaViewer searchTerm={selectedNode} />
          </div>
          <div className="card">Ventana 3</div>
          <div className="card">
            <CSVWindow />
          </div>
        </div>
      </main>
    </div>
  )
}

export default Taxonomy
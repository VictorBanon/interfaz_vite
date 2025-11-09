import React, { useState } from 'react'
import Sidebar from '../../components/sidebar/Sidebar' 
import CSVWindow from '../../components/table/Table' 
import TableIR from '../../components/compositional/table_ir'
import ClusterIR from '../../components/compositional/cluster_ir'
import { TAXONOMIC_COLUMNS, DEFAULT_TAXONOMIC_VALUES } from '../../utils/constants'

const Compositional = () => {
  const [selectedRow, setSelectedRow] = useState(null)
  const [taxon, setTaxon] = useState(TAXONOMIC_COLUMNS[0].toLowerCase()) // 'superdomain'
  const [taxonValue, setTaxonValue] = useState(DEFAULT_TAXONOMIC_VALUES.Superdomain) // 'Prokaryote'

  const handleRowClick = (row) => {
    setSelectedRow(row)
  }

  // Callbacks para manejar cambios en los dropdowns del Sidebar
  const handleTaxonChange = (newTaxon) => {
    setTaxon(newTaxon)
  }

  const handleTaxonValueChange = (newTaxonValue) => {
    setTaxonValue(newTaxonValue)
  }

  return (
    <div className="dashboard">
      <Sidebar 
        onTaxonChange={handleTaxonChange}
        onTaxonValueChange={handleTaxonValueChange}
        taxon={taxon}
        taxonValue={taxonValue}
      />
      <main className="main-content">
        <div className="grid">
          <div className="card">
            <ClusterIR taxon={taxon} taxonValue={taxonValue} />
          </div>
          <div className="card">Ventana 2</div>
          <div className="card">
            <TableIR selectedRow={selectedRow} />
          </div>
          <div className="card">
          {/* Ventana 4 */ }
          <CSVWindow onRowClick={handleRowClick} />
          </div>
        </div>
      </main>     
    </div>
  )
}

export default Compositional
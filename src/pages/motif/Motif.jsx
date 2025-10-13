import React, { useState } from 'react';
import Sidebar from '../../components/sidebar/Sidebar';
import MotifRepliconPlot from '../../components/motif/Motif_replicon_plot';
import MotifTableIR from '../../components/motif/MotifTableIR';
import CSVWindow from '../../components/table/Table' 

import './Motif.css'

const Motif = () => {
  const [selectedOrganism, setSelectedOrganism] = useState(null);
  const [selectedIRRow, setSelectedIRRow] = useState(null);

  const handleRowClick = (row) => {
    console.log('Organismo seleccionado:', row);
    setSelectedOrganism(row);
  };

  const handleIRRowClick = (irRow) => {
    console.log('IR seleccionado:', irRow);
    setSelectedIRRow(irRow); // irRow puede ser null para deseleccionar
  };
  
  return (
    <div className="dashboard">
      <Sidebar /> 
      <main className="main-content">
        <div className="grid">
          {/* Ventana 1 + 2 */}
          <div className="card card-large">
            <MotifRepliconPlot selectedOrganism={selectedOrganism} selectedIRRow={selectedIRRow} /> 
          </div>

          {/* Ventana 3: Tabla IR */}
          <div className="card">
            <MotifTableIR selectedOrganism={selectedOrganism} onRowClick={handleIRRowClick} />
          </div>
          
          <div className="card">
            {/* Ventana 4 */ }
            <CSVWindow onRowClick={handleRowClick} />
          </div>
        </div>
      </main>     
    </div>
  );
}

export default Motif;
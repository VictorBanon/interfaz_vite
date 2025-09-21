import React, { useState } from 'react';
import Sidebar from '../../components/sidebar/Sidebar';
import Replicon_plot from '../../components/spatial/Replicon_plot';
import LinearRegressionPlot from '../../components/spatial/region_plot';
import CSVWindow from '../../components/table/Table' 

import './Spatial.css'

const Spatial = () => {
  const [selectedOrganism, setSelectedOrganism] = useState(null);

  const handleRowClick = (row) => {
    console.log('Organismo seleccionado:', row);
    setSelectedOrganism(row);
  };
  return (
    <div className="dashboard">
      <Sidebar /> 
      <main className="main-content">
        <div className="grid">
          {/* Ventana 1 + 2 */}
          <div className="card card-large">
            <Replicon_plot selectedOrganism={selectedOrganism} /> 
          </div>

          {/* Ventana 3: Poisson regression */}
          <div className="card">
            <LinearRegressionPlot />
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

export default Spatial;

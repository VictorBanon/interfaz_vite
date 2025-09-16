import React, { useState, useEffect } from 'react'
import Sidebar from '../../components/sidebar/Sidebar'
import './Kmer.css'
import CSVWindow from '../../components/table/Table' 
import ACP from '../../components/ACP/ACP'
import KmerPlot from '../../components/kmer/kmer_plot'

const Kmer = () => {
  const [kmerData, setKmerData] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);

  useEffect(() => {
    // Aquí cargarías los datos necesarios para el gráfico
    // setKmerData(cargados);
  }, []);

  return (
    <div className="dashboard">
      <Sidebar />
      <main className="main-content">
        <div className="grid">
          <div className="card">
            {/* Ventana 1 */ }
            <ACP 
              csvPath="/data/philogenie/Bacteria/acp_hc_all_Bacteria.csv"  
            />

          </div>
          <div className="card">Ventana 2</div>
          <div className="card">
            <KmerPlot 
              id={selectedElement?.id}
              data={kmerData} // Necesitarás cargar estos datos
            />
          </div>
          <div className="card">
          {/* Ventana 4 */ }
          <CSVWindow />
          </div>
        </div>
      </main>
    </div>
  )
}

export default Kmer
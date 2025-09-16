import React from 'react'
import Sidebar from '../components/sidebar/Sidebar'
import CSVWindow from '../components/CSVWindow' 
import ACP from '../components/ACP' 


{/* https://www.youtube.com/watch?v=7D3kXabIUoM */}

const Structural = () => {
  return (
    <div className="dashboard">
      <Sidebar />
      <main className="main-content">
        <div className="grid">
          <div className="card">
            {/* Ventana 1 */ }
            <ACP csvPath="/data/philogenie/Bacteria/acp_hc_all_Bacteria.csv" pcNumber={5} />
            

          </div>
          <div className="card">Ventana 2</div>
          <div className="card">Ventana 3</div> 
          <div className="card">
          {/* Ventana 4 */ }
          <CSVWindow />
          </div>       
        </div>
      </main>
    </div>
  )
}

export default Structural
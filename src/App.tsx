import { useState } from 'react'
import './App.css'
import ListWindow from './components/ListWindow'
import ChartWindow from './components/ChartWindow'
import DetailWindow from './components/DetailWindow'

function App() {
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [chartData, setChartData] = useState<number[]>([10, 20, 30, 40])

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <h2>Menú</h2>
        <ul>
          <li><a href="#">Inicio</a></li>
          <li><a href="#">Perfil</a></li>
          <li><a href="#">Configuración</a></li>
          <li><a href="#">Cerrar Sesión</a></li>
        </ul>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <div className="grid">
          {/* Subventana 1: Lista */}
          <div className="card">
            <ListWindow onItemSelect={(item) => setSelectedItem(item)} />
          </div>

          {/* Subventana 2: Gráfico */}
          <div className="card">
            <ChartWindow data={chartData} selectedItem={selectedItem} />
          </div>

          {/* Subventana 3: Detalles */}
          <div className="card">
            <DetailWindow selectedItem={selectedItem} />
          </div>

          {/* Subventana 4: Información adicional */}
          <div className="card">
            <p>Información adicional o contenido personalizado.</p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App

import { useState } from 'react'
import './App.css'
import CSVWindow from './components/CSVWindow'
import PlotWindow from './components/PlotWindow'

function App() {
  const [selectedRow, setSelectedRow] = useState<any | null>(null)

  const generateRandomData = () => {
    return Array.from({ length: 10 }, () => Math.floor(Math.random() * 100))
  }

  const getRowTitle = () => {
    if (!selectedRow) return 'Sin selección'
    return selectedRow['Especie'] || 'Sin nombre' // Cambia "Especie" por la columna que contiene el nombre relevante
  }

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
          {/* Ventana 1: Tabla CSV */}
          <div className="card">
            <CSVWindow onRowClick={(row) => setSelectedRow(row)} />
          </div>

          {/* Ventana 2: Gráfico 1 */}
          <div className="card">
            <PlotWindow
              title={`Gráfico 1 - ${getRowTitle()}`}
              data={selectedRow ? generateRandomData() : []}
            />
          </div>

          {/* Ventana 3: Gráfico 2 */}
          <div className="card">
            <PlotWindow
              title={`Gráfico 2 - ${getRowTitle()}`}
              data={selectedRow ? generateRandomData() : []}
            />
          </div>

          {/* Ventana 4: Gráfico 3 */}
          <div className="card">
            <PlotWindow
              title={`Gráfico 3 - ${getRowTitle()}`}
              data={selectedRow ? generateRandomData() : []}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

export default App

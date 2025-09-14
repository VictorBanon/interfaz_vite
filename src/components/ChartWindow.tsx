import React from 'react'

interface ChartWindowProps {
  data: number[]
  selectedItem: string | null
}

const ChartWindow: React.FC<ChartWindowProps> = ({ data, selectedItem }) => {
  return (
    <div>
      <h3>Gráfico</h3>
      <p>{selectedItem ? `Seleccionado: ${selectedItem}` : 'Selecciona un elemento de la lista'}</p>
      <div style={{ display: 'flex', gap: '10px' }}>
        {data.map((value, index) => (
          <div
            key={index}
            style={{
              width: '20px',
              height: `${value * 5}px`,
              backgroundColor: selectedItem === `Elemento ${index + 1}` ? 'blue' : 'gray',
            }}
          ></div>
        ))}
      </div>
    </div>
  )
}

export default ChartWindow
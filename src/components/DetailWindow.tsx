import React from 'react'

interface DetailWindowProps {
  selectedItem: string | null
}

const DetailWindow: React.FC<DetailWindowProps> = ({ selectedItem }) => {
  return (
    <div>
      <h3>Detalles</h3>
      {selectedItem ? (
        <p>Has seleccionado: {selectedItem}</p>
      ) : (
        <p>Selecciona un elemento del gráfico para ver los detalles.</p>
      )}
    </div>
  )
}

export default DetailWindow
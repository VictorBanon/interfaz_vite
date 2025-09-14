import React from 'react'

interface ListWindowProps {
  onItemSelect: (item: string) => void
}

const ListWindow: React.FC<ListWindowProps> = ({ onItemSelect }) => {
  const items = ['Elemento 1', 'Elemento 2', 'Elemento 3', 'Elemento 4']

  return (
    <div>
      <h3>Lista de elementos</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>
            <button onClick={() => onItemSelect(item)}>{item}</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ListWindow
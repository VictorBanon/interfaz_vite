import React, { useState, useEffect, useRef, MouseEvent } from 'react'
import Papa from 'papaparse'
import './tree.css'

interface TaxonomyNode {
  name: string
  children?: TaxonomyNode[]
  count: number  // Añadimos el contador
}

interface Position {
  x: number
  y: number
}

interface TreeNodeProps {
  node: TaxonomyNode
  level?: number
  onNodeClick: (nodeName: string) => void
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, level = 0, onNodeClick }) => {
  const [collapsed, setCollapsed] = useState(true)
  const nodeRef = useRef<HTMLDivElement>(null)

  const toggleCollapse = () => {
    setCollapsed(!collapsed)
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onNodeClick(node.name)
    toggleCollapse()
  }

  return (
    <div className="node-container" style={{ position: 'relative' }}>
      <div
        ref={nodeRef}
        onClick={handleClick}
        className="node"
        style={{
          cursor: 'pointer',
          padding: '0.5rem 1rem',
          border: '1px solid #ccc',
          borderRadius: '4px',
          display: 'inline-block',
          position: 'relative',
          backgroundColor: '#f9f9f9',
          zIndex: 1
        }}
      >
        {node.name} <span className="node-count">({node.count})</span>
      </div>

      {!collapsed && node.children && node.children.length > 0 && (
        <div
          className="children-container"
          style={{
            position: 'relative',
            paddingTop: '20px',
            marginLeft: '40px'
          }}
        >
          {/* Línea vertical desde el padre */}
          <div
            className="vertical-line"
            style={{
              position: 'absolute',
              left: '-20px',
              top: '0',
              width: '2px',
              height: '100%',
              backgroundColor: '#666'
            }}
          />
          
          {node.children.map((child, index) => (
            <div
              key={index}
              className="child-node"
              style={{
                position: 'relative',
                marginBottom: '10px'
              }}
            >
              {/* Línea horizontal hacia el hijo */}
              <div
                className="horizontal-line"
                style={{
                  position: 'absolute',
                  left: '-20px',
                  top: '50%',
                  width: '20px',
                  height: '2px',
                  backgroundColor: '#666'
                }}
              />
              <TreeNode node={child} level={level + 1} onNodeClick={onNodeClick} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface TaxonomicTreeProps {
  onNodeSelect: (nodeName: string) => void;
}

const TaxonomicTree: React.FC<TaxonomicTreeProps> = ({ onNodeSelect }) => {
  const [taxonomyData, setTaxonomyData] = useState<TaxonomyNode[] | null>(null)
  const [scale, setScale] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (containerRef.current && 
        (target.classList.contains('tree-content') || target === containerRef.current)) {
      setIsDragging(true)
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Manejador para el zoom con la rueda del ratón
  const handleWheel = (e: WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale(prevScale => {
        const newScale = prevScale * delta;
        // Limitar el zoom entre 0.5 y 3
        return Math.min(Math.max(newScale, 0.5), 3);
      });
    }
  };

  useEffect(() => {
    const container = document.querySelector('.tree-container');
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
    };
  }, []);

  useEffect(() => {
    // Cargar y procesar el archivo CSV
    Papa.parse('/data/taxonomy.csv', {
      download: true,
      header: true,
      complete: (result) => {
        const treeData = buildTaxonomicTree(result.data)
        setTaxonomyData(treeData)
      },
    })
  }, [])

  const buildTaxonomicTree = (data: any[]) => {
    const tree: any = {}
    
    // Primero construimos el árbol y contamos las ocurrencias
    data.forEach((row) => {
      let currentLevel = tree
      const levels = ['superkingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species']
      
      levels.forEach((level) => {
        const value = row[level]
        if (!currentLevel[value]) {
          currentLevel[value] = { 
            name: value, 
            children: {},
            count: 0 
          }
        }
        currentLevel[value].count++
        currentLevel = currentLevel[value].children
      })
    })

    const convertToTreeArray = (node: any): TaxonomyNode[] => {
      return Object.keys(node).map((key) => ({
        name: key,
        count: node[key].count,
        children: convertToTreeArray(node[key].children),
      }))
    }

    return convertToTreeArray(tree)
  }

  const handleNodeClick = (nodeName: string) => {
    onNodeSelect(nodeName)
  }

  return (
    <div 
      ref={containerRef}
      className="tree-container"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="tree-header">
        Taxonomic Treeb     
      </div>
      {taxonomyData ? (
        <div 
          className={`tree-content ${isDragging ? 'dragging' : ''}`}
          style={{ 
            transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
        >
          {taxonomyData.map((node, index) => (
            <TreeNode 
              key={index} 
              node={node} 
              onNodeClick={handleNodeClick}
            />
          ))}
        </div>
      ) : (
        <p>Cargando datos...</p>
      )}
    </div>
  )
}

export default TaxonomicTree
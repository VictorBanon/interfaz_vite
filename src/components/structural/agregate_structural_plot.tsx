import React, { useState, useEffect } from 'react'
import Plot from 'react-plotly.js'

interface AggregateProps {
  aggregate: string
  pcX: number
  pcY: number
  id?: string
  idReplicon?: string
}

const AggregateStructural: React.FC<AggregateProps> = ({ 
  aggregate, 
  pcX, 
  pcY, 
  id, 
  idReplicon 
}) => {
  // Función para generar datos simulados de distribución normal
  const generateNormalDistribution = (size: number, mean: number, std: number) => {
    return Array.from({ length: size }, (_, i) => 
      Array.from({ length: size }, (_, j) => {
        // Crear patrones diferentes según la posición
        const value = Math.random() * std + mean + 
                     Math.sin(i/size * Math.PI) * 0.5 + 
                     Math.cos(j/size * Math.PI) * 0.5
        return value
      })
    )
  }

  // Datos simulados con diferentes patrones para cada tipo
  const simulatedData = {
    pcX: generateNormalDistribution(20, 0, 1),
    pcY: generateNormalDistribution(20, 0, 1),
    max: generateNormalDistribution(20, 1.5, 0.5), // Valores más altos
    min: generateNormalDistribution(20, -0.5, 0.3), // Valores más bajos
    median: generateNormalDistribution(20, 0.5, 0.2) // Valores intermedios
  }

  // Configuraciones específicas para cada tipo de visualización
  const plotConfigs = {
    max: {
      colorscale: [
        [0, 'rgb(255, 255, 255)'],
        [1, 'rgb(255, 0, 0)']
      ],
      zmin: 0,
      zmax: 2,
      title: 'Maximum Distribution'
    },
    min: {
      colorscale: [
        [0, 'rgb(0, 0, 255)'],
        [1, 'rgb(255, 255, 255)']
      ],
      zmin: -1,
      zmax: 0,
      title: 'Minimum Distribution'
    },
    median: {
      colorscale: [
        [0, 'rgb(255, 255, 0)'],
        [0.5, 'rgb(0, 255, 0)'],
        [1, 'rgb(0, 128, 0)']
      ],
      zmin: 0,
      zmax: 1,
      title: 'Median Distribution'
    }
  }

  // Labels para los ejes
  const labels = {
    x: Array.from({ length: 20 }, (_, i) => `Size ${i + 3}`),
    y: Array.from({ length: 20 }, (_, i) => `Pos ${i}`)
  }

  if (aggregate === "PC") {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>
        <div style={{ flex: 1 }}>
          <Plot
            data={[{
              z: simulatedData.pcX,
              x: labels.x,
              y: labels.y,
              type: 'heatmap',
              showscale: true,
              colorscale: [
                [0, 'rgb(0, 0, 255)'],
                [0.5, 'rgb(255, 255, 255)'],
                [1, 'rgb(255, 0, 0)']
              ],
              zmin: -1,
              zmax: 1,
              name: `PC${pcX}`
            }]}
            layout={{
              title: `PC${pcX} Distribution`,
              autosize: true,
              margin: { l: 50, r: 50, t: 30, b: 30 },
              height: null
            }}
            style={{ width: '100%', height: '100%' }}
            useResizeHandler={true}
            config={{ responsive: true, displayModeBar: true }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <Plot
            data={[{
              z: simulatedData.pcY,
              x: labels.x,
              y: labels.y,
              type: 'heatmap',
              showscale: true,
              colorscale: [
                [0, 'rgb(0, 0, 255)'],
                [0.5, 'rgb(255, 255, 255)'],
                [1, 'rgb(255, 0, 0)']
              ],
              zmin: -1,
              zmax: 1,
              name: `PC${pcY}`
            }]}
            layout={{
              title: `PC${pcY} Distribution`,
              autosize: true,
              margin: { l: 50, r: 50, t: 30, b: 30 },
              height: null
            }}
            style={{ width: '100%', height: '100%' }}
            useResizeHandler={true}
            config={{ responsive: true, displayModeBar: true }}
          />
        </div>
      </div>
    )
  }

  // Para otros tipos de agregación (max, min, median)
  const config = plotConfigs[aggregate as keyof typeof plotConfigs]
  if (!config) return null

  return (
    <Plot
      data={[{
        z: simulatedData[aggregate as keyof typeof simulatedData],
        x: labels.x,
        y: labels.y,
        type: 'heatmap',
        showscale: true,
        colorscale: config.colorscale,
        zmin: config.zmin,
        zmax: config.zmax,
        hovertemplate: 
          'Size: %{x}<br>' +
          'Position: %{y}<br>' +
          'Value: %{z:.3f}' +
          '<extra></extra>',
      }]}
      layout={{
        title: config.title,
        autosize: true,
        margin: { l: 50, r: 50, t: 30, b: 30 },
        xaxis: {
          title: 'Size',
          titlefont: { size: 10 },
          tickfont: { size: 8 }
        },
        yaxis: {
          title: 'Position',
          titlefont: { size: 10 },
          tickfont: { size: 8 }
        },
        hoverlabel: {
          bgcolor: 'white',
          font: { size: 12 }
        }
      }}
      style={{ width: '100%', height: '100%' }}
      useResizeHandler={true}
      config={{ 
        responsive: true, 
        displayModeBar: true,
        displaylogo: false,
        toImageButtonOptions: {
          format: 'png',
          filename: `${aggregate}_distribution`,
          height: 1000,
          width: 1000,
          scale: 2
        }
      }}
    />
  )
}

export default AggregateStructural


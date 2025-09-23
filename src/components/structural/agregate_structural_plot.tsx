import React, { useState, useEffect } from 'react'
import Plot from 'react-plotly.js'
import Papa from 'papaparse'
import { buildACPFilePath } from '../../utils/taxonomyUtils' 

interface AggregateProps {
  aggregate: string
  pcX: number
  pcY: number
  id?: string
  idReplicon?: string
  taxon?: string
  taxonValue?: string
  part?: string
}

const AggregateStructural: React.FC<AggregateProps> = ({ 
  aggregate, 
  pcX, 
  pcY,
  taxon,
  taxonValue, 
  part
}) => { 

  const [csvData, setCsvData] = useState<{ pcX: number[][]; pcY: number[][] }>({ pcX: [], pcY: [] })

  useEffect(() => {
    const fetchCsvData = async (filePath: string): Promise<number[][]> => {
      return new Promise((resolve, reject) => {
        Papa.parse(filePath, {
          download: true,
          dynamicTyping: true, // let PapaParse turn numeric strings into numbers
          complete: (result) => {
            const data = result.data as (string | number)[][]
        
            // Transpose the data
            const transposedData = data[0].map((_, colIndex) => data.map(row => row[colIndex]))
        
            const filtered = transposedData.filter(row => row.length > 1)
        
            // header row → x labels
            const header = filtered[0] as string[]
            const xLabels = header.slice(1)
        
            // rows → y labels and z matrix
            const yLabels = filtered.slice(1).map(row => String(row[0]))
            const zMatrix = filtered.slice(1).map(row =>
              row.slice(1).map(value => Number(value))
            )
            const sizeLabels = xLabels
            const positionLabels = yLabels
            const textMatrix = zMatrix.map((row, i) =>
              row.map((value, j) => {
              const logValue = Math.log10(Math.abs(value) + 1)
              return `Size: ${sizeLabels[j]}<br>` +
                  `Position: ${positionLabels[i]}<br>` +
                  `Value: ${value.toFixed(3)}<br>` +
                  `Log10: ${logValue.toFixed(2)}`
              })
            )

            resolve({ z: zMatrix, x: xLabels, y: yLabels, text: textMatrix }) 
          },
          error: (error) => reject(error)
        })
      })
    } 

    const loadCsvData = async () => {
      try {
        let pcXPath, pcYPath;
        
        // Si tenemos parámetros taxonómicos, usar rutas dinámicas
        if (taxon && taxonValue && part) {
          // Construir rutas independientemente para cada PC
          pcXPath = await buildACPFilePath(taxon, taxonValue, part, 'PC', pcX)
          pcYPath = await buildACPFilePath(taxon, taxonValue, part, 'PC', pcY)
          
          // Ajustar las rutas para usar el formato correcto de PC
          pcXPath = pcXPath.replace('acp_hc_', `PC${pcX}_hc_`)
          pcYPath = pcYPath.replace('acp_hc_', `PC${pcY}_hc_`)
        } else {
          // Rutas por defecto
          pcXPath = `./data/philogenie/Bacteria/PC${pcX}_hc_${part || 'cod'}_Bacteria.csv`
          pcYPath = `./data/philogenie/Bacteria/PC${pcY}_hc_${part || 'cod'}_Bacteria.csv`
        }
        
        console.log('Loading PC data from:', { pcXPath, pcYPath })
        
        const pcXData = await fetchCsvData(pcXPath)
        const pcYData = await fetchCsvData(pcYPath)
        setCsvData({ pcX: pcXData, pcY: pcYData })
      } catch (error) {
        console.error('Error loading CSV data:', error)
        // Fallback a rutas por defecto
        try {
          const pcXData = await fetchCsvData(`./data/philogenie/Bacteria/PC${pcX}_hc_cod_Bacteria.csv`)
          const pcYData = await fetchCsvData(`./data/philogenie/Bacteria/PC${pcY}_hc_cod_Bacteria.csv`)
          setCsvData({ pcX: pcXData, pcY: pcYData })
        } catch (fallbackError) {
          console.error('Fallback loading also failed:', fallbackError)
        }
      }
    }

    loadCsvData()
  }, [pcX, pcY, taxon, taxonValue, part])

  console.log('CSV Data:', csvData)

  const DataPlot = {
    pcX: csvData.pcX,
    pcY: csvData.pcY,
    max: [], // Placeholder for other data types
    min: [],
    median: []
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
 

  if (aggregate === "PC") {
    return (
      <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', height: '100%' }}>
        <div style={{ flex: 1 }}>
          <Plot
            data={[{
              z: DataPlot.pcX.z,
              x: DataPlot.pcX.x,
              y: DataPlot.pcX.y,
              type: 'heatmap',
              showscale: true,
              colorscale: [
                [0, 'rgb(0, 0, 255)'],
                [0.5, 'rgb(255, 255, 255)'],
                [1, 'rgb(255, 0, 0)']
              ],
              zmin: -1,
              zmax: 1,
              text: DataPlot.pcX.text,
              hoverinfo: 'text',
              name: `PC${pcX}`
            }]}
            layout={{
              title: `PC${pcX} Distribution`,
              autosize: true,
              margin: { l: 50, r: 50, t: 30, b: 30 },
              xaxis: {
                title: 'Size',
                titlefont: { size: 10 },
                tickfont: { size: 8 },
                side: 'bottom'
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
              displaylogo: false
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <Plot
            data={[{
              z: DataPlot.pcY.z,
              x: DataPlot.pcY.x,
              y: DataPlot.pcY.y,
              type: 'heatmap',
              showscale: true,
              colorscale: [
                [0, 'rgb(0, 0, 255)'],
                [0.5, 'rgb(255, 255, 255)'],
                [1, 'rgb(255, 0, 0)']
              ],
              zmin: -1,
              zmax: 1,
              text: DataPlot.pcY.text,
              hoverinfo: 'text',
              name: `PC${pcY}` // Cambiar de pcX a pcY
            }]}
            layout={{
              title: `PC${pcY} Distribution`, // Cambiar de pcX a pcY
              autosize: true,
              margin: { l: 50, r: 50, t: 30, b: 30 },
              xaxis: {
                title: 'Size',
                titlefont: { size: 10 },
                tickfont: { size: 8 },
                side: 'bottom'
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
              displaylogo: false
            }}
          />
        </div>
      </div>
    )
  }

  // Para otros tipos de agregación (max, min, median)
  const config = plotConfigs[aggregate as keyof typeof plotConfigs]
  if (!config) return null

  return (
    <div>
      Error
    </div>
  )
}

export default AggregateStructural


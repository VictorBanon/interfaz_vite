import React, { useState, useEffect } from 'react'
import Plot from 'react-plotly.js'
import Papa from 'papaparse'
import { buildACPFilePath } from '../../utils/taxonomyUtils'

// Declare Plotly for TypeScript
declare global {
  interface Window {
    Plotly: {
      relayout: (div: any, update: any) => Promise<any>;
      Plots: {
        resize: (div: any) => void;
      };
    };
  }
}
 

interface AggregateProps {
  aggregate: string
  pcX: number
  pcY: number
  id?: string
  idReplicon?: string
  taxon?: string
  taxonValue?: string
  part?: string
  maxPC?: number
  selectedPCs?: number[]
  groupBy?: string
}

const AggregateStructural: React.FC<AggregateProps> = ({ 
  aggregate, 
  pcX, 
  pcY,
  taxon,
  taxonValue, 
  part,
  selectedPCs = [1, 2, 3, 4, 5, 6],
  groupBy = "family"
}) => { 

  const [csvData, setCsvData] = useState<{ pcX: any; pcY: any; minMaxData?: any; meanMedianData?: any; acpData?: any; pcaTaxonData?: any }>({ pcX: [], pcY: [] })
  const [loading, setLoading] = useState(false)
  const [currentYRange, setCurrentYRange] = useState<[number, number]>([-0.5, 12.5]) // Shared Y range state

  // Helper function to build mean/median file paths using hierarchical structure
  const buildMeanMedianPath = async (taxon: string, taxonValue: string, part: string, type: string): Promise<string> => {
    try {
      // Si tenemos jerarquía taxonómica, intentar usar la estructura jerárquica
      if (taxon && taxonValue && taxon !== 'superkingdom') {
        // Usar buildACPFilePath como base pero modificar el nombre del archivo
        const acpPath = await buildACPFilePath(taxon, taxonValue, part, 'hc', 1, 2)
        const basePath = acpPath.substring(0, acpPath.lastIndexOf('/'))
        return `${basePath}/hc_${taxonValue}_${part}_${type}.csv`
      } else {
        // Para superkingdom o casos simples, usar estructura directa
        return `/data/philogenie/Bacteria/hc_${taxonValue || 'Bacteria'}_${part || 'all'}_${type}.csv`
      }
    } catch (error) {
      console.error('Error building hierarchical path, using fallback:', error)
      return `/data/philogenie/Bacteria/hc_${taxonValue || 'Bacteria'}_${part || 'all'}_${type}.csv`
    }
  }

  // Update Y range when PCA_Taxon data changes
  useEffect(() => {
    if (aggregate === "PCA_Taxon" && csvData.pcaTaxonData?.data) {
      const dataLength = csvData.pcaTaxonData.data.length
      setCurrentYRange([-0.5, dataLength - 0.5])
    }
  }, [aggregate, csvData.pcaTaxonData?.data?.length])

  useEffect(() => {
    const fetchCsvData = async (filePath: string): Promise<any> => {
      return new Promise((resolve, reject) => {
        Papa.parse(filePath, {
          download: true,
          dynamicTyping: true, // let PapaParse turn numeric strings into numbers
          complete: (result: any) => {
            const data = result.data as (string | number)[][]
        
            // Transpose the data
            const transposedData = data[0].map((_, colIndex: number) => data.map(row => row[colIndex]))
        
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
            console.log('Parsed CSV Data:', { xLabels, yLabels, zMatrix, textMatrix })

            resolve({ z: zMatrix, x: xLabels, y: yLabels, text: textMatrix }) 
          },
          error: (error: any) => reject(error)
        })
      })
    }

    const fetchMinMaxData = async (filePath: string): Promise<any> => {
      return new Promise((resolve, reject) => {
        Papa.parse(filePath, {
          download: true,
          header: true,
          dynamicTyping: true,
          complete: (result: any) => {
            const data = result.data as any[]
            console.log('Min-Max Data parsed:', data)
            
            // Crear mapas para organizar los datos por arm y gap
            const minData = new Map<string, number>()
            const maxData = new Map<string, number>()
            
            // Determinar si el archivo tiene columna frequency
            const hasFrequencyColumn = data.length > 0 && 'frequency' in data[0]
            console.log('Has frequency column:', hasFrequencyColumn)
            
            // Si no hay columna frequency, calcular el total para calcular frecuencias
            let totalCount = 0
            if (!hasFrequencyColumn) {
              totalCount = data.reduce((sum, row) => sum + (parseInt(row.count) || 0), 0)
              console.log('Total count for frequency calculation:', totalCount)
            }
            
            // Procesar cada fila del CSV
            data.forEach((row: any) => {
              const arm = parseInt(row.arm)
              const gap = parseInt(row.gap)
              const count = parseInt(row.count) || 0
              const minMax = row.min_max
              
              // Calcular frequency basada en si la columna existe o no
              let frequency: number
              if (hasFrequencyColumn && row.frequency !== undefined) {
                frequency = parseFloat(row.frequency) || 0
              } else {
                // Calcular frequency como count/total si no existe la columna
                frequency = totalCount > 0 ? count / totalCount : 0
              }
              
              const key = `${arm},${gap}`
              
              if (minMax === 'min') {
                minData.set(key, frequency)
              } else if (minMax === 'max') {
                maxData.set(key, frequency)
              }
            })
            
            // Forzar rangos específicos para consistencia en la visualización
            const minArm = 3   // Fijo: empezar desde arm = 3
            const maxArm = 20  // Fijo: hasta arm = 20
            const minGap = 0   // Fijo: empezar desde gap = 0
            const maxGap = 20  // Fijo: hasta gap = 20
            
            console.log('Fixed ranges used:', { minArm, maxArm, minGap, maxGap })
            
            // Función para crear matriz
            const createMatrix = (dataMap: Map<string, number>) => {
              const matrix: number[][] = []
              const xLabels: string[] = []
              const yLabels: string[] = []
              
              // Crear etiquetas Y (gap values de minGap a maxGap)
              for (let gap = minGap; gap <= maxGap; gap++) {
                yLabels.push(String(gap))
              }
              
              // Crear etiquetas X (arm values de minArm a maxArm) 
              for (let armValue = minArm; armValue <= maxArm; armValue++) {
                xLabels.push(String(armValue))
              }
              
              // Crear matriz con dimensiones correctas
              for (let i = 0; i <= maxGap - minGap; i++) {
                matrix[i] = new Array(maxArm - minArm + 1).fill(0)
              }
              
              // Llenar matriz con datos
              dataMap.forEach((frequency, key) => {
                const [armStr, gapStr] = key.split(',')
                const armValue = parseInt(armStr)
                const gap = parseInt(gapStr)
                
                // Verificar que los valores estén dentro de los rangos fijos
                if (armValue >= minArm && armValue <= maxArm && gap >= minGap && gap <= maxGap) {
                  const armIndex = armValue - minArm  // Ajustar índice basado en minArm
                  const gapIndex = gap - minGap
                  
                  if (gapIndex >= 0 && gapIndex < matrix.length && 
                      armIndex >= 0 && armIndex < matrix[0].length) {
                    matrix[gapIndex][armIndex] = frequency
                  }
                }
              })
              
              // Crear texto para hover
              const textMatrix = matrix.map((row, i) =>
                row.map((value, j) =>
                  `Gap: ${i + minGap}<br>Arm: ${j + minArm}<br>Frequency: ${value.toFixed(3)}`
                )
              )
              
              return { z: matrix, x: xLabels, y: yLabels, text: textMatrix }
            }
            
            const minResult = createMatrix(minData)
            const maxResult = createMatrix(maxData)
            
            resolve({
              min: minResult,
              max: maxResult
            })
          },
          error: (error: any) => reject(error)
        })
      })
    }

    const fetchMeanMedianData = async (meanFilePath: string, medianFilePath: string): Promise<any> => {
      const processCsvFile = async (filePath: string): Promise<any> => {
        return new Promise((resolve, reject) => {
          Papa.parse(filePath, {
            download: true,
            dynamicTyping: true,
            complete: (result: any) => {
              const data = result.data as (string | number)[][]
              
              // Procesar igual que en structural_plot.tsx
              // Filtrar filas vacías y la última si está vacía
              const cleanData = data.filter(row => row.length > 1)
              if (cleanData[cleanData.length - 1].length === 0) {
                cleanData.pop()
              }
              
              // Extraer etiquetas directamente
              const sizeLabels = cleanData.slice(1).map(row => row[0])
              const positionLabels = cleanData[0].slice(1)
              
              // Crear matriz de datos numéricos
              const dataMatrix = cleanData.slice(1).map(row =>
                row.slice(1).map(value => Number(value) || 0)
              )
              
              // Transponer la matriz
              const transposed = dataMatrix[0].map((_, colIndex) =>
                dataMatrix.map(row => row[colIndex])
              )
              
              // Crear matriz logarítmica
              const logMatrix = transposed.map(row =>
                row.map(value => value > 0 ? Math.log10(value) : -1)
              )
              
              // Crear matriz de texto para hover
              const textMatrix = transposed.map((row, i) =>
                row.map((value, j) => {
                  const logValue = value > 0 ? Math.log10(value) : -1
                  return `Size: ${sizeLabels[j]}<br>Position: ${positionLabels[i]}<br>Value: ${value.toFixed(3)}<br>Log10: ${logValue.toFixed(2)}`
                })
              )
              
              resolve({ z: logMatrix, x: sizeLabels, y: positionLabels, text: textMatrix })
            },
            error: (error: any) => reject(error)
          })
        })
      }
      
      try {
        const [meanResult, medianResult] = await Promise.all([
          processCsvFile(meanFilePath),
          processCsvFile(medianFilePath)
        ])
        
        return {
          mean: meanResult,
          median: medianResult
        }
      } catch (error) {
        throw error
      }
    } 

    const fetchACPData = async (filePath: string): Promise<any> => {
      return new Promise((resolve, reject) => {
        Papa.parse(filePath, {
          download: true,
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (result: any) => {
            const data = result.data as any[]
            console.log('ACP Data parsed:', data)
            
            // Return raw data without grouping - grouping will be done at render time
            resolve({ data })
          },
          error: (error: any) => reject(error)
        })
      })
    }

    const fetchPCATaxonData = async (filePath: string): Promise<any> => {
      return new Promise((resolve, reject) => {
        Papa.parse(filePath, {
          download: true,
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (result: any) => {
            const data = result.data as any[]
            
            // Filter out any completely empty rows
            const filteredData = data.filter((row: any) => {
              return Object.values(row).some(val => val !== null && val !== undefined && val !== '')
            })
            
            // Extract PC columns and taxonomic data
            const pcColumns = Object.keys(filteredData[0] || {}).filter(key => key.startsWith('PC'))
            const taxonomicColumns = ['superkingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species']
            
            // Build taxonomic tree structure
            const taxonomicTree: any = {}
            filteredData.forEach((row: any) => {
              let current = taxonomicTree
              taxonomicColumns.forEach((level) => {
                const value = row[level] || 'Unknown'
                if (!current[value]) {
                  current[value] = { children: {}, data: [] }
                }
                current[value].data.push(row)
                current = current[value].children
              })
            })
            
            resolve({ data: filteredData, pcColumns, taxonomicTree, taxonomicColumns })
          },
          error: (error: any) => reject(error)
        })
      })
    }

    const loadCsvData = async () => {
      try {
        setLoading(true)
        console.log('Loading CSV data for aggregate type:', aggregate, { taxon, taxonValue, part })
        
        if (aggregate === "Min-Max") {
          try {
            // Validar parámetros antes de construir ruta dinámica
            if (taxon && taxonValue && part) {
              const dynamicPath = await buildACPFilePath(taxon, taxonValue, part, 'min_max', pcX, pcY)
              console.log('Dynamic Min-Max path built:', dynamicPath)
              console.log('Min-Max parameters used:', { taxon, taxonValue, part })
              const minMaxData = await fetchMinMaxData(dynamicPath)
              console.log('Min-Max data loaded from dynamic path:', minMaxData)
              setCsvData({ 
                pcX: [], 
                pcY: [], 
                minMaxData: minMaxData,
                meanMedianData: undefined
              })
            } else {
              console.log('Missing parameters for Min-Max dynamic path:', { taxon, taxonValue, part })
              throw new Error('Missing required parameters for dynamic path')
            }
          } catch (error) {
            // Fallback a ruta estática
            console.log('Dynamic path failed, using fallback for Min-Max:', error)
            const fallbackPath = `/data/philogenie/Bacteria/hc_Bacteria_${part || 'all'}_min_max.csv`
            console.log('Loading Min-Max from fallback:', fallbackPath)
            const minMaxData = await fetchMinMaxData(fallbackPath)
            setCsvData({ 
              pcX: [], 
              pcY: [], 
              minMaxData: minMaxData,
              meanMedianData: undefined
            })
          }
        } else if (aggregate === "Mean-Median") {
          try {
            // Construir rutas para archivos mean y median con la estructura jerárquica correcta
            const meanPath = await buildMeanMedianPath(taxon || 'superkingdom', taxonValue || 'Bacteria', part || 'all', 'mean')
            const medianPath = await buildMeanMedianPath(taxon || 'superkingdom', taxonValue || 'Bacteria', part || 'all', 'median')
            
            console.log('Loading Mean-Median from paths:', { meanPath, medianPath })
            const meanMedianData = await fetchMeanMedianData(meanPath, medianPath)
            console.log('Mean-Median data loaded successfully:', meanMedianData)
            setCsvData({ 
              pcX: [], 
              pcY: [], 
              meanMedianData: meanMedianData,
              minMaxData: undefined
            })
          } catch (error) {
            console.error('Error loading Mean-Median data:', error)
            setCsvData({ pcX: [], pcY: [] })
          }
        } else if (aggregate === "ACPvsAll") {
          try {
            // Para ACPvsAll - solo cargar datos ACP (ya contiene todos los PCs)
            if (taxon && taxonValue && part) {
              const dynamicACPPath = await buildACPFilePath(taxon, taxonValue, part, 'acp', pcX, pcY)
              console.log('Dynamic ACPvsAll path:', { dynamicACPPath })
              
              const acpData = await fetchACPData(dynamicACPPath)
              setCsvData({ 
                pcX: [], 
                pcY: [],
                acpData: acpData,
                minMaxData: undefined,
                meanMedianData: undefined 
              })
            } else {
              throw new Error('Missing required parameters for dynamic path')
            }
          } catch (error) {
            // Fallback a rutas estáticas para ACPvsAll
            console.log('Dynamic paths failed, using fallback for ACPvsAll:', error)
            const fallbackACPPath = `/data/philogenie/Bacteria/acp_hc_${part || 'all'}_Bacteria.csv`
            console.log('Loading ACPvsAll data from fallback:', { fallbackACPPath })
            
            const acpData = await fetchACPData(fallbackACPPath)
            setCsvData({ 
              pcX: [], 
              pcY: [],
              acpData: acpData,
              minMaxData: undefined,
              meanMedianData: undefined 
            })
          }
        } else if (aggregate === "PCA_Taxon") {
          try {
            // Para PCA_Taxon - usar buildACPFilePath para construir la ruta correcta
            if (taxonValue && part && taxon) {
              const pcaTaxonPath = await buildACPFilePath(taxon, taxonValue, part, 'acp', pcX, pcY)
              console.log('Loading PCA_Taxon data from:', pcaTaxonPath)
              
              const pcaTaxonData = await fetchPCATaxonData(pcaTaxonPath)
              setCsvData({ 
                pcX: [], 
                pcY: [],
                pcaTaxonData: pcaTaxonData,
                minMaxData: undefined,
                meanMedianData: undefined,
                acpData: undefined
              })
            } else {
              throw new Error('Missing required parameters for PCA_Taxon')
            }
          } catch (error) {
            // Fallback path if specific file doesn't exist
            console.log('PCA_Taxon path failed, using fallback:', error)
            const fallbackPath = `/data/philogenie/Bacteria/acp_hc_all_Bacteria.csv`
            console.log('Loading PCA_Taxon data from fallback:', fallbackPath)
            
            const pcaTaxonData = await fetchPCATaxonData(fallbackPath)
            setCsvData({ 
              pcX: [], 
              pcY: [],
              pcaTaxonData: pcaTaxonData,
              minMaxData: undefined,
              meanMedianData: undefined,
              acpData: undefined
            })
          }
        } else {
          try {
            // Para PC analysis - usar rutas dinámicas
            if (taxon && taxonValue && part) {
              const dynamicPcXPath = await buildACPFilePath(taxon, taxonValue, part, 'PC', pcX, pcY)
              const dynamicPcYPath = await buildACPFilePath(taxon, taxonValue, part, 'PC', pcX, pcY)
              console.log('Dynamic PC paths:', { dynamicPcXPath, dynamicPcYPath })
              
              const [pcXData, pcYData] = await Promise.all([
                fetchCsvData(dynamicPcXPath.replace(`PC${pcY}`, `PC${pcX}`)),
                fetchCsvData(dynamicPcYPath.replace(`PC${pcX}`, `PC${pcY}`))
              ])
              setCsvData({ 
                pcX: pcXData, 
                pcY: pcYData,
                minMaxData: undefined,
                meanMedianData: undefined 
              })
            } else {
              throw new Error('Missing required parameters for dynamic path')
            }
          } catch (error) {
            // Fallback a rutas estáticas para PC
            console.log('Dynamic paths failed, using fallback for PC:', error)
            const fallbackPcXPath = `/data/philogenie/Bacteria/PC${pcX}_hc_${part || 'all'}_Bacteria.csv`
            const fallbackPcYPath = `/data/philogenie/Bacteria/PC${pcY}_hc_${part || 'all'}_Bacteria.csv`
            console.log('Loading PC data from fallback:', { fallbackPcXPath, fallbackPcYPath })
            
            const [pcXData, pcYData] = await Promise.all([
              fetchCsvData(fallbackPcXPath),
              fetchCsvData(fallbackPcYPath)
            ])
            setCsvData({ 
              pcX: pcXData, 
              pcY: pcYData,
              minMaxData: undefined,
              meanMedianData: undefined 
            })
          }
        }
      } catch (error) {
        console.error('Error loading CSV data:', error)
        setCsvData({ pcX: [], pcY: [] })
      } finally {
        setLoading(false)
      }
    }

    loadCsvData()
  }, [aggregate, pcX, pcY, taxon, taxonValue, part, selectedPCs, groupBy])

  console.log('CSV Data:', csvData)
  console.log('Current aggregate type:', aggregate)
  console.log('Loading state:', loading)
  console.log('MinMax data available:', !!csvData.minMaxData)
  
  if (aggregate === "Min-Max" && csvData.minMaxData) {
    console.log('MinMax data structure:', {
      hasMin: !!csvData.minMaxData.min,
      hasMax: !!csvData.minMaxData.max,
      minData: csvData.minMaxData.min ? Object.keys(csvData.minMaxData.min) : 'no min data',
      maxData: csvData.minMaxData.max ? Object.keys(csvData.minMaxData.max) : 'no max data'
    })
  }

  if (loading) {
    return <div>Cargando datos...</div>
  }

  const DataPlot = {
    pcX: csvData.pcX,
    pcY: csvData.pcY
  }
 

  if (aggregate === "PC") {
    if (!DataPlot.pcX || !DataPlot.pcY || !DataPlot.pcX.z || !DataPlot.pcY.z) {
      return <div>No hay datos PC disponibles</div>
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', height: '100%' }}>
        <div style={{ flex: 1 }}>
          <Plot
            data={[{
              z: DataPlot.pcX.z,
              x: DataPlot.pcX.x,
              y: DataPlot.pcX.y,
              type: 'heatmap',
              colorscale: [
                [0, 'rgb(0, 0, 255)'],
                [0.5, 'rgb(255, 255, 255)'],
                [1, 'rgb(255, 0, 0)']
              ],
              showscale: true,
              text: DataPlot.pcX.text,
              hoverinfo: 'text', 
              zmin: -1,
              zmax: 1,
            }]}
            layout={{
              title: { text: `PC${pcX} Distribution` },
              autosize: true,
              margin: { l: 50, r: 50, t: 30, b: 30 },
              xaxis: {
                title: { text: 'Size' },
                tickfont: { size: 8 },
                side: 'bottom'
              },
              yaxis: {
                title: { text: 'Position' },
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
              colorscale: [
                [0, 'rgb(0, 0, 255)'],
                [0.5, 'rgb(255, 255, 255)'],
                [1, 'rgb(255, 0, 0)']
              ],
              showscale: true,
              text: DataPlot.pcY.text,
              hoverinfo: 'text',
              zmin: -1,
              zmax: 1, 
            }]}
            layout={{
              title: { text: `PC${pcY} Distribution` },
              autosize: true,
              margin: { l: 50, r: 50, t: 30, b: 30 },
              xaxis: {
                title: { text: 'Size' },
                tickfont: { size: 8 },
                side: 'bottom'
              },
              yaxis: {
                title: { text: 'Position' },
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

  // Para Min-Max
  if (aggregate === "Min-Max") {
    const minMaxData = csvData.minMaxData
    if (!minMaxData) {
      return <div>Cargando datos Min-Max...</div>
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', height: '100%' }}>
        <div style={{ flex: 1 }}>
          <Plot
            data={[{
              z: minMaxData.min.z,
              x: minMaxData.min.x,
              y: minMaxData.min.y,
              type: 'heatmap',
              colorscale: [
                [0, 'rgba(255, 255, 255, 1)'],
                [1, 'rgb(0, 0, 255)']
              ],
              showscale: true,
              text: minMaxData.min.text,
              hoverinfo: 'text',
              zmin: 0,
              zmax: 1,
            }]}
            layout={{
              title: { text: 'Minimum Distribution' },
              autosize: true,
              margin: { l: 50, r: 50, t: 30, b: 30 },
              xaxis: {
                title: { text: 'Arm Length' },
                tickfont: { size: 8 },
                side: 'bottom'
              },
              yaxis: {
                title: { text: 'Gap Size' },
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
              z: minMaxData.max.z,
              x: minMaxData.max.x,
              y: minMaxData.max.y,
              type: 'heatmap',
              colorscale: [
                [0, 'hsla(0, 0%, 100%, 1.00)'],
                [1, 'rgb(255, 0, 0)']
              ],
              showscale: true,
              text: minMaxData.max.text,
              hoverinfo: 'text',
              zmin: 0,
              zmax: 1,
            }]}
            layout={{
              title: { text: 'Maximum Distribution' },
              autosize: true,
              margin: { l: 50, r: 50, t: 30, b: 30 },
              xaxis: {
                title: { text: 'Arm Length' },
                tickfont: { size: 8 },
                side: 'bottom'
              },
              yaxis: {
                title: { text: 'Gap Size' },
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

  // Para Mean-Median
  if (aggregate === "Mean-Median") {
    const meanMedianData = csvData.meanMedianData
    if (!meanMedianData) {
      return <div>Cargando datos Mean-Median...</div>
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', height: '100%' }}>
        <div style={{ flex: 1 }}>
          <Plot
            data={[{
              z: meanMedianData.mean.z,
              x: meanMedianData.mean.x,
              y: meanMedianData.mean.y,
              type: 'heatmap',
              colorscale: [
                [0, 'rgb(0, 0, 255)'],
                [0.33, 'rgb(255, 255, 255)'],
                [0.66, 'rgb(255, 0, 0)'],
                [1, 'rgb(0, 0, 0)']
              ],
              showscale: true,
              text: meanMedianData.mean.text,
              hoverinfo: 'text',
              zmin: -1,
              zmax: 2,
              colorbar: {
                title: { text: 'log10(value)' },
                tickfont: { size: 8 },
                len: 0.9,
                tickvals: [-1, 0, 1, 2],
                ticktext: ['≤0.1', '1', '10', '≥100']
              }
            }]}
            layout={{
              title: { text: 'Mean Distribution' },
              autosize: true,
              margin: { l: 50, r: 80, t: 30, b: 50 },
              xaxis: {
                title: { text: 'Size' },
                tickfont: { size: 8 },
                side: 'bottom'
              },
              yaxis: {
                title: { text: 'Position' },
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
              z: meanMedianData.median.z,
              x: meanMedianData.median.x,
              y: meanMedianData.median.y,
              type: 'heatmap',
              colorscale: [
                [0, 'rgb(0, 0, 255)'],
                [0.33, 'rgb(255, 255, 255)'],
                [0.66, 'rgb(255, 0, 0)'],
                [1, 'rgb(0, 0, 0)']
              ],
              showscale: true,
              text: meanMedianData.median.text,
              hoverinfo: 'text',
              zmin: -1,
              zmax: 2,
              colorbar: {
                title: { text: 'log10(value)' },
                tickfont: { size: 8 },
                len: 0.9,
                tickvals: [-1, 0, 1, 2],
                ticktext: ['≤0.1', '1', '10', '≥100']
              }
            }]}
            layout={{
              title: { text: 'Median Distribution' },
              autosize: true,
              margin: { l: 50, r: 80, t: 30, b: 50 },
              xaxis: {
                title: { text: 'Size' },
                tickfont: { size: 8 },
                side: 'bottom'
              },
              yaxis: {
                title: { text: 'Position' },
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

  // Para ACPvsAll
  if (aggregate === "ACPvsAll") {
    const acpData = csvData.acpData
    
    if (!acpData) {
      return <div>Cargando datos ACPvsAll...</div>
    }

    // Usar selectedPCs en lugar de detectar automáticamente
    const availablePCs = selectedPCs.filter(pc => {
      if (acpData.data && acpData.data.length > 0) {
        const firstRow = acpData.data[0]
        return firstRow[`PC${pc}`] !== undefined && firstRow[`PC${pc}`] !== null
      }
      return false
    })
    
    const numPCs = availablePCs.length
    if (numPCs === 0) {
      return <div>No se encontraron componentes principales seleccionados en los datos</div>
    }

    console.log('PCs disponibles:', availablePCs)
    console.log('GroupBy value:', groupBy)
    
    // Determinar si groupBy es una variable numérica (GC, size) o categórica
    const isNumericGroupBy = groupBy === 'GC' || groupBy === 'size'
    
    let colorGroups: { [key: string]: any[] } = {}
    let numericData: any[] = []
    
    if (isNumericGroupBy) {
      // Para variables numéricas, filtrar datos válidos y preparar valores numéricos
      numericData = acpData.data.filter((row: any) => {
        const value = parseFloat(row[groupBy])
        return !isNaN(value) && value !== null && value !== undefined
      })
      console.log('Numeric data filtered:', numericData.length, 'rows for', groupBy)
    } else {
      // Para variables categóricas, hacer agrupación
      acpData.data.forEach((row: any) => {
        const groupByValue = row[groupBy] || "Unknown"
        if (!colorGroups[groupByValue]) colorGroups[groupByValue] = []
        colorGroups[groupByValue].push(row)
      })
      console.log('Categorical groups:', Object.keys(colorGroups))
    }
    
    // Definir colores para grupos categóricos
    const fixedColors = [
      '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', 
      '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
      '#ff9896', '#c5b0d5', '#c49c94', '#f7b6d3', '#c7c7c7',
      '#dbdb8d', '#9edae5', '#ff8c00', '#32cd32', '#ba55d3'
    ]
    
    let colorMapping: { [key: string]: string } = {}
    
    if (!isNumericGroupBy) {
      // Solo crear mapeo para variables categóricas
      const sortedGroups = Object.keys(colorGroups).sort()
      sortedGroups.forEach((group: string, index: number) => {
        colorMapping[group] = fixedColors[index % fixedColors.length]
      })
    }
    
    // Crear todas las trazas para cada combinación de PCs
    const allTraces: any[] = []
    
    // Crear cada subplot individualmente
    availablePCs.forEach((pcY, rowIndex) => {
      availablePCs.forEach((pcX, colIndex) => {
        const subplotIndex = rowIndex * numPCs + colIndex + 1
        
        if (isNumericGroupBy) {
          // Para variables numéricas (GC, size), crear una sola traza con escala de colores continua
          allTraces.push({
            x: numericData.map(row => row[`PC${pcX}`] || 0),
            y: numericData.map(row => row[`PC${pcY}`] || 0),
            text: numericData.map(row => 
              `${row.fullname || row.ID || "Unknown"}<br>` +
              `PC${pcX}: ${(row[`PC${pcX}`] || 0).toFixed(3)}<br>` +
              `PC${pcY}: ${(row[`PC${pcY}`] || 0).toFixed(3)}<br>` +
              `${groupBy}: ${row[groupBy] || "Unknown"}`
            ),
            mode: 'markers',
            type: 'scatter',
            marker: {
              size: 6,
              color: numericData.map(row => parseFloat(row[groupBy])),
              colorscale: groupBy === 'GC' ? 'RdYlBu_r' : (
                groupBy === 'size' ? [
                  [0, 'lightblue'], [0.2, 'skyblue'], [0.4, 'steelblue'],
                  [0.6, 'brown'], [0.8, 'saddlebrown'], [1, 'darkbrown']
                ] : 'Plasma'
              ),
              ...(groupBy === 'GC' && { cmin: 0, cmax: 1 }),
              colorbar: {
                title: {
                  text: groupBy === 'GC' ? 'GC Content' : (groupBy === 'size' ? 'Size (bp)' : groupBy),
                  side: 'right'
                },
                thickness: 15,
                len: 0.7,
                x: 1.02,
                tickfont: { size: 10 },
                ...(groupBy === 'GC' && {
                  tick0: 0,
                  dtick: 0.1,
                  tickmode: 'linear'
                })
              },
              showscale: rowIndex === 0 && colIndex === 0, // Solo mostrar colorbar en el primer subplot
              opacity: 0.7
            },
            name: `${groupBy} (scale)`,
            showlegend: false,
            xaxis: `x${subplotIndex}`,
            yaxis: `y${subplotIndex}`,
            hoverinfo: 'text'
          })
        } else {
          // Para variables categóricas, crear trazas separadas por grupo
          Object.entries(colorGroups).forEach(([groupName, points]) => {
            const pointsArray = points as any[]
            
            allTraces.push({
              x: pointsArray.map(row => row[`PC${pcX}`] || 0),
              y: pointsArray.map(row => row[`PC${pcY}`] || 0),
              text: pointsArray.map(row => 
                `${row.fullname || row.ID || "Unknown"}<br>` +
                `PC${pcX}: ${(row[`PC${pcX}`] || 0).toFixed(3)}<br>` +
                `PC${pcY}: ${(row[`PC${pcY}`] || 0).toFixed(3)}<br>` +
                `${groupBy}: ${row[groupBy] || "Unknown"}<br>` +
                `${groupBy !== "genus" ? `Genus: ${row.genus || "Unknown"}<br>` : ""}` +
                `${groupBy !== "species" ? `Species: ${row.species || "Unknown"}` : ""}`
              ),
              mode: 'markers',
              type: 'scatter',
              marker: {
                size: 6,
                color: colorMapping[groupName],
                opacity: 0.7
              },
              name: `${groupName}`,
              legendgroup: groupName,
              showlegend: rowIndex === 0 && colIndex === 0, // Solo mostrar leyenda en el primer subplot
              xaxis: `x${subplotIndex}`,
              yaxis: `y${subplotIndex}`,
              hoverinfo: 'text'
            })
          })
        }
      })
    })

    // Crear configuración de layout con subplots manuales
    const layoutConfig: any = {
      autosize: true,
      margin: { l: 40, r: 20, t: 60, b: 40 }, // Aumentar margen superior para títulos arriba
      showlegend: true,
      legend: {
        x: 1.01,
        y: 1,
        xanchor: 'left',
        yanchor: 'top',
        font: { size: 10 }
      },
      hoverlabel: {
        bgcolor: 'white',
        font: { size: 10 }
      }
    }

    // Configurar dominios para cada subplot
    availablePCs.forEach((pcY, rowIndex) => {
      availablePCs.forEach((pcX, colIndex) => {
        const subplotIndex = rowIndex * numPCs + colIndex + 1
        const axisName = subplotIndex === 1 ? '' : subplotIndex.toString()
        
        // Calcular dominios
        const colWidth = 0.95 / numPCs
        const rowHeight = 0.95 / numPCs
        const xDomain = [colIndex * colWidth + 0.02, (colIndex + 1) * colWidth]
        const yDomain = [1 - (rowIndex + 1) * rowHeight, 1 - rowIndex * rowHeight - 0.02]
        
        // Configurar eje X - mostrar título en la primera fila (arriba)
        layoutConfig[`xaxis${axisName}`] = {
          domain: xDomain,
          title: rowIndex === 0 ? {
            text: `PC${pcX}`,
            font: { size: 12, color: 'black' },
            standoff: 20
          } : undefined,
          titlefont: { size: 12 },
          tickfont: { size: 8 },
          showgrid: true,
          zeroline: true,
          showticklabels: rowIndex === numPCs - 1,
          side: rowIndex === 0 ? 'top' : 'bottom'
        }
        
        // Configurar eje Y - solo mostrar título en la primera columna
        layoutConfig[`yaxis${axisName}`] = {
          domain: yDomain,
          title: colIndex === 0 ? {
            text: `PC${pcY}`,
            font: { size: 12, color: 'black' },
            standoff: 20
          } : undefined,
          titlefont: { size: 12 },
          tickfont: { size: 8 },
          showgrid: true,
          zeroline: true,
          showticklabels: colIndex === 0,
          side: 'left'
        }
      })
    })

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1 }}>
          <Plot
            data={allTraces}
            layout={layoutConfig}
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

  // Para PCA_Taxon
  if (aggregate === "PCA_Taxon") {
    const pcaTaxonData = csvData.pcaTaxonData
    
    if (!pcaTaxonData) {
      return <div>Cargando datos PCA_Taxon...</div>
    }

    const { data, pcColumns } = pcaTaxonData
    
    if (!data || data.length === 0) {
      return <div>No hay datos PCA_Taxon disponibles</div>
    }

    // Create heatmap data from PC columns
    const heatmapData = data.map((row: any) => {
      return pcColumns.map((pc: string) => row[pc] || 0)
    })

    // Create labels for samples
    const sampleLabels = data.map((row: any, index: number) => 
      `${row.fullname || row.ID || `Sample ${index + 1}`}`
    )

    // Create taxonomic tree visualization data aligned with heatmap rows
    const taxonomicColumns = ['superkingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species']
    
    // Build hierarchical tree structure with positions
    const buildTreeStructure = () => {
      const treeNodes: any[] = []
      const treeEdges: any[] = []
      const nodePositions: {[key: string]: {x: number, y: number}} = {}
      let nodeId = 0
      
      // Track unique paths and their sample indices
      const pathToSamples: {[key: string]: number[]} = {}
      
      data.forEach((row: any, sampleIndex: number) => {
        let currentPath = ''
        taxonomicColumns.forEach((column, level) => {
          const value = row[column] || 'Unknown'
          const previousPath = currentPath
          currentPath = currentPath ? `${currentPath}>${value}` : value
          
          if (!pathToSamples[currentPath]) {
            pathToSamples[currentPath] = []
          }
          pathToSamples[currentPath].push(sampleIndex)
          
          // Create node if it doesn't exist
          const nodeKey = currentPath
          if (!nodePositions[nodeKey]) {
            nodePositions[nodeKey] = {
              x: level,
              y: 0 // Will be calculated later
            }
            
            treeNodes.push({
              id: nodeId++,
              path: currentPath,
              name: value,
              level: level,
              fullPath: currentPath,
              samples: []
            })
          }
          
          // Create edge to parent
          if (previousPath && !treeEdges.find(e => e.source === previousPath && e.target === currentPath)) {
            treeEdges.push({
              source: previousPath,
              target: currentPath
            })
          }
        })
      })
      
      // Calculate Y positions based on sample alignment
      Object.keys(pathToSamples).forEach(path => {
        const samples = pathToSamples[path]
        const avgY = samples.reduce((sum, idx) => sum + idx, 0) / samples.length
        nodePositions[path].y = avgY
        
        // Update node with sample info
        const node = treeNodes.find(n => n.path === path)
        if (node) {
          node.samples = samples
          node.y = avgY
        }
      })
      
      return { treeNodes, treeEdges, nodePositions }
    }
    
    const { treeNodes, treeEdges } = buildTreeStructure()
    
    // Create traces for tree visualization
    const createTreeTraces = () => {
      const traces: any[] = []
      
      // Create orthogonal edges (perpendicular lines connecting nodes)
      const edgeX: number[] = []
      const edgeY: number[] = []
      
      treeEdges.forEach(edge => {
        const sourceNode = treeNodes.find(n => n.path === edge.source)
        const targetNode = treeNodes.find(n => n.path === edge.target)
        
        if (sourceNode && targetNode) {
          // Create L-shaped orthogonal connection
          // Horizontal line from source
          edgeX.push(sourceNode.level, targetNode.level - 0.1, NaN)
          edgeY.push(sourceNode.y, sourceNode.y, NaN)
          
          // Vertical line down to target level  
          edgeX.push(targetNode.level - 0.1, targetNode.level - 0.1, NaN)
          edgeY.push(sourceNode.y, targetNode.y, NaN)
          
          // Short horizontal line to target
          edgeX.push(targetNode.level - 0.1, targetNode.level, NaN)
          edgeY.push(targetNode.y, targetNode.y, NaN)
        }
      })
      
      // Add edge trace
      traces.push({
        x: edgeX,
        y: edgeY,
        mode: 'lines',
        type: 'scatter',
        line: {
          color: '#666666',
          width: 1.5
        },
        hoverinfo: 'none',
        showlegend: false
      })
      
      // Add vertical lines at species level to show which rows belong to same species
      const speciesLevel = taxonomicColumns.length - 1 // Last level (species)
      
      const verticalLinesX: number[] = []
      const verticalLinesY: number[] = []
      
      // Group samples by species to create vertical lines
      const speciesByName: {[key: string]: number[]} = {}
      data.forEach((row: any, index: number) => {
        const speciesName = row.species || 'Unknown'
        if (!speciesByName[speciesName]) {
          speciesByName[speciesName] = []
        }
        speciesByName[speciesName].push(index)
      })
      
      // Create vertical lines for each species
      Object.values(speciesByName).forEach(indices => {
        if (indices.length > 1) { // Only draw line if species has multiple samples
          const minY = Math.min(...indices)
          const maxY = Math.max(...indices)
          
          // Draw vertical line covering all samples of this species
          verticalLinesX.push(speciesLevel + 0.1, speciesLevel + 0.1, NaN)
          verticalLinesY.push(minY - 0.3, maxY + 0.3, NaN)
        }
      })
      
      // Add vertical species lines trace
      traces.push({
        x: verticalLinesX,
        y: verticalLinesY,
        mode: 'lines',
        type: 'scatter',
        line: {
          color: '#ff6b6b',
          width: 2
        },
        hoverinfo: 'none',
        showlegend: false
      })
      
      // Create node traces grouped by level
      taxonomicColumns.forEach((column, level) => {
        const levelNodes = treeNodes.filter(n => n.level === level)
        
        if (levelNodes.length > 0) {
          traces.push({
            x: levelNodes.map(n => n.level),
            y: levelNodes.map(n => n.y),
            mode: 'markers',
            type: 'scatter',
            marker: {
              size: levelNodes.map(n => Math.min(20, Math.max(8, n.samples.length * 2))),
              color: `hsl(${(level * 50) % 360}, 70%, 50%)`,
              symbol: 'circle',
              line: {
                color: '#000000',
                width: 1
              }
            },
            hovertemplate: 
              `<b>${column}:</b> %{customdata}<br>` +
              '<b>Samples:</b> ' + levelNodes.map(n => n.samples.length).join(', ') + '<br>' +
              '<b>Avg Position:</b> %{y:.1f}<br>' +
              '<extra></extra>',
            customdata: levelNodes.map(n => n.name),
            name: column,
            showlegend: false
          })
        }
      })
      
      return traces
    }
    
    const taxonomicTraces = createTreeTraces()

    return (
      <div style={{ display: 'flex', flexDirection: 'row', gap: '0px', height: '100%', alignItems: 'stretch' }}>
        <div style={{ flex: 2, display: 'flex', alignItems: 'stretch' }}>
          <Plot
            data={taxonomicTraces}
            layout={{
              title: { text: '' },
              autosize: true,
              margin: { l: 120, r: 10, t: 20, b: 100 },
              paper_bgcolor: 'rgba(0,0,0,0)', // Transparent background
              plot_bgcolor: 'rgba(0,0,0,0)', // Transparent plot area
              xaxis: {
                title: { text: 'Taxonomic Level' },
                tickfont: { size: 8 },
                tickmode: 'array',
                tickvals: taxonomicColumns.map((_: string, i: number) => i),
                ticktext: taxonomicColumns.map((col: string) => col.charAt(0).toUpperCase() + col.slice(1)),
                range: [-0.5, taxonomicColumns.length - 0.3], // Extended range to show vertical lines
                showgrid: false, // Remove grid
                zeroline: false, // Remove zero line
                showline: false, // Remove axis line
                linecolor: 'rgba(0,0,0,0)'
              },
              yaxis: {
                title: { text: '' },
                tickfont: { size: 8 },
                range: currentYRange, // Use shared state
                autorange: false, // Explicitly disable autorange
                showgrid: false, // Remove grid
                zeroline: false, // Remove zero line
                showline: false, // Remove axis line
                showticklabels: false, // Hide y-axis labels for alignment
                linecolor: 'rgba(0,0,0,0)'
              },
              hoverlabel: {
                bgcolor: 'white',
                font: { size: 10 }
              },
              showlegend: false
            }}
            style={{ width: '100%', height: '100%' }}
            useResizeHandler={true}
            config={{ 
              responsive: true,
              displayModeBar: true,
              displaylogo: false,
              scrollZoom: true,
              doubleClick: 'reset+autosize'
            }}
            onRelayout={(eventData: any) => {
              // Update shared Y range state when tree plot changes
              if (eventData['yaxis.range[0]'] !== undefined && eventData['yaxis.range[1]'] !== undefined) {
                setCurrentYRange([eventData['yaxis.range[0]'], eventData['yaxis.range[1]']])
              }
            }}
          />
        </div>
        <div style={{ flex: 3 }}>
          <Plot
            data={[{
              z: heatmapData,
              x: pcColumns,
              y: sampleLabels.map((_: any, i: number) => i), // Use indices explicitly
              type: 'heatmap',
              colorscale: 'RdYlBu_r',
              showscale: true,
              hoverongaps: false,
              hovertemplate: 
                '<b>Sample:</b> ' + '%{text}' + '<br>' +
                '<b>PC:</b> %{x}<br>' +
                '<b>Value:</b> %{z:.3f}<br>' +
                '<extra></extra>',
              text: sampleLabels.map((label: string) => 
                Array(pcColumns.length).fill(label)
              ) // Create 2D array matching heatmap structure
            }]}
            layout={{
              title: { text: '' },
              autosize: true,
              margin: { l: 10, r: 50, t: 20, b: 100 },
              xaxis: {
                title: { text: 'Principal Components' },
                tickfont: { size: 10 },
                side: 'bottom'
              },
              yaxis: {
                title: { text: '' },
                tickfont: { size: 8 },
                tickmode: 'array',
                tickvals: sampleLabels.map((_: any, i: number) => i),
                ticktext: sampleLabels.map(() => ''), // Hide tick labels
                range: currentYRange, // Use shared state
                autorange: false // Explicitly disable autorange
              },
              hoverlabel: {
                bgcolor: 'white',
                font: { size: 10 }
              }
            }}
            style={{ width: '100%', height: '100%' }}
            useResizeHandler={true}
            config={{ 
              responsive: true,
              displayModeBar: true,
              displaylogo: false,
              scrollZoom: true,
              doubleClick: 'reset+autosize'
            }}
            onRelayout={(eventData: any) => {
              // Update shared Y range state when heatmap plot changes
              if (eventData['yaxis.range[0]'] !== undefined && eventData['yaxis.range[1]'] !== undefined) {
                setCurrentYRange([eventData['yaxis.range[0]'], eventData['yaxis.range[1]']])
              }
            }}
          />
        </div>
      </div>
    )
  }

  // Para otros tipos de agregación no implementados
  return (
    <div>
      Tipo de agregación no implementado: {aggregate}
    </div>
  )
}

export default AggregateStructural


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

const AggregateKmer: React.FC<AggregateProps> = ({ 
  aggregate, 
  pcX, 
  pcY,
  id,
  idReplicon,
  taxon,
  taxonValue, 
  part
}) => { 

  const [csvData, setCsvData] = useState<{ pcX: any[]; pcY: any[] }>({ pcX: [], pcY: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Debug: log when props change
  useEffect(() => {
    console.log('AggregateKmer props updated:', { 
      aggregate, pcX, pcY, id, idReplicon, taxon, taxonValue, part 
    });
  }, [aggregate, pcX, pcY, id, idReplicon, taxon, taxonValue, part])

  useEffect(() => {
    const fetchCsvData = async (filePath: string): Promise<any[]> => {
      return new Promise((resolve, reject) => {
        fetch(filePath)
          .then((res) => {
            if (!res.ok) {
              throw new Error(`File not found: ${filePath} (HTTP ${res.status})`)
            }
            return res.text()
          })
          .then((csvText) => {
            const parsed = Papa.parse(csvText, { 
              header: true,
              skipEmptyLines: true,
              transformHeader: (header) => header.trim()
            });
            
            console.log("Parsed CSV from:", filePath);
            
            if (parsed.errors.length > 0) {
              console.warn("CSV parsing errors:", parsed.errors);
              throw new Error(`CSV parsing error in ${filePath}: ${parsed.errors[0].message}`)
            }
            
            // Filter out empty rows and validate data
            const formatted = parsed.data
              .filter((row: any) => row.Item && row.cod !== undefined && row.non !== undefined)
              .map((row: any) => ({
                Item: row.Item.trim(),
                cod: parseFloat(row.cod),
                non: parseFloat(row.non),
                color: row.color ? row.color.trim() : '6-mer', // Default fallback
              }))
              .filter(row => !isNaN(row.cod) && !isNaN(row.non)); // Remove invalid numeric data
            
            console.log("Formatted data:", formatted.slice(0, 5)); // Log first 5 rows
            resolve(formatted);
          })
          .catch((err) => {
            console.error("Error loading CSV:", err);
            reject(err);
          });
      })
    } 

    const loadCsvData = async () => {
      setLoading(true)
      setError(null)
      
      let pcXPath, pcYPath;
      
      try {
        // Si tenemos parámetros taxonómicos, usar rutas dinámicas
        if (taxon && taxonValue && part) {
          // Construir rutas independientemente para cada PC
          pcXPath = await buildACPFilePath(taxon, taxonValue, part, 'PC', pcX, pcY)
          pcYPath = await buildACPFilePath(taxon, taxonValue, part, 'PC', pcY, pcX)
            
          console.log('Loading PC data from:', { pcXPath, pcYPath })
          // TODO(Victor): Esto esta hardcodeado, tendria que haber una manera mas simple
          // de adaptar el path al archivo
          // Ajustar las rutas para usar el formato correcto de PC
          pcXPath = pcXPath.replace('_hc_', `_ratio_cod_vs_non_`)
          pcYPath = pcYPath.replace('_hc_', `_ratio_cod_vs_non_`)
          // Quitar "part" variable 
          pcXPath = pcXPath.replace(`_${part}_`, `_`)
          pcYPath = pcYPath.replace(`_${part}_`, `_`)
        } else {
          // Rutas por defecto
          pcXPath = `/data/philogenie/Bacteria/PC${pcX}_ratio_cod_vs_non_Bacteria.csv`
          pcYPath = `/data/philogenie/Bacteria/PC${pcY}_ratio_cod_vs_non_Bacteria.csv`
        }
        
        console.log('Final paths:', { pcXPath, pcYPath })
        
        const [pcXData, pcYData] = await Promise.all([
          fetchCsvData(pcXPath),
          fetchCsvData(pcYPath)
        ])
        
        console.log('Loaded data lengths:', { pcX: pcXData.length, pcY: pcYData.length })
        
        setCsvData({ pcX: pcXData, pcY: pcYData })
      } catch (error) {
        console.error('Error loading CSV data:', error)
        setError(error instanceof Error ? error.message : `Failed to load files: ${pcXPath} and ${pcYPath}`)
        
        // Fallback a rutas por defecto
        try {
          console.log('Attempting fallback...')
          const fallbackPcXPath = `/data/philogenie/Bacteria/PC${pcX}_ratio_cod_vs_non_Bacteria.csv`
          const fallbackPcYPath = `/data/philogenie/Bacteria/PC${pcY}_ratio_cod_vs_non_Bacteria.csv`
          const [pcXData, pcYData] = await Promise.all([
            fetchCsvData(fallbackPcXPath),
            fetchCsvData(fallbackPcYPath)
          ])
          setCsvData({ pcX: pcXData, pcY: pcYData })
          setError(null)
        } catch (fallbackError) {
          console.error('Fallback loading also failed:', fallbackError)
          setError(`Failed to load data from both primary (${pcXPath}, ${pcYPath}) and fallback paths`)
        }
      } finally {
        setLoading(false)
      }
    }

    loadCsvData()
  }, [pcX, pcY, taxon, taxonValue, part, id, idReplicon])

  // Función para crear trazas similar a kmer_plot
  const createKmerTraces = (data: any[], pcLabel: string) => {
    
    console.log(`Creating traces for ${pcLabel}`, data.length, 'data points')
    
    if (!data || data.length === 0) {
      return []
    }

    // Definir colores (igual que kmer_plot)
    const colors = {
      "6-mer": "#023047",
      "Inverted repeat": "#219ebc",
      "Palindromes": "#ffb703"
    }

    // Filtrar datos válidos
    const df_plot = data.filter(row => 
      row && 
      typeof row.cod === 'number' && 
      typeof row.non === 'number' && 
      !isNaN(row.cod) && 
      !isNaN(row.non)
    )
    
    console.log(`Filtered ${df_plot.length} valid data points for ${pcLabel}`)
    
    // Obtener categorías únicas
    const categories = [...new Set(df_plot.map(row => row.color))]
    console.log(`Categories found for ${pcLabel}:`, categories)

    // Crear trazas
    const traces: any[] = []

    categories.forEach(category => {
      const cat_data = df_plot.filter(row => row.color === category)
      const x = cat_data.map(d => d.cod)
      const y = cat_data.map(d => d.non)
      const hoverText = cat_data.map(d => d.Item)

      console.log(`Category ${category}: ${cat_data.length} points`)

      // Scatter points
      traces.push({
        type: 'scatter',
        mode: 'markers',
        name: `${category} - ${pcLabel}`,
        x: x,
        y: y,
        text: hoverText,
        hovertemplate: '<b>%{text}</b><br>Coding: %{x}<br>Non-coding: %{y}<extra></extra>',
        marker: { 
          color: colors[category as keyof typeof colors] || '#666666', 
          opacity: 0.7,
          size: 6
        },
        showlegend: true
      })
    })

    // Diagonal roja
    traces.push({
      type: 'scatter',
      mode: 'lines',
      x: [-0.1, 0.1],
      y: [-0.1, 0.1],
      line: { color: 'red', dash: 'solid', width: 2 },
      name: `Diagonal - ${pcLabel}`,
      showlegend: false,
      hoverinfo: 'skip'
    })

    return traces
  }

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading k-mer data...</div>
  }

  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        color: '#e74c3c',
        border: '2px solid #e74c3c',
        borderRadius: '5px',
        margin: '10px'
      }}>
        <h3>Error Loading K-mer Data</h3>
        <p>{error}</p>
        <p style={{ fontSize: '0.8em', color: '#666' }}>
          Taxon: {taxonValue} | Part: {part} | PC{pcX} vs PC{pcY}
        </p>
      </div>
    )
  }

  if (aggregate === "PC") {
    const pcXTraces = createKmerTraces(csvData.pcX, `PC${pcX}`)
    const pcYTraces = createKmerTraces(csvData.pcY, `PC${pcY}`)
    
    // Add selected point information
    const selectedInfo = id && idReplicon ? 
      ` | Selected: ${id}/${idReplicon}` : 
      ' | No point selected'

    if (pcXTraces.length === 0 && pcYTraces.length === 0) {
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          color: '#f39c12',
          border: '2px solid #f39c12',
          borderRadius: '5px',
          margin: '10px'
        }}>
          <h3>No Valid K-mer Data Found</h3>
          <p>No data available for the selected parameters</p>
        </div>
      )
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', height: '100%' }}>
        <div style={{ flex: 1 }}>
          <Plot
            data={pcXTraces}
            layout={{
              title: { text: `PC${pcX} K-mer Distribution${selectedInfo}` },
              autosize: true,
              margin: { l: 50, r: 50, t: 50, b: 50 },
              xaxis: {
                title: { text: 'Coding' },
                range: [-0.05, 0.05],
                showgrid: true,
                gridcolor: 'lightgray',
                tickfont: { size: 10 }
              },
              yaxis: {
                title: { text: 'Non-coding' },
                range: [-0.05, 0.05],
                showgrid: true,
                gridcolor: 'lightgray',
                tickfont: { size: 10 }
              },
              showlegend: true,
              legend: {
                x: 1.05,
                y: 1,
                font: { size: 10 }
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
            data={pcYTraces}
            layout={{
              title: { text: `PC${pcY} K-mer Distribution${selectedInfo}` },
              autosize: true,
              margin: { l: 50, r: 50, t: 50, b: 50 },
              xaxis: {
                title: { text: 'Coding' },
                range: [-0.05, 0.05],
                showgrid: true,
                gridcolor: 'lightgray',
                tickfont: { size: 10 }
              },
              yaxis: {
                title: { text: 'Non-coding' },
                range: [-0.05, 0.05],
                showgrid: true,
                gridcolor: 'lightgray',
                tickfont: { size: 10 }
              },
              showlegend: true,
              legend: {
                x: 1.05,
                y: 1,
                font: { size: 10 }
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

  return (
    <div>
      K-mer aggregate visualization for {aggregate} not implemented yet
    </div>
  )
}

export default AggregateKmer


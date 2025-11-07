import React, { useState, useEffect } from 'react'
import Plot from 'react-plotly.js'
import Papa from 'papaparse'
import { TAXONOMIC_COLUMNS } from '../../utils/constants.ts'

interface TaxonomyPlotsProps {
  plotType: 'icicle' | 'treemap'
}

interface TaxonomyData {
  [key: string]: any
}

const TaxonomyPlots: React.FC<TaxonomyPlotsProps> = ({ plotType }) => {
  const [data, setData] = useState<TaxonomyData[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  console.log('TaxonomyPlots: Component rendered with props:', { plotType })
  console.log('TaxonomyPlots: Current state:', { dataLength: data.length, loading, error })

  useEffect(() => {
    const loadTaxonomyData = async () => {
      console.log('TaxonomyPlots: Starting to load taxonomy data...')
      setLoading(true)
      setError(null)
      
      try {
        const filePath = '/data/taxonomy.csv'
        console.log('TaxonomyPlots: Loading file from:', filePath)
        
        // First try to fetch the file to check if it exists
        const response = await fetch(filePath)
        if (!response.ok) {
          throw new Error(`Failed to fetch ${filePath}: ${response.status} ${response.statusText}`)
        }
        
        const csvText = await response.text()
        console.log('TaxonomyPlots: CSV file loaded, size:', csvText.length, 'characters')
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (result) => {
            console.log('TaxonomyPlots: Papa.parse complete. Result:', {
              data: result.data?.length ? `${result.data.length} rows` : 'no data',
              errors: result.errors.length > 0 ? result.errors : 'no errors',
              meta: result.meta
            })
            
            const taxonomyData = result.data as TaxonomyData[]
            
            if (result.errors && result.errors.length > 0) {
              console.warn('TaxonomyPlots: Parse errors:', result.errors)
            }
            
            if (taxonomyData && taxonomyData.length > 0) {
              console.log('TaxonomyPlots: First few rows:', taxonomyData.slice(0, 3))
              console.log('TaxonomyPlots: Data columns:', Object.keys(taxonomyData[0] || {}))
              console.log('TaxonomyPlots: Total rows loaded:', taxonomyData.length)
            } else {
              console.warn('TaxonomyPlots: No data loaded or empty dataset')
            }
            
            setData(taxonomyData || [])
            setLoading(false)
          },
          error: (err: Error) => {
            console.error('TaxonomyPlots: Papa.parse error:', err)
            setError(`Error parsing CSV data: ${err.message || err}`)
            setLoading(false)
          }
        })
      } catch (err) {
        console.error('TaxonomyPlots: Error loading taxonomy data:', err)
        setError(`Error loading taxonomy data: ${err instanceof Error ? err.message : String(err)}`)
        setLoading(false)
      }
    }

    loadTaxonomyData()
  }, [])

  const buildHierarchicalData = () => {
    console.log('TaxonomyPlots: Building hierarchical data with', data.length, 'rows')
    console.log('TaxonomyPlots: TAXONOMIC_COLUMNS:', TAXONOMIC_COLUMNS)
    
    if (!data || data.length === 0) {
      console.warn('TaxonomyPlots: No data available for building hierarchy')
      return { labels: [], parents: [], values: [], ids: [] }
    }

    const taxonomicLevels = TAXONOMIC_COLUMNS
    
    // Count leaf nodes (complete paths)
    const leafCount: { [key: string]: number } = {}
    
    data.forEach((row, index) => {
      if (index < 3) {
        console.log(`TaxonomyPlots: Processing row ${index}:`, row)
      }
      
      // Build complete path for each row
      const pathParts = taxonomicLevels.map(level => row[level] || 'Unknown')
      const completePath = pathParts.join('/')
      
      leafCount[completePath] = (leafCount[completePath] || 0) + 1
    })

    console.log('TaxonomyPlots: Leaf count sample (first 10):', 
      Object.fromEntries(Object.entries(leafCount).slice(0, 10)))
    console.log('TaxonomyPlots: Total leaf paths:', Object.keys(leafCount).length)

    // Build hierarchy with proper parent-child relationships
    const nodeData = new Map<string, { label: string; parent: string; value: number }>()
    
    // Process each leaf path to build the hierarchy
    Object.entries(leafCount).forEach(([path, count]) => {
      const pathParts = path.split('/')
      
      // Add each level of the path
      for (let i = 0; i < pathParts.length; i++) {
        const currentPath = pathParts.slice(0, i + 1).join('/')
        const parentPath = i > 0 ? pathParts.slice(0, i).join('/') : ''
        const label = pathParts[i]
        
        if (!nodeData.has(currentPath)) {
          nodeData.set(currentPath, {
            label,
            parent: parentPath,
            value: 0
          })
        }
        
        // Add the leaf count to this node and all its ancestors
        const node = nodeData.get(currentPath)!
        node.value += count
      }
    })

    // Convert to arrays for Plotly
    const labels: string[] = []
    const parents: string[] = []
    const values: number[] = []
    const ids: string[] = []

    // Sort nodes to ensure parents come before children
    const sortedEntries = Array.from(nodeData.entries()).sort(([pathA], [pathB]) => {
      const depthA = pathA.split('/').length
      const depthB = pathB.split('/').length
      return depthA - depthB
    })

    sortedEntries.forEach(([path, node]) => {
      labels.push(node.label)
      parents.push(node.parent)
      values.push(node.value)
      ids.push(path)
    })

    console.log('TaxonomyPlots: Final plot data:', {
      labelsCount: labels.length,
      parentsCount: parents.length,
      valuesCount: values.length,
      idsCount: ids.length,
      sampleLabels: labels.slice(0, 10),
      sampleValues: values.slice(0, 10),
      totalDataPoints: data.length
    })

    return { labels, parents, values, ids }
  }

  const createIciclePlot = (): any => {
    console.log('TaxonomyPlots: Creating icicle plot...')
    const { labels, parents, values, ids } = buildHierarchicalData()
    
    if (labels.length === 0) {
      console.warn('TaxonomyPlots: No data available for icicle plot')
      return {
        type: 'icicle',
        labels: ['No Data'],
        parents: [''],
        values: [1],
        ids: ['no-data'],
        text: ['No taxonomy data available'],
        textinfo: 'text',
        hovertemplate: '<b>No Data Available</b><extra></extra>'
      }
    }
    
    const plotData = {
      type: 'icicle',
      labels: labels,
      parents: parents,
      values: values,
      ids: ids,
      branchvalues: 'total',
      hovertemplate: '<b>%{label}</b><br>Count: %{value}<br>Path: %{id}<extra></extra>',
      maxdepth: 3,
      pathbar: { visible: true }
    }
    
    console.log('TaxonomyPlots: Icicle plot data created:', {
      type: plotData.type,
      dataLength: labels.length
    })
    
    return plotData
  }

  const createTreemapPlot = (): any => {
    console.log('TaxonomyPlots: Creating treemap plot...')
    const { labels, parents, values, ids } = buildHierarchicalData()
    
    if (labels.length === 0) {
      console.warn('TaxonomyPlots: No data available for treemap plot')
      return {
        type: 'treemap',
        labels: ['No Data'],
        parents: [''],
        values: [1],
        ids: ['no-data'],
        text: ['No taxonomy data available'],
        textinfo: 'text',
        hovertemplate: '<b>No Data Available</b><extra></extra>'
      }
    }
    
    const plotData = {
      type: 'treemap',
      labels: labels,
      parents: parents,
      values: values,
      ids: ids,
      branchvalues: 'total',
      hovertemplate: '<b>%{label}</b><br>Count: %{value}<br>Path: %{id}<extra></extra>',
      maxdepth: 3,
      pathbar: { visible: true }
    }
    
    console.log('TaxonomyPlots: Treemap plot data created:', {
      type: plotData.type,
      dataLength: labels.length
    })
    
    return plotData
  }

  if (loading) {
    console.log('TaxonomyPlots: Currently loading...')
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontSize: '16px',
        color: '#666'
      }}>
        Loading taxonomy data...
      </div>
    )
  }

  if (error) {
    console.log('TaxonomyPlots: Error state:', error)
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontSize: '16px',
        color: '#d32f2f',
        textAlign: 'center',
        padding: '20px'
      }}>
        <div>
          <div>Error: {error}</div>
          <div style={{ fontSize: '14px', marginTop: '10px', color: '#666' }}>
            Please check the console for more details.
          </div>
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    console.log('TaxonomyPlots: No data available')
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontSize: '16px',
        color: '#666'
      }}>
        No taxonomy data available
      </div>
    )
  }

  console.log('TaxonomyPlots: Rendering plot with plotType:', plotType)
  console.log('TaxonomyPlots: Data available:', data.length, 'rows')

  try {
    const plotData = plotType === 'icicle' ? createIciclePlot() : createTreemapPlot()
    const title = plotType === 'icicle' ? 'Taxonomic Hierarchy - Icicle Plot' : 'Taxonomic Hierarchy - Treemap'

    console.log('TaxonomyPlots: About to render Plot component with title:', title)

    return (
      <div style={{ width: '100%', height: '100%' }}>
        <Plot
          data={[plotData]}
          layout={{
            title: {
              text: title,
              font: { size: 14 }
            },
            autosize: true,
            margin: { l: 10, r: 10, t: 40, b: 10 },
            font: { size: 10 }
          }}
          style={{ 
            width: '100%', 
            height: '100%'
          }}
          useResizeHandler={true}
          config={{ 
            responsive: true,
            displayModeBar: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['lasso2d'],
            toImageButtonOptions: {
              format: 'png',
              filename: `taxonomy_${plotType}`,
              height: 800,
              width: 1000,
              scale: 2
            }
          }}
        />
      </div>
    )
  } catch (plotError) {
    console.error('TaxonomyPlots: Error creating plot:', plotError)
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontSize: '16px',
        color: '#d32f2f',
        textAlign: 'center',
        padding: '20px'
      }}>
        <div>
          <div>Error rendering plot: {plotError instanceof Error ? plotError.message : String(plotError)}</div>
          <div style={{ fontSize: '14px', marginTop: '10px', color: '#666' }}>
            Please check the console for more details.
          </div>
        </div>
      </div>
    )
  }
}

export default TaxonomyPlots
import React, { useState, useEffect } from 'react'
import Plot from 'react-plotly.js'
import Papa from 'papaparse'

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

  useEffect(() => {
    const loadTaxonomyData = () => {
      setLoading(true)
      setError(null)
      
      const filePath = '/data/taxonomy.csv'
      Papa.parse(filePath, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const taxonomyData = result.data as TaxonomyData[]
          setData(taxonomyData)
          setLoading(false)
        },
        error: (err) => {
          console.error('Error loading taxonomy data:', err)
          setError(`Error loading taxonomy data from ${filePath}`)
          setLoading(false)
        }
      })
    }

    loadTaxonomyData()
  }, [])

  const buildHierarchicalData = () => {
    const taxonomicLevels = ['superkingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species']
    const hierarchyCount: { [key: string]: number } = {}
    
    // Count occurrences for each hierarchical path
    data.forEach(row => {
      let currentPath = ''
      taxonomicLevels.forEach(level => {
        const value = row[level] || 'Unknown'
        currentPath = currentPath ? `${currentPath}/${value}` : value
        
        if (!hierarchyCount[currentPath]) {
          hierarchyCount[currentPath] = 0
        }
        hierarchyCount[currentPath]++
      })
    })

    // Build the data structure for Plotly
    const labels: string[] = []
    const parents: string[] = []
    const values: number[] = []
    const ids: string[] = []

    // Add root levels first
    const processedPaths = new Set<string>()
    
    Object.keys(hierarchyCount).forEach(path => {
      const pathParts = path.split('/')
      
      // Process each level of the path
      for (let i = 0; i < pathParts.length; i++) {
        const currentPath = pathParts.slice(0, i + 1).join('/')
        const parentPath = i > 0 ? pathParts.slice(0, i).join('/') : ''
        
        if (!processedPaths.has(currentPath)) {
          labels.push(pathParts[i])
          parents.push(parentPath)
          values.push(hierarchyCount[currentPath] || 0)
          ids.push(currentPath)
          processedPaths.add(currentPath)
        }
      }
    })

    return { labels, parents, values, ids }
  }

  const createIciclePlot = (): any => {
    const { labels, parents, values, ids } = buildHierarchicalData()
    
    return {
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
  }

  const createTreemapPlot = (): any => {
    const { labels, parents, values, ids } = buildHierarchicalData()
    
    return {
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
  }

  if (loading) {
    return <div>Loading taxonomy data...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  if (data.length === 0) {
    return <div>No taxonomy data available</div>
  }

  const plotData = plotType === 'icicle' ? createIciclePlot() : createTreemapPlot()
  const title = plotType === 'icicle' ? 'Taxonomic Hierarchy - Icicle Plot' : 'Taxonomic Hierarchy - Treemap'

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
}

export default TaxonomyPlots
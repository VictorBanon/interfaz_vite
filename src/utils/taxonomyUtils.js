// Función para leer y procesar el archivo taxonomy.csv
export const readTaxonomyData = async () => {
  try {
    const response = await fetch('/data/taxonomy.csv')
    const text = await response.text()
    
    // Parsear CSV
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',')
    
    // Encontrar las columnas taxonómicas
    const taxonomicColumns = ['superkingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species']
    
    // Crear un objeto para almacenar los valores únicos de cada columna
    const taxonomyData = {}
    taxonomicColumns.forEach(col => {
      taxonomyData[col] = new Set()
    })
    
    // Procesar cada fila del CSV
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',')
      taxonomicColumns.forEach((col, index) => {
        const headerIndex = headers.indexOf(col)
        if (headerIndex !== -1 && values[headerIndex] && values[headerIndex].trim() !== '') {
          taxonomyData[col].add(values[headerIndex].trim())
        }
      })
    }
    
    // Convertir Sets a arrays y ordenar
    const processedData = {}
    taxonomicColumns.forEach(col => {
      processedData[col] = Array.from(taxonomyData[col]).sort()
    })
    
    return {
      columns: taxonomicColumns,
      data: processedData
    }
  } catch (error) {
    console.error('Error reading taxonomy data:', error)
    return {
      columns: ['superkingdom'],
      data: { superkingdom: ['Bacteria'] }
    }
  }
}

// Función para obtener los valores de una columna taxonómica específica
export const getTaxonValues = (taxonomyData, column) => {
  return taxonomyData.data[column] || []
}

// Función para construir la ruta jerárquica del archivo ACP
export const buildACPFilePath = async (taxon, taxonValue, part, aggregate, pcX, pcY) => {
  try {
    // Cargar los datos de taxonomía si no se han proporcionado
    const taxonomyData = await readTaxonomyData()
    
    // Definir el orden jerárquico de las columnas taxonómicas
    const hierarchyOrder = ['superkingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species']
    
    // Encontrar el índice del taxón seleccionado
    const taxonIndex = hierarchyOrder.indexOf(taxon)
    if (taxonIndex === -1) {
      throw new Error(`Taxón no válido: ${taxon}`)
    }
    
    // Obtener la jerarquía hasta el taxón seleccionado
    const relevantHierarchy = hierarchyOrder.slice(0, taxonIndex + 1)
    
    // Buscar la fila que contiene el valor del taxón seleccionado
    const response = await fetch('/data/taxonomy.csv')
    const text = await response.text()
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',')
    
    // Encontrar los índices de las columnas relevantes
    const columnIndices = {}
    relevantHierarchy.forEach(col => {
      columnIndices[col] = headers.indexOf(col)
    })
    
    // Buscar la fila que coincide con el taxonValue
    let hierarchyValues = null
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',')
      const targetColumnIndex = columnIndices[taxon]
      if (values[targetColumnIndex] === taxonValue) {
        // Extraer todos los valores de la jerarquía para esta fila
        hierarchyValues = {}
        relevantHierarchy.forEach(col => {
          const colIndex = columnIndices[col]
          hierarchyValues[col] = values[colIndex]
        })
        break
      }
    }
    
    if (!hierarchyValues) {
      throw new Error(`No se encontró el valor ${taxonValue} en la columna ${taxon}`)
    }
    
    // Construir la ruta de la carpeta jerárquica
    const folderPath = relevantHierarchy.map(level => hierarchyValues[level]).join('/')
    
    // Construir el nombre del archivo basado en los parámetros
    let fileName
    if (aggregate === 'PC') {
      fileName = `PC${pcX}_hc_${part}_${taxonValue}.csv`
    } else if (aggregate === 'acp') {
      fileName = `acp_hc_${part}_${taxonValue}.csv`
    } else {
      fileName = `${aggregate}_hc_${part}_${taxonValue}.csv`
    }
    
    // Ruta completa
    const fullPath = `/data/philogenie/${folderPath}/${fileName}`
    
    return fullPath
    
  } catch (error) {
    console.error('Error construyendo ruta ACP:', error)
    // Ruta por defecto en caso de error
    return `/data/philogenie/Bacteria/acp_hc_${part}_Bacteria.csv`
  }
}

// Función auxiliar para obtener la jerarquía de un taxonValue específico
export const getTaxonomyHierarchy = async (taxon, taxonValue) => {
  try {
    const response = await fetch('/data/taxonomy.csv')
    const text = await response.text()
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',')
    
    // Definir el orden jerárquico completo
    const hierarchyOrder = ['superkingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species']
    
    // Encontrar los índices de las columnas
    const columnIndices = {}
    hierarchyOrder.forEach(col => {
      columnIndices[col] = headers.indexOf(col)
    })
    
    // Buscar la fila que coincide con el taxonValue
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',')
      const targetColumnIndex = columnIndices[taxon]
      if (values[targetColumnIndex] === taxonValue) {
        // Construir objeto con toda la jerarquía
        const hierarchy = {}
        hierarchyOrder.forEach(col => {
          const colIndex = columnIndices[col]
          if (colIndex !== -1 && values[colIndex]) {
            hierarchy[col] = values[colIndex]
          }
        })
        return hierarchy
      }
    }
    return null
  } catch (error) {
    console.error('Error obteniendo jerarquía:', error)
    return null
  }
}
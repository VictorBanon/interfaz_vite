// Función para leer y procesar el archivo taxonomy.csv
import { TAXONOMIC_COLUMNS } from './constants.ts'

export const readTaxonomyData = async () => {
  try {
    const response = await fetch('/data/taxonomy.csv')
    const text = await response.text()
    
    // Parsear CSV
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',')
    
    // Encontrar las columnas taxonómicas
    const taxonomicColumns = TAXONOMIC_COLUMNS
    
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
    const hierarchyOrder = TAXONOMIC_COLUMNS
    
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
      if (values[targetColumnIndex] && values[targetColumnIndex].trim() === taxonValue) {
        hierarchyValues = {}
        relevantHierarchy.forEach(level => {
          const levelIndex = columnIndices[level]
          hierarchyValues[level] = values[levelIndex].trim()
        })
        break
      }
    }
    
    if (!hierarchyValues) {
      throw new Error(`Hierarchy not found for ${taxon}: ${taxonValue}`)
    }
    
    // Build hierarchical folder path
    const folderPath = relevantHierarchy.map(level => hierarchyValues[level]).join('/')
    
    // Build file name based on parameters
    let fileName
    if (aggregate === 'PC') {
      fileName = `PC${pcX}_hc_${part}_${taxonValue}.csv`
    } else if (aggregate === 'acp') {
      // For ACP files, use format with acp
      fileName = `acp_hc_${part}_${taxonValue}.csv`
    } else if (aggregate === 'kmer') {
      // For kmer files, use kmer-specific format (no part parameter for kmer)
      fileName = `acp_kmer_${taxonValue}.csv`
    } else {
      // For other aggregate types, use different structure if needed
      fileName = `acp_hc_${part}_${taxonValue}.csv`
    }
    
    // Full path
    const fullPath = `/data/philogenie/${folderPath}/${fileName}`
    
    return fullPath
    
  } catch (error) {
    console.error('Error building ACP path:', error)
    // Default path in case of error
    if (aggregate === 'PC') {
      return `/data/philogenie/Bacteria/PC${pcX}_hc_${part}_Bacteria.csv`
    } else if (aggregate === 'kmer') {
      return `/data/philogenie/Bacteria/acp_kmer_Bacteria.csv`
    } else {
      return `/data/philogenie/Bacteria/acp_hc_${part}_Bacteria.csv`
    }
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
    const hierarchyOrder = TAXONOMIC_COLUMNS
    
    // Encontrar los índices de las columnas
    const columnIndices = {}
    hierarchyOrder.forEach(col => {
      columnIndices[col] = headers.indexOf(col)
    })
    
    // Buscar la fila que coincide con el taxonValue
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',')
      const targetColumnIndex = columnIndices[taxon]
      if (values[targetColumnIndex] && values[targetColumnIndex].trim() === taxonValue) {
        const hierarchy = {}
        hierarchyOrder.forEach(level => {
          const levelIndex = columnIndices[level]
          if (levelIndex !== -1 && values[levelIndex]) {
            hierarchy[level] = values[levelIndex].trim()
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

// Función para construir la ruta jerárquica del archivo explained variance
export const buildExplainedVarianceFilePath = async (taxon, taxonValue, part, analysisType = "hc") => {
  try {
    // Cargar los datos de taxonomía si no se han proporcionado
    const taxonomyData = await readTaxonomyData()
    
    // Definir el orden jerárquico de las columnas taxonómicas
    const hierarchyOrder = TAXONOMIC_COLUMNS
    
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
      if (values[targetColumnIndex] && values[targetColumnIndex].trim() === taxonValue) {
        hierarchyValues = {}
        relevantHierarchy.forEach(level => {
          const levelIndex = columnIndices[level]
          hierarchyValues[level] = values[levelIndex].trim()
        })
        break
      }
    }
    
    if (!hierarchyValues) {
      throw new Error(`No se encontró jerarquía para ${taxon}: ${taxonValue}`)
    }
    
    // Construir la ruta de la carpeta jerárquica
    const folderPath = relevantHierarchy.map(level => hierarchyValues[level]).join('/')
    
    // Construir el nombre del archivo
    const fileName = `explained_variance_ratio_${analysisType}_${part}_${taxonValue}.csv`
    
    // Ruta completa
    const fullPath = `/data/philogenie/${folderPath}/${fileName}`
    
    return fullPath
    
  } catch (error) {
    console.error('Error construyendo ruta explained variance:', error)
    // Ruta por defecto en caso de error
    return `/data/philogenie/Bacteria/explained_variance_ratio_${analysisType}_${part}_Bacteria.csv`
  }
}

// Función para leer y procesar el archivo explained_variance_ratio.csv
export const readExplainedVarianceData = async (taxon = "superkingdom", taxonValue = "Bacteria", part = "all", analysisType = "hc") => {
  try {
    // Intentar primero con el tipo de análisis especificado
    let filePath = await buildExplainedVarianceFilePath(taxon, taxonValue, part, analysisType)
    let response = await fetch(filePath)
    
    // Si es kmer y no se encuentra, intentar con hc como fallback
    if (!response.ok && analysisType === "kmer") {
      console.log(`Archivo kmer no encontrado, intentando con hc: ${filePath}`)
      filePath = await buildExplainedVarianceFilePath(taxon, taxonValue, part, "hc")
      response = await fetch(filePath)
    }
    
    if (!response.ok) {
      console.error(`No se pudo cargar el archivo: ${filePath}`)
      return {}
    }
    
    const text = await response.text()
    
    // Parsear CSV
    const lines = text.trim().split('\n')
    if (lines.length < 2) {
      console.error('Archivo CSV vacío o sin datos')
      return {}
    }
    
    const headers = lines[0].split(',')
    
    // Verificar que las columnas necesarias existen
    const requiredColumns = ['PC', 'explained_variance_ratio', 'cumulative_explained_variance']
    const hasAllColumns = requiredColumns.every(col => headers.includes(col))
    
    if (!hasAllColumns) {
      console.error('El archivo CSV no tiene las columnas requeridas:', headers)
      return {}
    }
    
    // Procesar los datos
    const explainedVarianceData = {}
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',')
      if (values.length >= 3) {
        const pc = values[0].trim()
        const explainedVarianceRatio = parseFloat(values[1])
        const cumulativeExplainedVariance = parseFloat(values[2])
        
        explainedVarianceData[pc] = {
          explainedVarianceRatio,
          cumulativeExplainedVariance
        }
      }
    }
    
    return explainedVarianceData
  } catch (error) {
    console.error('Error reading explained variance data:', error)
    return {}
  }
}

// Función para obtener el explained variance ratio de un PC específico
export const getExplainedVarianceRatio = (explainedVarianceData, pcNumber) => {
  if (!explainedVarianceData) {
    return '?'
  }
  const pcKey = `PC${pcNumber}`
  if (explainedVarianceData[pcKey]) {
    return (explainedVarianceData[pcKey].explainedVarianceRatio * 100).toFixed(2)
  }
  return '?'
}

// Función para obtener el explained variance ratio acumulativo de un PC específico
export const getCumulativeExplainedVariance = (explainedVarianceData, pcNumber) => {
  if (!explainedVarianceData) {
    return '?'
  }
  const pcKey = `PC${pcNumber}`
  if (explainedVarianceData[pcKey]) {
    return (explainedVarianceData[pcKey].cumulativeExplainedVariance * 100).toFixed(2)
  }
  return '?'
}

// Función para construir la ruta jerárquica del archivo Mean/Median
export const buildMeanMedianFilePath = async (taxon, taxonValue, part, type) => {
  try {
    // Cargar los datos de taxonomía si no se han proporcionado
    const taxonomyData = await readTaxonomyData()
    
    // Definir el orden jerárquico de las columnas taxonómicas
    const hierarchyOrder = TAXONOMIC_COLUMNS
    
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
      if (values[targetColumnIndex] && values[targetColumnIndex].trim() === taxonValue) {
        hierarchyValues = {}
        relevantHierarchy.forEach(level => {
          const levelIndex = columnIndices[level]
          hierarchyValues[level] = values[levelIndex].trim()
        })
        break
      }
    }
    
    if (!hierarchyValues) {
      throw new Error(`No se encontró jerarquía para ${taxon}: ${taxonValue}`)
    }
    
    // Construir la ruta de la carpeta jerárquica
    const folderPath = relevantHierarchy.map(level => hierarchyValues[level]).join('/')
    
    // Construir el nombre del archivo
    const fileName = `hc_${taxonValue}_${part}_${type}.csv`
    
    // Ruta completa
    const fullPath = `/data/philogenie/${folderPath}/${fileName}`
    
    return fullPath
    
  } catch (error) {
    console.error('Error construyendo ruta Mean-Median:', error)
    // Ruta por defecto en caso de error
    return `/data/philogenie/Bacteria/hc_Bacteria_${part}_${type}.csv`
  }
}

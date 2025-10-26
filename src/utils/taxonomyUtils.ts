import { TAXONOMIC_COLUMNS } from "./constants.ts"

export interface TaxonomyData {
  columns: string[];
  data: Record<string, string[]>;
}

export interface ExplainedVarianceData {
  [key: string]: {
    explainedVarianceRatio: number;
    cumulativeExplainedVariance: number;
  };
}

export const readTaxonomyData = async (): Promise<TaxonomyData> => {
  try {
    const response = await fetch("/data/taxonomy.csv")
    const text = await response.text()
    
    const lines = text.trim().split("\n")
    const headers = lines[0].split(",")
    
    const taxonomicColumns = TAXONOMIC_COLUMNS
    const taxonomyData: Record<string, Set<string>> = {}
    
    taxonomicColumns.forEach(col => {
      taxonomyData[col] = new Set()
    })
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",")
      taxonomicColumns.forEach((col) => {
        const headerIndex = headers.indexOf(col)
        if (headerIndex !== -1 && values[headerIndex] && values[headerIndex].trim() !== "") {
          taxonomyData[col].add(values[headerIndex].trim())
        }
      })
    }
    
    const processedData: Record<string, string[]> = {}
    taxonomicColumns.forEach(col => {
      processedData[col] = Array.from(taxonomyData[col]).sort()
    })
    
    return {
      columns: taxonomicColumns,
      data: processedData
    }
  } catch (error) {
    console.error("Error reading taxonomy data:", error)
    return {
      columns: ["Superdomain"],
      data: { Superdomain: ["Prokaryote"] }
    }
  }
}

// Función para obtener los valores de una columna taxonómica específica
export const getTaxonValues = (taxonomyData: TaxonomyData, column: string): string[] => {
  return taxonomyData.data[column] || []
}

// Función para construir la ruta jerárquica del archivo ACP
export const buildACPFilePath = async (
  taxon: string, 
  taxonValue: string, 
  part: string, 
  aggregate: string, 
  pcX: number, 
  _pcY?: number
): Promise<string> => {
  try {
    await readTaxonomyData()
    
    const hierarchyOrder = TAXONOMIC_COLUMNS
    const taxonIndex = hierarchyOrder.indexOf(taxon)
    if (taxonIndex === -1) {
      throw new Error(`Taxón no válido: ${taxon}`)
    }
    
    const relevantHierarchy = hierarchyOrder.slice(0, taxonIndex + 1)
    
    const response = await fetch("/data/taxonomy.csv")
    const text = await response.text()
    const lines = text.trim().split("\n")
    const headers = lines[0].split(",")
    
    const columnIndices: Record<string, number> = {}
    relevantHierarchy.forEach(col => {
      columnIndices[col] = headers.indexOf(col)
    })
    
    let hierarchyValues: Record<string, string> | null = null
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",")
      const targetColumnIndex = columnIndices[taxon]
      if (values[targetColumnIndex] && values[targetColumnIndex].trim() === taxonValue) {
        hierarchyValues = {}
        relevantHierarchy.forEach(level => {
          const levelIndex = columnIndices[level]
          hierarchyValues![level] = values[levelIndex].trim()
        })
        break
      }
    }
    
    if (!hierarchyValues) {
      throw new Error(`Hierarchy not found for ${taxon}: ${taxonValue}`)
    }
    
    const folderPath = relevantHierarchy.map(level => hierarchyValues![level]).join("/")
    
    let fileName: string
    if (aggregate === "PC") {
      fileName = `PC${pcX}_hc_${part}_${taxonValue}.csv`
    } else if (aggregate === "acp") {
      fileName = `acp_hc_${part}_${taxonValue}.csv`
    } else if (aggregate === "kmer") {
      fileName = `acp_kmer_${taxonValue}.csv`
    } else {
      fileName = `acp_hc_${part}_${taxonValue}.csv`
    }
    
    const fullPath = `/data/philogenie/${folderPath}/${fileName}`
    return fullPath
    
  } catch (error) {
    console.error("Error building ACP path:", error)
    if (aggregate === "PC") {
      return `/data/philogenie/Prokaryote/PC${pcX}_hc_${part}_Prokaryote.csv`
    } else if (aggregate === "kmer") {
      return `/data/philogenie/Prokaryote/acp_kmer_Prokaryote.csv`
    } else {
      return `/data/philogenie/Prokaryote/acp_hc_${part}_Prokaryote.csv`
    }
  }
}

// Función para construir la ruta jerárquica del archivo explained variance
export const buildExplainedVarianceFilePath = async (
  taxon: string, 
  taxonValue: string, 
  part: string, 
  analysisType: string = "hc"
): Promise<string> => {
  try {
    await readTaxonomyData()
    
    const hierarchyOrder = TAXONOMIC_COLUMNS
    const taxonIndex = hierarchyOrder.indexOf(taxon)
    if (taxonIndex === -1) {
      throw new Error(`Taxón no válido: ${taxon}`)
    }
    
    const relevantHierarchy = hierarchyOrder.slice(0, taxonIndex + 1)
    
    const response = await fetch("/data/taxonomy.csv")
    const text = await response.text()
    const lines = text.trim().split("\n")
    const headers = lines[0].split(",")
    
    const columnIndices: Record<string, number> = {}
    relevantHierarchy.forEach(col => {
      columnIndices[col] = headers.indexOf(col)
    })
    
    let hierarchyValues: Record<string, string> | null = null
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",")
      const targetColumnIndex = columnIndices[taxon]
      if (values[targetColumnIndex] && values[targetColumnIndex].trim() === taxonValue) {
        hierarchyValues = {}
        relevantHierarchy.forEach(level => {
          const levelIndex = columnIndices[level]
          hierarchyValues![level] = values[levelIndex].trim()
        })
        break
      }
    }
    
    if (!hierarchyValues) {
      throw new Error(`No se encontró jerarquía para ${taxon}: ${taxonValue}`)
    }
    
    const folderPath = relevantHierarchy.map(level => hierarchyValues![level]).join("/")
    const fileName = `explained_variance_ratio_${analysisType}_${part}_${taxonValue}.csv`
    const fullPath = `/data/philogenie/${folderPath}/${fileName}`
    
    return fullPath
    
  } catch (error) {
    console.error("Error construyendo ruta explained variance:", error)
    return `/data/philogenie/Prokaryote/explained_variance_ratio_${analysisType}_${part}_Prokaryote.csv`
  }
}

// Función para leer y procesar el archivo explained_variance_ratio.csv
export const readExplainedVarianceData = async (
  taxon: string = "Superdomain", 
  taxonValue: string = "Prokaryote", 
  part: string = "all", 
  analysisType: string = "hc"
): Promise<ExplainedVarianceData> => {
  try {
    let filePath = await buildExplainedVarianceFilePath(taxon, taxonValue, part, analysisType)
    let response = await fetch(filePath)
    
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
    const lines = text.trim().split("\n")
    if (lines.length < 2) {
      console.error("Archivo CSV vacío o sin datos")
      return {}
    }
    
    const headers = lines[0].split(",")
    const requiredColumns = ["PC", "explained_variance_ratio", "cumulative_explained_variance"]
    const hasAllColumns = requiredColumns.every(col => headers.includes(col))
    
    if (!hasAllColumns) {
      console.error("El archivo CSV no tiene las columnas requeridas:", headers)
      return {}
    }
    
    const explainedVarianceData: ExplainedVarianceData = {}
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",")
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
    console.error("Error reading explained variance data:", error)
    return {}
  }
}

// Función para obtener el explained variance ratio de un PC específico
export const getExplainedVarianceRatio = (
  explainedVarianceData: ExplainedVarianceData | null, 
  pcNumber: number
): string => {
  if (!explainedVarianceData) {
    return "?"
  }
  const pcKey = `PC${pcNumber}`
  if (explainedVarianceData[pcKey]) {
    return (explainedVarianceData[pcKey].explainedVarianceRatio * 100).toFixed(2)
  }
  return "?"
}

// Función para obtener el explained variance ratio acumulativo de un PC específico
export const getCumulativeExplainedVariance = (
  explainedVarianceData: ExplainedVarianceData | null, 
  pcNumber: number
): string => {
  if (!explainedVarianceData) {
    return "?"
  }
  const pcKey = `PC${pcNumber}`
  if (explainedVarianceData[pcKey]) {
    return (explainedVarianceData[pcKey].cumulativeExplainedVariance * 100).toFixed(2)
  }
  return "?"
}

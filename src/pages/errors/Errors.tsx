import { useState, useEffect } from 'react'
import Papa from 'papaparse'
import Sidebar from '../../components/sidebar/Sidebar.jsx'
import './Errors.css'

interface TaxonomyData {
  ID: string
  'ID-replicon': string
  fullname?: string
  species?: string
  genus?: string
  family?: string
  order?: string
  class?: string
  phylum?: string
  superkingdom?: string
  size?: number
  GC?: number
}

interface FileCheckResult {
  path: string
  exists: boolean
  type: string
  id: string
  idReplicon: string
}

interface OrganismStats {
  id: string
  name: string
  totalFiles: number
  foundFiles: number
  missingFiles: number
  completionRate: number
}



const Errors = () => {
  const [taxonomyData, setTaxonomyData] = useState<TaxonomyData[]>([])
  const [fileResults, setFileResults] = useState<FileCheckResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [currentCheck, setCurrentCheck] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [lastAnalysis, setLastAnalysis] = useState<Date | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processedFiles, setProcessedFiles] = useState(0)
  const [totalFiles, setTotalFiles] = useState(0)
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })
  const [fileIndex, setFileIndex] = useState<Set<string>>(new Set())
  const [indexLoaded, setIndexLoaded] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [analysisReady, setAnalysisReady] = useState(false)
  
  // UI state for large datasets
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 100
  const [searchTerm, setSearchTerm] = useState('')
  const [showMissingOnly, setShowMissingOnly] = useState(false)
  const [sortField, setSortField] = useState<'status' | 'type' | 'id' | 'idReplicon' | 'path'>('status')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  // Configuration for large datasets
  const BATCH_SIZE = 50 // Process 50 files at once
  const MAX_CONCURRENT_REQUESTS = 10 // Maximum simultaneous requests
  const PROGRESS_UPDATE_INTERVAL = 100 // Update UI every 100 files

  // Define file patterns to check
  const filePatterns = [
    // Structural analysis files
    { type: 'Structural (all)', pattern: (id: string, idReplicon: string) => `./data/${id}/analysis/${idReplicon}_hc_all.csv` },
    { type: 'Structural (coding)', pattern: (id: string, idReplicon: string) => `./data/${id}/analysis/${idReplicon}_hc_cod.csv` },
    { type: 'Structural (non-coding)', pattern: (id: string, idReplicon: string) => `./data/${id}/analysis/${idReplicon}_hc_non.csv` },
    
    // Arm analysis files
    { type: 'Arm Analysis (all)', pattern: (id: string, idReplicon: string) => `./data/${id}/analysis/${idReplicon}_hb_arm_all.csv` },
    { type: 'Arm Analysis (coding)', pattern: (id: string, idReplicon: string) => `./data/${id}/analysis/${idReplicon}_hb_arm_cod.csv` },
    { type: 'Arm Analysis (non-coding)', pattern: (id: string, idReplicon: string) => `./data/${id}/analysis/${idReplicon}_hb_arm_non.csv` },
    
    // Gap analysis files
    { type: 'Gap Analysis (all)', pattern: (id: string, idReplicon: string) => `./data/${id}/analysis/${idReplicon}_hb_gap_all.csv` },
    { type: 'Gap Analysis (coding)', pattern: (id: string, idReplicon: string) => `./data/${id}/analysis/${idReplicon}_hb_gap_cod.csv` },
    { type: 'Gap Analysis (non-coding)', pattern: (id: string, idReplicon: string) => `./data/${id}/analysis/${idReplicon}_hb_gap_non.csv` },
    
    // Ha analysis files
    { type: 'Ha Analysis (all)', pattern: (id: string, idReplicon: string) => `./data/${id}/analysis/${idReplicon}_ha_all.csv` },
    { type: 'Ha Analysis (coding)', pattern: (id: string, idReplicon: string) => `./data/${id}/analysis/${idReplicon}_ha_cod.csv` },
    { type: 'Ha Analysis (non-coding)', pattern: (id: string, idReplicon: string) => `./data/${id}/analysis/${idReplicon}_ha_non.csv` },
    
    // K-mer analysis files
    { type: 'K-mer Coding', pattern: (id: string, idReplicon: string) => `./data/${id}/analysis/${idReplicon}_cod_6mer.csv` },
    { type: 'K-mer Non-coding', pattern: (id: string, idReplicon: string) => `./data/${id}/analysis/${idReplicon}_non_6mer.csv` },
    { type: 'K-mer Ratio', pattern: (id: string, idReplicon: string) => `./data/${id}/analysis/${idReplicon}_ratio_cod_vs_non_6mer.csv` },
    { type: 'K-mer Nucleotide Ratio (coding)', pattern: (id: string, idReplicon: string) => `./data/${id}/analysis/${idReplicon}_cod_nucleotide_ratio_6mer.csv` },
    { type: 'K-mer Nucleotide Ratio (non-coding)', pattern: (id: string, idReplicon: string) => `./data/${id}/analysis/${idReplicon}_non_nucleotide_ratio_6mer.csv` },
    
    // Motif analysis files
    { type: 'Motif (IR)', pattern: (id: string, idReplicon: string) => `./data/${id}/analysis/${idReplicon}_rich_ir.csv` },
    { type: 'IR Histogram', pattern: (id: string, idReplicon: string) => `./data/${id}/analysis/${idReplicon}_ir_histogram.csv` },
    { type: 'IR Neighborhood', pattern: (id: string, idReplicon: string) => `./data/${id}/analysis/${idReplicon}_ir_neighborhood.csv` },
    { type: 'IR Region', pattern: (id: string, idReplicon: string) => `./data/${id}/analysis/${idReplicon}_ir_region.csv` },
    
    // Structural observed and simulated data
    { type: 'Observed Top10 (all)', pattern: (id: string, idReplicon: string) => `./data/${id}/analysis/${idReplicon}_all_obs_top10_per_gap_size.csv` },
    { type: 'Observed Top10 (coding)', pattern: (id: string, idReplicon: string) => `./data/${id}/analysis/${idReplicon}_cod_obs_top10_per_gap_size.csv` },
    { type: 'Observed Top10 (non-coding)', pattern: (id: string, idReplicon: string) => `./data/${id}/analysis/${idReplicon}_non_obs_top10_per_gap_size.csv` },
    { type: 'Observed Matrix (all)', pattern: (id: string, idReplicon: string) => `./data/${id}/analysis/${idReplicon}_all_obs_top10_per_gap_size_matrix.csv` },
    { type: 'Observed Matrix (coding)', pattern: (id: string, idReplicon: string) => `./data/${id}/analysis/${idReplicon}_cod_obs_top10_per_gap_size_matrix.csv` },
    { type: 'Observed Matrix (non-coding)', pattern: (id: string, idReplicon: string) => `./data/${id}/analysis/${idReplicon}_non_obs_top10_per_gap_size_matrix.csv` },
    { type: 'Aggregated Observed (all)', pattern: (id: string, idReplicon: string) => `./data/${id}/analysis/${idReplicon}_all_result_obs_aggregated.csv` },
    { type: 'Aggregated Observed (coding)', pattern: (id: string, idReplicon: string) => `./data/${id}/analysis/${idReplicon}_cod_result_obs_aggregated.csv` },
    { type: 'Aggregated Observed (non-coding)', pattern: (id: string, idReplicon: string) => `./data/${id}/analysis/${idReplicon}_non_result_obs_aggregated.csv` },
    { type: 'Aggregated Simulated (all)', pattern: (id: string, idReplicon: string) => `./data/${id}/analysis/${idReplicon}_all_result_sim_aggregated.csv` },
    { type: 'Aggregated Simulated (coding)', pattern: (id: string, idReplicon: string) => `./data/${id}/analysis/${idReplicon}_cod_result_sim_aggregated.csv` },
    { type: 'Aggregated Simulated (non-coding)', pattern: (id: string, idReplicon: string) => `./data/${id}/analysis/${idReplicon}_non_result_sim_aggregated.csv` },
    
    // Genomic files
    { type: 'Genomic FASTA', pattern: (id: string, _idReplicon: string) => `./data/${id}/preprocessing/${id}_genomic.fna` },
    
    // Postprocessing files
    { type: 'Postprocessing', pattern: (id: string, idReplicon: string) => `./data/${id}/postprocessing/${idReplicon}_postprocessing.csv` },
  ]

  useEffect(() => {
    // Initialize immediately with cached data if available
    const initializeApp = async () => {
      setInitialLoading(true)
      
      // Try to load recent cached results first for instant UI
      const hasRecentCache = loadSavedResults()
      
      // Load core data in parallel
      const taxonomyPromise = loadTaxonomyData()
      const indexPromise = loadFileIndex()
      
      // Wait for both to complete
      await Promise.all([taxonomyPromise, indexPromise])
      
      setInitialLoading(false)
      
      // If we have recent cache, we're ready
      if (hasRecentCache) {
        console.log('✅ Using recent cached data - ready!')
      } else {
        setAnalysisReady(true) // Will trigger fresh analysis
      }
    }
    
    initializeApp()
  }, [])

  // Start analysis when both index and taxonomy data are ready (non-blocking)
  useEffect(() => {
    if (indexLoaded && taxonomyData.length > 0 && analysisReady) {
      // Only run analysis if we don't have recent results
      const hasRecentResults = fileResults.length > 0 && lastAnalysis && 
        (Date.now() - lastAnalysis.getTime()) < (60 * 60 * 1000) // 1 hour
      
      if (!hasRecentResults) {
        // Defer analysis slightly to allow UI to render first
        setTimeout(() => {
          console.log('🔄 Starting fresh analysis...')
          checkFiles(taxonomyData)
        }, 200)
      } else {
        console.log('✅ Using cached results, analysis skipped')
      }
    }
  }, [indexLoaded, taxonomyData, analysisReady])

  // Lightweight dynamic index generator (fallback only)
  const generateDynamicIndexLite = async (): Promise<Set<string>> => {
    if (taxonomyData.length === 0) return new Set()
    
    console.log('🔄 Generating lightweight dynamic index...')
    setCurrentCheck('Scanning for files...')
    
    const foundFiles = new Set<string>()
    const organismIds = [...new Set(taxonomyData.map(row => row.ID).filter(Boolean))]
    
    // Quick pattern-based check for essential files only
    const essentialPatterns = [
      '_hc_all.csv', '_hc_cod.csv', '_hc_non.csv',
      '_genomic.fna', '_postprocessing.csv'
    ]
    
    let checked = 0
    const total = organismIds.length * essentialPatterns.length
    
    for (const orgId of organismIds) {
      for (const pattern of essentialPatterns) {
        const possiblePaths = [
          `data/${orgId}/analysis/chromosome_${orgId}${pattern}`,
          `data/${orgId}/analysis/plasmid_unnamed_${orgId}${pattern}`,
          `data/${orgId}/preprocessing/${orgId}${pattern}`,
          `data/${orgId}/postprocessing/chromosome_${orgId}${pattern}`
        ]
        
        for (const path of possiblePaths) {
          try {
            const response = await fetch(`./${path}`, { method: 'HEAD' })
            if (response.ok) foundFiles.add(path)
          } catch { /* ignore */ }
        }
        
        checked++
        if (checked % 10 === 0) {
          setCurrentCheck(`Scanning... ${Math.round((checked/total)*100)}%`)
        }
      }
    }
    
    setCurrentCheck('')
    console.log(`✅ Generated lite index: ${foundFiles.size} files`)
    return foundFiles
  }

  // Load file index to avoid individual HTTP requests
  const loadFileIndex = async () => {
    try {
      const response = await fetch('./file_index.txt')
      if (response.ok) {
        const text = await response.text()
        const files = text.trim().split('\n').filter(line => line.length > 0)
        setFileIndex(new Set(files))
        setIndexLoaded(true)
        console.log(`✅ Loaded static index with ${files.length} files`)
        return true
      } else {
        console.warn('⚠️ Static index not found, will use dynamic generation when needed')
        setIndexLoaded(true)
        return false
      }
    } catch (error) {
      console.warn('⚠️ Error loading static index:', error)
      setIndexLoaded(true)
      return false
    }
  }

  // Save results to localStorage for large datasets
  const saveResultsToLocal = (results: FileCheckResult[]) => {
    try {
      const dataToSave = {
        results,
        timestamp: new Date().toISOString(),
        taxonomyCount: taxonomyData.length
      }
      localStorage.setItem('fileAnalysisResults', JSON.stringify(dataToSave))
    } catch (error) {
      console.warn('Could not save results to localStorage:', error)
    }
  }

  // Load saved results from localStorage
  const loadSavedResults = () => {
    try {
      const savedData = localStorage.getItem('fileAnalysisResults')
      if (savedData) {
        const parsed = JSON.parse(savedData)
        const savedDate = new Date(parsed.timestamp)
        const hoursSinceLastAnalysis = (Date.now() - savedDate.getTime()) / (1000 * 60 * 60)
        
        // Load recent cache for instant UI (within 1 hour)
        if (hoursSinceLastAnalysis < 1 && parsed.results) {
          setFileResults(parsed.results)
          setLastAnalysis(savedDate)
          setAnalysisReady(true) // Mark as ready since we have data
          console.log(`⚡ Loaded ${parsed.results.length} cached results (${hoursSinceLastAnalysis.toFixed(1)}h old)`)
          return true
        }
        // Keep older cache but don't mark as ready (will re-analyze)
        else if (hoursSinceLastAnalysis < 24 && parsed.results) {
          setFileResults(parsed.results)
          setLastAnalysis(savedDate)
          console.log(`📋 Loaded ${parsed.results.length} cached results (${hoursSinceLastAnalysis.toFixed(1)}h old) - will refresh`)
          return false
        }
      }
      return false
    } catch (error) {
      console.warn('Could not load saved results:', error)
      return false
    }
  }

  // Clear cached results and force fresh analysis
  const clearCacheAndReload = () => {
    localStorage.removeItem('fileAnalysisResults')
    setFileResults([])
    setLastAnalysis(null)
    if (taxonomyData.length > 0 && indexLoaded) {
      checkFiles(taxonomyData)
    }
  }

  // Refresh file index (useful when files are added/removed)
  const refreshFileIndex = async () => {
    setLoading(true)
    setCurrentCheck('Generating fresh file index...')
    
    try {
      // Use the lite generator for faster refresh
      const dynamicIndex = await generateDynamicIndexLite()
      setFileIndex(dynamicIndex)
      
      // Restart analysis with new index
      if (taxonomyData.length > 0) {
        checkFiles(taxonomyData)
      }
    } catch (error) {
      console.error('Error refreshing file index:', error)
      setError('Failed to refresh file index')
    } finally {
      setCurrentCheck('')
    }
  }



  const loadTaxonomyData = async () => {
    try {
      setError(null)
      
      const response = await fetch('./data/taxonomy.csv')
      if (!response.ok) {
        throw new Error(`Could not load taxonomy file: ${response.status}`)
      }
      
      const csvText = await response.text()
      
      return new Promise<void>((resolve, reject) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (result) => {
            const data = result.data as TaxonomyData[]
            setTaxonomyData(data)
            console.log(`✅ Loaded ${data.length} taxonomy entries`)
            resolve()
          },
          error: (err: any) => {
            const errorMsg = `Error parsing taxonomy file: ${err.message}`
            setError(errorMsg)
            console.error(errorMsg)
            reject(new Error(errorMsg))
          }
        })
      })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error loading taxonomy data'
      setError(errorMsg)
      console.error(errorMsg)
      throw err
    }
  }

  // Optimized file checking function for large datasets
  const checkFiles = async (data: TaxonomyData[]) => {
    setIsProcessing(true)
    setLoading(true)
    setFileResults([])
    setProgress(0)
    setProcessedFiles(0)

    // Calculate total files to check
    const validRows = data.filter(row => row.ID && row['ID-replicon'])
    const total = validRows.length * filePatterns.length
    setTotalFiles(total)

    // Create all file check tasks
    const allTasks: Array<{
      filePath: string
      type: string
      id: string
      idReplicon: string
    }> = []

    validRows.forEach(row => {
      filePatterns.forEach(pattern => {
        allTasks.push({
          filePath: pattern.pattern(row.ID, row['ID-replicon']),
          type: pattern.type,
          id: row.ID,
          idReplicon: row['ID-replicon']
        })
      })
    })

    const results: FileCheckResult[] = []
    let completed = 0

    // Process in batches with true parallel execution
    const batchPromises: Promise<FileCheckResult[]>[] = []
    
    for (let i = 0; i < allTasks.length; i += BATCH_SIZE) {
      const batch = allTasks.slice(i, i + BATCH_SIZE)
      const batchIndex = Math.floor(i / BATCH_SIZE)
      
      // Create promise for this batch that will run in parallel
      const batchPromise = (async () => {
        // Small staggered delay to prevent all batches from starting simultaneously
        await new Promise(resolve => setTimeout(resolve, batchIndex * 100))
        
        // Process batch with controlled concurrency
        const batchResults = await Promise.all(
          batch.map(async (task, taskIndex) => {
            // Stagger requests within batch to avoid overwhelming the server
            if (taskIndex > 0 && taskIndex % MAX_CONCURRENT_REQUESTS === 0) {
              await new Promise(resolve => setTimeout(resolve, 50))
            }
            return checkSingleFile(task)
          })
        )
        
        return batchResults
      })()
      
      batchPromises.push(batchPromise)
    }

    // Set initial batch progress
    setBatchProgress({ current: 0, total: batchPromises.length })

    // Process all batches in parallel with progress tracking
    try {
      let completedBatches = 0
      
      // Use Promise.allSettled to handle individual batch failures
      const batchSettledResults = await Promise.allSettled(
        batchPromises.map(async (batchPromise) => {
          const batchResults = await batchPromise
          
          // Update progress as each batch completes
          completedBatches++
          completed += batchResults.length
          
          setBatchProgress({ current: completedBatches, total: batchPromises.length })
          setProcessedFiles(completed)
          setProgress((completed / total) * 100)
          setCurrentCheck(`Completed batch ${completedBatches} of ${batchPromises.length}`)

          // Update UI with intermediate results for better UX
          if (completed % PROGRESS_UPDATE_INTERVAL === 0 || completed === total) {
            results.push(...batchResults)
            setFileResults([...results])
          }

          return batchResults
        })
      )

      // Collect all successful results
      batchSettledResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(...result.value)
        } else {
          console.error('Batch failed:', result.reason)
        }
      })

    } catch (error) {
      console.error('Error in parallel batch processing:', error)
    }

    // Final update
    setFileResults(results)
    setLoading(false)
    setIsProcessing(false)
    setCurrentCheck('')
    setLastAnalysis(new Date())
    
    // Save results for large datasets
    if (results.length > 1000) {
      saveResultsToLocal(results)
    }
  }

  // Single file checking function with optimized performance
  const checkSingleFile = async (task: {
    filePath: string
    type: string
    id: string
    idReplicon: string
  }): Promise<FileCheckResult> => {
    let exists = false
    
    // Use file index if available for much faster checking
    if (indexLoaded && fileIndex.size > 0) {
      // Convert the path to match the index format
      const indexPath = task.filePath.replace(/^\.\//, '')
      exists = fileIndex.has(indexPath)
      
      // Early return for index-based checking (much faster)
      return {
        path: task.filePath,
        exists: exists,
        type: task.type,
        id: task.id,
        idReplicon: task.idReplicon
      }
    }
    
    // Fallback to HTTP requests if index is not available (slower)
    try {
      // Use HEAD request first for faster checking
      const headResponse = await fetch(task.filePath, { method: 'HEAD' })
      
      if (headResponse.status === 200) {
        exists = true
      } else if (headResponse.status === 404) {
        exists = false
      } else {
        // For ambiguous status codes, fall back to GET request
        const getResponse = await fetch(task.filePath)
        
        if (getResponse.status === 200) {
          const content = await getResponse.text()
          
          // Check if it's actually an HTML error page
          const isHtmlError = content.includes('<!DOCTYPE html>') || 
                            content.includes('<html') || 
                            content.includes('404') || 
                            content.includes('Not Found') ||
                            content.includes('Cannot resolve') ||
                            content.includes('File not found')
          
          if (isHtmlError) {
            exists = false
          } else {
            exists = !!(content && content.trim().length > 0)
            
            // File type specific validation (only for non-obvious cases)
            if (exists && task.filePath.endsWith('.csv')) {
              const lines = content.trim().split('\n')
              exists = lines.length > 0 && lines[0].length > 0 && !lines[0].includes('<')
            } else if (exists && task.filePath.endsWith('.fna')) {
              exists = content.trim().startsWith('>')
            }
          }
        } else {
          exists = false
        }
      }
    } catch (err) {
      exists = false
    }
    
    return {
      path: task.filePath,
      exists: exists,
      type: task.type,
      id: task.id,
      idReplicon: task.idReplicon
    }
  }

  const getOrganismStats = (): OrganismStats[] => {
    const organismMap = new Map<string, OrganismStats>()

    // Initialize organisms from taxonomy data
    taxonomyData.forEach(row => {
      if (row.ID) {
        organismMap.set(row.ID, {
          id: row.ID,
          name: row.fullname || row.species || row.ID,
          totalFiles: 0,
          foundFiles: 0,
          missingFiles: 0,
          completionRate: 0
        })
      }
    })

    // Count files for each organism
    fileResults.forEach(result => {
      const organism = organismMap.get(result.id)
      if (organism) {
        organism.totalFiles++
        if (result.exists) {
          organism.foundFiles++
        } else {
          organism.missingFiles++
        }
        organism.completionRate = organism.totalFiles > 0 ? 
          (organism.foundFiles / organism.totalFiles) * 100 : 0
      }
    })

    return Array.from(organismMap.values()).sort((a, b) => a.completionRate - b.completionRate)
  }



  const getOverallStats = () => {
    const total = fileResults.length
    const found = fileResults.filter(result => result.exists).length
    const missing = total - found
    const percentage = total > 0 ? (found / total) * 100 : 0

    return { total, found, missing, percentage }
  }



  const getUniqueFileTypes = () => {
    return [...new Set(fileResults.map(result => result.type))].sort()
  }

  // Advanced filtering and pagination for large datasets
  const getFilteredResults = () => {
    let filtered = fileResults

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(result => 
        result.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.idReplicon.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.path.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply missing files filter
    if (showMissingOnly) {
      filtered = filtered.filter(result => !result.exists)
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(result => 
        result.type.toLowerCase().includes(filterType.toLowerCase())
      )
    }

    // Apply sorting
    filtered = filtered.sort((a, b) => {
      let aValue: string | boolean
      let bValue: string | boolean
      
      switch (sortField) {
        case 'status':
          aValue = a.exists
          bValue = b.exists
          break
        case 'type':
          aValue = a.type
          bValue = b.type
          break
        case 'id':
          aValue = a.id
          bValue = b.id
          break
        case 'idReplicon':
          aValue = a.idReplicon
          bValue = b.idReplicon
          break
        case 'path':
          aValue = a.path
          bValue = b.path
          break
        default:
          aValue = a.exists
          bValue = b.exists
      }

      if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        return sortDirection === 'asc' 
          ? (aValue === bValue ? 0 : aValue ? 1 : -1)
          : (aValue === bValue ? 0 : aValue ? -1 : 1)
      } else {
        const comparison = String(aValue).localeCompare(String(bValue))
        return sortDirection === 'asc' ? comparison : -comparison
      }
    })

    return filtered
  }

  // Handle column sorting
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    setCurrentPage(1) // Reset to first page when sorting
  }

  const getPaginatedResults = () => {
    const filtered = getFilteredResults()
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    
    return {
      items: filtered.slice(startIndex, endIndex),
      totalItems: filtered.length,
      totalPages: Math.ceil(filtered.length / itemsPerPage),
      currentPage: currentPage,
      hasNextPage: endIndex < filtered.length,
      hasPrevPage: startIndex > 0
    }
  }





  if (loading) {
    return (
      <div className="errors-dashboard">
        <div className="loading">
          <h2>Analyzing File System...</h2>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            >
              {progress.toFixed(1)}%
            </div>
          </div>
          <p>{currentCheck}</p>
          <p>Loaded {taxonomyData.length} entries from taxonomy.csv</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="errors-dashboard">
        <div className="error">
          <h2>Error Loading Data</h2>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="dashboard">
        <Sidebar />
        <main className="main-content">
          <div className="errors-dashboard">
            <div className="loading">
              <h2>Analyzing File System...</h2>
              
              {/* Overall Progress */}
              <div className="progress-section">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${progress}%` }}
                  >
                    {progress.toFixed(1)}%
                  </div>
                </div>
                <div className="progress-info">
                  <span>{processedFiles.toLocaleString()} / {totalFiles.toLocaleString()} files processed</span>
                  {totalFiles > 1000 && (
                    <span style={{ marginLeft: '20px', fontSize: '0.9em', color: '#666' }}>
                      Large dataset detected - using optimized processing
                    </span>
                  )}
                </div>
              </div>

              {/* Batch Progress for large datasets */}
              {batchProgress.total > 1 && (
                <div className="batch-progress-section">
                  <h4>Batch Progress</h4>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ 
                        width: `${(batchProgress.current / batchProgress.total) * 100}%`,
                        backgroundColor: '#27ae60'
                      }}
                    >
                      {((batchProgress.current / batchProgress.total) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="progress-info">
                    <span>Batch {batchProgress.current} of {batchProgress.total}</span>
                    <span style={{ marginLeft: '20px', fontSize: '0.9em', color: '#666' }}>
                      Processing {BATCH_SIZE} files per batch
                    </span>
                  </div>
                </div>
              )}

              <p style={{ marginTop: '15px', fontWeight: 'bold' }}>{currentCheck}</p>
              <p>Loaded {taxonomyData.length} entries from taxonomy.csv</p>
              
              {isProcessing && (
                <div className="processing-stats">
                  <p>🚀 Optimized for large datasets:</p>
                  <ul style={{ textAlign: 'left', marginTop: '10px' }}>
                    <li>Batch size: {BATCH_SIZE} files</li>
                    <li>Max concurrent requests: {MAX_CONCURRENT_REQUESTS}</li>
                    <li>Progress updates every {PROGRESS_UPDATE_INTERVAL} files</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard">
        <Sidebar />
        <main className="main-content">
          <div className="errors-dashboard">
            <div className="error">
              <h2>Error Loading Data</h2>
              <p>{error}</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const overallStats = getOverallStats()

  const organismStats = getOrganismStats()

  // Fast loading screen for better UX
  if (initialLoading) {
    return (
      <div className="dashboard">
        <Sidebar />
        <main className="main-content">
          <div className="errors-dashboard">
            <div className="errors-header">
              <h1>📊 File Analysis Dashboard</h1>
              <p>Biological Data Integrity Checker</p>
            </div>
            
            <div className="quick-load-container" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '300px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              color: 'white',
              margin: '20px 0'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🚀</div>
              <h2>Inicializando Dashboard</h2>
              <p style={{ opacity: 0.9, marginTop: '10px' }}>
                Cargando datos de taxonomía e índice de archivos...
              </p>
              
              <div style={{
                width: '200px',
                height: '4px',
                backgroundColor: 'rgba(255,255,255,0.3)',
                borderRadius: '2px',
                marginTop: '20px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#ffffff',
                  borderRadius: '2px',
                  animation: 'pulse 1.5s ease-in-out infinite'
                }}></div>
              </div>
              
              <div style={{ marginTop: '20px', fontSize: '0.9rem', opacity: 0.8 }}>
                ✨ Optimizado para miles de archivos
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }


  return (
    <div className="dashboard">
      <Sidebar />
      <main className="main-content">
        <div className="errors-dashboard">
          <div className="errors-header">
            <h1>File System Analysis Dashboard</h1>
            <p>Analysis of {taxonomyData.length} organisms and their associated files</p>
            {lastAnalysis && (
              <div style={{ fontSize: '0.9em', color: '#666' }}>
                <p>Last analysis: {lastAnalysis.toLocaleString()}</p>
                {fileResults.length > 1000 && (
                  <p style={{ fontSize: '0.8em', color: '#27ae60' }}>
                    ✓ Large dataset cached locally for faster loading
                  </p>
                )}
              </div>
            )}

          </div>

      {/* Unified Analysis Summary */}
      {fileResults.length > 0 && (
        <div className="unified-analysis-summary">
          <h2>Analysis Overview</h2>
          <div className="summary-grid">
            <div className="summary-card primary">
              <span className="summary-value">{overallStats.total}</span>
              <span className="summary-label">Total Files Analyzed</span>
            </div>
            <div className="summary-card success">
              <span className="summary-value">{overallStats.found}</span>
              <span className="summary-label">Files Found</span>
            </div>
            <div className="summary-card error">
              <span className="summary-value">{overallStats.missing}</span>
              <span className="summary-label">Files Missing</span>
            </div>
            <div className="summary-card warning">
              <span className="summary-value">{overallStats.percentage.toFixed(1)}%</span>
              <span className="summary-label">Success Rate</span>
            </div>
            <div className="summary-card info">
              <span className="summary-value">{taxonomyData.length}</span>
              <span className="summary-label">Organisms Analyzed</span>
            </div>
            <div className="summary-card secondary">
              <span className="summary-value">{[...new Set(fileResults.filter(f => !f.exists).map(f => f.id))].length}</span>
              <span className="summary-label">Organisms w/ Missing Files</span>
            </div>
          </div>
        </div>
      )}



      {/* Organisms Analysis Table */}
      {fileResults.length > 0 && (
        <div className="organisms-table">
          <div className="table-header">
            <h2>Organisms Analysis Summary</h2>
            <div className="table-info">
              <span>{organismStats.length} organisms analyzed | </span>
              <span>{organismStats.filter(org => org.missingFiles > 0).length} with missing files</span>
            </div>
          </div>

          <div className="table-container">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Organism</th>
                  <th>ID</th>
                  <th>Found</th>
                  <th>Missing</th>
                  <th>Total</th>
                  <th>Completion</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {organismStats
                  .sort((a, b) => a.completionRate - b.completionRate) // Most problematic first
                  .map(org => (
                    <tr key={org.id} className={
                      org.completionRate === 100 ? 'success-row' :
                      org.completionRate === 0 ? 'critical-row' : 'warning-row'
                    }>
                      <td className="organism-name">{org.name}</td>
                      <td className="organism-id">{org.id}</td>
                      <td>
                        <span className="count-badge success">{org.foundFiles}</span>
                      </td>
                      <td>
                        <span className="count-badge error">{org.missingFiles}</span>
                      </td>
                      <td>
                        <span className="count-badge total">{org.totalFiles}</span>
                      </td>
                      <td>
                        <div className="completion-cell">
                          <div className="mini-progress-bar">
                            <div 
                              className={`mini-progress-fill ${
                                org.completionRate >= 80 ? 'high-completion' : 
                                org.completionRate >= 50 ? 'medium-completion' : 'low-completion'
                              }`}
                              style={{ width: `${org.completionRate}%` }}
                            ></div>
                          </div>
                          <span className="completion-text">{org.completionRate.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${
                          org.completionRate === 100 ? 'success' :
                          org.completionRate === 0 ? 'critical' : 'warning'
                        }`}>
                          {org.completionRate === 100 ? 'COMPLETE' : 
                           org.completionRate === 0 ? 'MISSING' : 'INCOMPLETE'}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {organismStats.length > 20 && (
              <div className="table-footer">
                <p>Showing all {organismStats.length} organisms</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* File Analysis Results Table */}
      <div className="file-results-table">
        <div className="table-header">
          <div className="header-main">
            <h2>File Analysis Results ({fileResults.length.toLocaleString()} files)</h2>
            <div className="header-stats">
              <span className="stat-badge success">{overallStats.found} Found</span>
              <span className="stat-badge error">{overallStats.missing} Missing</span>
              <span className="stat-badge info">{overallStats.percentage.toFixed(1)}% Success</span>
            </div>
          </div>
          
          <div className="simple-controls">
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="search-input"
            />
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              {getUniqueFileTypes().map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showMissingOnly}
                onChange={(e) => setShowMissingOnly(e.target.checked)}
              />
              Missing only
            </label>
            <button 
              onClick={clearCacheAndReload}
              className="cache-clear-button"
              style={{
                padding: '8px 16px',
                backgroundColor: '#ff6b6b',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginLeft: '10px'
              }}
              disabled={loading}
            >
              🔄 Force Refresh
            </button>
            <button 
              onClick={refreshFileIndex}
              className="index-refresh-button"
              style={{
                padding: '8px 16px',
                backgroundColor: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginLeft: '10px'
              }}
              disabled={loading}
              title="Refresh file index after adding/removing files"
            >
              📁 Refresh Index
            </button>
          </div>
        </div>

        {/* Results Table */}
        {(() => {
          const paginatedData = getPaginatedResults()
          return (
            <div className="table-container">
              <div className="table-info">
                <span>
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, paginatedData.totalItems)} 
                  of {paginatedData.totalItems.toLocaleString()} results
                </span>
                {(searchTerm || showMissingOnly || filterType !== 'all') && (
                  <span className="filter-info">
                    (Filtered from {fileResults.length.toLocaleString()} total)
                  </span>
                )}
              </div>

              <table className="results-table">
                <thead>
                  <tr>
                    <th 
                      onClick={() => handleSort('status')} 
                      className={`sortable ${sortField === 'status' ? 'sorted' : ''}`}
                    >
                      Status 
                      {sortField === 'status' && (
                        <span className="sort-indicator">
                          {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                        </span>
                      )}
                    </th>
                    <th 
                      onClick={() => handleSort('type')} 
                      className={`sortable ${sortField === 'type' ? 'sorted' : ''}`}
                    >
                      Type
                      {sortField === 'type' && (
                        <span className="sort-indicator">
                          {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                        </span>
                      )}
                    </th>
                    <th 
                      onClick={() => handleSort('id')} 
                      className={`sortable ${sortField === 'id' ? 'sorted' : ''}`}
                    >
                      Organism ID
                      {sortField === 'id' && (
                        <span className="sort-indicator">
                          {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                        </span>
                      )}
                    </th>
                    <th 
                      onClick={() => handleSort('idReplicon')} 
                      className={`sortable ${sortField === 'idReplicon' ? 'sorted' : ''}`}
                    >
                      Replicon
                      {sortField === 'idReplicon' && (
                        <span className="sort-indicator">
                          {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                        </span>
                      )}
                    </th>
                    <th 
                      onClick={() => handleSort('path')} 
                      className={`sortable ${sortField === 'path' ? 'sorted' : ''}`}
                    >
                      File Path
                      {sortField === 'path' && (
                        <span className="sort-indicator">
                          {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                        </span>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.items.map((file, index) => (
                    <tr key={index} className={file.exists ? 'found-row' : 'missing-row'}>
                      <td>
                        <span className={`status-badge ${file.exists ? 'found' : 'missing'}`}>
                          {file.exists ? '✓ FOUND' : '✗ MISSING'}
                        </span>
                      </td>
                      <td>{file.type}</td>
                      <td className="organism-id">{file.id}</td>
                      <td className="replicon-id">{file.idReplicon}</td>
                      <td className="file-path">{file.path}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination Controls */}
              {paginatedData.totalPages > 1 && (
                <div className="table-pagination">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="page-btn"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={!paginatedData.hasPrevPage}
                    className="page-btn"
                  >
                    Previous
                  </button>
                  
                  <div className="page-numbers">
                    {Array.from({ length: Math.min(5, paginatedData.totalPages) }, (_, i) => {
                      let pageNum
                      if (paginatedData.totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= paginatedData.totalPages - 2) {
                        pageNum = paginatedData.totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={!paginatedData.hasNextPage}
                    className="page-btn"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setCurrentPage(paginatedData.totalPages)}
                    disabled={currentPage === paginatedData.totalPages}
                    className="page-btn"
                  >
                    Last
                  </button>
                </div>
              )}


            </div>
          )
        })()}
      </div>
      </div>
      </main>
    </div>
  )
}

export default Errors
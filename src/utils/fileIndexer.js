// File indexer utility for generating file indexes efficiently
import { promises as fs } from 'fs';
import path from 'path';

class FileIndexer {
  constructor(dataPath = './data') {
    this.dataPath = dataPath;
    this.cache = new Map();
    this.lastScan = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
  }

  /**
   * Recursively scan directory for files matching patterns
   * @param {string} dir - Directory to scan
   * @param {string[]} extensions - File extensions to include
   * @param {number} maxDepth - Maximum directory depth
   */
  async scanDirectory(dir, extensions = ['.csv', '.fna'], maxDepth = 5) {
    const files = [];
    
    async function scan(currentDir, currentDepth) {
      if (currentDepth > maxDepth) return;
      
      try {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });
        
        // Process in batches for better performance
        const batchSize = 100;
        for (let i = 0; i < entries.length; i += batchSize) {
          const batch = entries.slice(i, i + batchSize);
          
          await Promise.all(batch.map(async (entry) => {
            const fullPath = path.join(currentDir, entry.name);
            
            if (entry.isDirectory()) {
              // Skip common directories that don't contain data
              if (!['node_modules', '.git', '.vscode', 'dist', 'build'].includes(entry.name)) {
                await scan(fullPath, currentDepth + 1);
              }
            } else if (entry.isFile()) {
              const ext = path.extname(entry.name).toLowerCase();
              if (extensions.includes(ext)) {
                // Convert to relative path and normalize separators
                const relativePath = path.relative('.', fullPath).replace(/\\/g, '/');
                files.push(relativePath);
              }
            }
          }));
        }
      } catch (error) {
        console.warn(`Could not scan directory ${currentDir}:`, error.message);
      }
    }
    
    await scan(dir, 0);
    return files.sort(); // Sort for consistent ordering
  }

  /**
   * Generate file index with caching
   * @param {boolean} forceRefresh - Force refresh even if cache is valid
   */
  async generateIndex(forceRefresh = false) {
    const now = Date.now();
    
    // Return cached result if valid and not forcing refresh
    if (!forceRefresh && this.lastScan && (now - this.lastScan) < this.cacheTimeout) {
      const cached = this.cache.get('fileIndex');
      if (cached) {
        console.log(`Returning cached index with ${cached.length} files`);
        return cached;
      }
    }

    console.log('Generating fresh file index...');
    const startTime = performance.now();
    
    try {
      // Check if data directory exists
      await fs.access(this.dataPath);
      
      // Scan for files
      const files = await this.scanDirectory(this.dataPath);
      
      // Update cache
      this.cache.set('fileIndex', files);
      this.lastScan = now;
      
      const endTime = performance.now();
      console.log(`Generated index with ${files.length} files in ${(endTime - startTime).toFixed(2)}ms`);
      
      return files;
    } catch (error) {
      console.error('Error generating file index:', error);
      return [];
    }
  }

  /**
   * Get specific file patterns for analysis types
   */
  getPatternedFiles(files, patterns) {
    const categorized = {};
    
    patterns.forEach(pattern => {
      categorized[pattern.type] = files.filter(file => {
        return pattern.regex ? pattern.regex.test(file) : file.includes(pattern.contains || '');
      });
    });
    
    return categorized;
  }

  /**
   * Fast file existence check using Set for O(1) lookup
   */
  createFastChecker(files) {
    const fileSet = new Set(files);
    
    return {
      exists: (filePath) => {
        // Normalize path for comparison
        const normalizedPath = filePath.replace(/^\.\//, '').replace(/\\/g, '/');
        return fileSet.has(normalizedPath);
      },
      getStats: () => ({
        totalFiles: fileSet.size,
        lastGenerated: this.lastScan ? new Date(this.lastScan).toISOString() : null
      })
    };
  }
}

// Export singleton instance
export const fileIndexer = new FileIndexer();

// File patterns for biological data analysis
export const analysisPatterns = [
  { type: 'structural_hc', regex: /_hc_(all|cod|non)\.csv$/ },
  { type: 'arm_analysis', regex: /_hb_arm_(all|cod|non)\.csv$/ },
  { type: 'gap_analysis', regex: /_hb_gap_(all|cod|non)\.csv$/ },
  { type: 'ha_analysis', regex: /_ha_(all|cod|non)\.csv$/ },
  { type: 'kmer_analysis', regex: /_(cod|non)_6mer\.csv$|_ratio_cod_vs_non_6mer\.csv$/ },
  { type: 'motif_analysis', regex: /_rich_ir\.csv$|_ir_(histogram|neighborhood|region)\.csv$/ },
  { type: 'observed_data', regex: /_obs_top10_per_gap_size(_matrix)?\.csv$/ },
  { type: 'simulated_data', regex: /_result_(obs|sim)_aggregated\.csv$/ },
  { type: 'genomic_fasta', regex: /_genomic\.fna$/ },
  { type: 'postprocessing', regex: /_postprocessing\.csv$/ }
];
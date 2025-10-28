#!/usr/bin/env node

/**
 * High-performance file indexer for biological data analysis
 * Optimized for thousands of files with async processing
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class HighPerformanceIndexer {
  constructor() {
    this.dataPath = './data';
    this.outputPath = './public/file_index.txt';
    this.concurrentLimit = 100; // Number of concurrent operations
    this.batchSize = 500; // Files to process per batch
  }

  /**
   * Ultra-fast directory scanner using parallel processing
   * Only scans organism-specific directories (GCF_* pattern)
   */
  async scanDirectoryParallel(rootDir, extensions = ['.csv', '.fna']) {
    const files = [];
    
    console.log(`🔍 Starting parallel scan of ${rootDir}...`);
    const startTime = performance.now();
    
    try {
      // First, get only organism directories (GCF_* pattern)
      const rootEntries = await fs.readdir(rootDir, { withFileTypes: true });
      const organismDirs = rootEntries
        .filter(entry => entry.isDirectory() && entry.name.startsWith('GCF_'))
        .map(entry => path.join(rootDir, entry.name));
      
      console.log(`📁 Found ${organismDirs.length} organism directories`);
      
      // For each organism directory, scan analysis, preprocessing, and postprocessing subdirs
      const targetSubdirs = ['analysis', 'preprocessing', 'postprocessing'];
      const allTargetDirs = [];
      
      for (const orgDir of organismDirs) {
        for (const subdir of targetSubdirs) {
          const fullPath = path.join(orgDir, subdir);
          try {
            await fs.access(fullPath);
            allTargetDirs.push(fullPath);
          } catch {
            // Subdirectory doesn't exist, skip
          }
        }
      }
      
      console.log(`📂 Scanning ${allTargetDirs.length} target directories...`);
      
      // Process target directories in batches
      const batchSize = Math.min(this.batchSize, allTargetDirs.length);
      
      for (let i = 0; i < allTargetDirs.length; i += batchSize) {
        const batch = allTargetDirs.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (dir) => {
          try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            
            entries.forEach(entry => {
              if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if (extensions.includes(ext)) {
                  const fullPath = path.join(dir, entry.name);
                  const relativePath = path.relative('.', fullPath).replace(/\\/g, '/');
                  files.push(relativePath);
                }
              }
            });
            
          } catch (error) {
            console.warn(`⚠️  Could not scan ${dir}: ${error.message}`);
          }
        }));
        
        // Progress update
        if (files.length > 0 && files.length % 100 === 0) {
          console.log(`📊 Found ${files.length} files so far...`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error scanning root directory: ${error.message}`);
    }
    
    const endTime = performance.now();
    console.log(`✅ Scan completed: ${files.length} files in ${(endTime - startTime).toFixed(2)}ms`);
    
    return files.sort(); // Sort for consistent output
  }

  /**
   * Optimized file writer with buffering
   */
  async writeIndexFile(files) {
    console.log(`💾 Writing ${files.length} entries to ${this.outputPath}...`);
    
    const content = files.join('\n');
    
    // Ensure output directory exists
    const outputDir = path.dirname(this.outputPath);
    await fs.mkdir(outputDir, { recursive: true });
    
    // Write file with optimization
    await fs.writeFile(this.outputPath, content, 'utf8');
    
    console.log(`✅ Index file written successfully`);
  }

  /**
   * Generate categorized statistics
   */
  generateStats(files) {
    const stats = {
      total: files.length,
      byType: {},
      byDirectory: {},
      byExtension: {}
    };
    
    files.forEach(file => {
      // Count by extension
      const ext = path.extname(file);
      stats.byExtension[ext] = (stats.byExtension[ext] || 0) + 1;
      
      // Count by directory type
      const parts = file.split('/');
      if (parts.length >= 3) {
        const dirType = parts[2]; // analysis, preprocessing, postprocessing
        stats.byDirectory[dirType] = (stats.byDirectory[dirType] || 0) + 1;
      }
      
      // Count by file type patterns
      if (file.includes('_hc_')) stats.byType.structural = (stats.byType.structural || 0) + 1;
      else if (file.includes('_6mer')) stats.byType.kmer = (stats.byType.kmer || 0) + 1;
      else if (file.includes('_ir_') || file.includes('_rich_ir')) stats.byType.motif = (stats.byType.motif || 0) + 1;
      else if (file.includes('_obs_') || file.includes('_sim_')) stats.byType.simulated = (stats.byType.simulated || 0) + 1;
      else if (file.includes('_genomic.fna')) stats.byType.genomic = (stats.byType.genomic || 0) + 1;
      else if (file.includes('_postprocessing')) stats.byType.postprocessing = (stats.byType.postprocessing || 0) + 1;
      else stats.byType.other = (stats.byType.other || 0) + 1;
    });
    
    return stats;
  }

  /**
   * Main execution function
   */
  async execute() {
    try {
      console.log('🚀 High-Performance File Indexer Starting...');
      console.log(`📁 Data path: ${this.dataPath}`);
      console.log(`📄 Output: ${this.outputPath}`);
      console.log(`⚡ Concurrency: ${this.concurrentLimit}, Batch size: ${this.batchSize}`);
      console.log('');
      
      const overallStart = performance.now();
      
      // Check if data directory exists
      try {
        await fs.access(this.dataPath);
      } catch {
        throw new Error(`Data directory ${this.dataPath} does not exist`);
      }
      
      // Scan for files
      const files = await this.scanDirectoryParallel(this.dataPath);
      
      if (files.length === 0) {
        console.log('⚠️  No files found matching criteria');
        return;
      }
      
      // Write index file
      await this.writeIndexFile(files);
      
      // Generate and display statistics
      const stats = this.generateStats(files);
      
      const overallEnd = performance.now();
      
      console.log('');
      console.log('📊 FINAL STATISTICS:');
      console.log(`   Total files: ${stats.total.toLocaleString()}`);
      console.log(`   By extension: ${JSON.stringify(stats.byExtension, null, 4)}`);
      console.log(`   By directory: ${JSON.stringify(stats.byDirectory, null, 4)}`);
      console.log(`   By type: ${JSON.stringify(stats.byType, null, 4)}`);
      console.log('');
      console.log(`🎯 Total execution time: ${(overallEnd - overallStart).toFixed(2)}ms`);
      console.log(`⚡ Performance: ${(stats.total / ((overallEnd - overallStart) / 1000)).toFixed(0)} files/second`);
      console.log('');
      console.log('✅ File index generation completed successfully!');
      
    } catch (error) {
      console.error('❌ Error generating file index:', error.message);
      process.exit(1);
    }
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const indexer = new HighPerformanceIndexer();
  indexer.execute();
}

export default HighPerformanceIndexer;
// Tipos para taxonomyUtils.js
export interface TaxonomyData {
  columns: string[];
  data: Record<string, string[]>;
}

export interface TaxonomyHierarchy {
  [key: string]: string;
}

export declare function readTaxonomyData(): Promise<TaxonomyData>;
export declare function getTaxonValues(taxonomyData: TaxonomyData, column: string): string[];
export declare function buildACPFilePath(
  taxon: string, 
  taxonValue: string, 
  part: string, 
  aggregate: string, 
  pcX: number, 
  pcY: number
): Promise<string>;
export declare function buildExplainedVarianceFilePath(
  taxon: string, 
  taxonValue: string, 
  part: string, 
  analysisType?: string
): Promise<string>;
export declare function getTaxonomyHierarchy(taxon: string, taxonValue: string): Promise<TaxonomyHierarchy | null>;
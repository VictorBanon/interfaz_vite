// Type definitions for taxonomyUtils.js
import { TaxonomicLevel } from './constants'

export interface TaxonomyData {
  columns: string[];
  data: Record<string, string[]>;
}

export interface TaxonomyHierarchy {
  [key: string]: string;
}

export interface ExplainedVarianceData {
  [key: string]: {
    explainedVarianceRatio: number;
    cumulativeExplainedVariance: number;
  };
}

export function readTaxonomyData(): Promise<TaxonomyData>;
export function getTaxonValues(taxonomyData: TaxonomyData, column: TaxonomicLevel): string[];
export function buildACPFilePath(taxon: TaxonomicLevel, taxonValue: string, part: string, aggregate: string, pcX?: number, pcY?: number): Promise<string>;
export function getTaxonomyHierarchy(taxon: TaxonomicLevel, taxonValue: string): Promise<TaxonomyHierarchy | null>;
export function buildExplainedVarianceFilePath(taxon: TaxonomicLevel, taxonValue: string, part: string, analysisType?: string): Promise<string>;
export function readExplainedVarianceData(taxon?: TaxonomicLevel, taxonValue?: string, part?: string, analysisType?: string): Promise<ExplainedVarianceData>;
export function getExplainedVarianceRatio(explainedVarianceData: ExplainedVarianceData, pcNumber: number): string;
export function getCumulativeExplainedVariance(explainedVarianceData: ExplainedVarianceData, pcNumber: number): string;
export function buildMeanMedianFilePath(taxon: TaxonomicLevel, taxonValue: string, part: string, type: string): Promise<string>;
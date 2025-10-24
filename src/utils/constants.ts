// Central constants file for the application

// Taxonomic hierarchy columns in their natural order
export const TAXONOMIC_COLUMNS = ['superkingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species']

// Type for taxonomic levels
export type TaxonomicLevel = typeof TAXONOMIC_COLUMNS[number]

// Default taxonomic values
export const DEFAULT_TAXONOMIC_VALUES = {
  superkingdom: 'Bacteria',
  phylum: '',
  class: '',
  order: '',
  family: '',
  genus: '',
  species: ''
} as const
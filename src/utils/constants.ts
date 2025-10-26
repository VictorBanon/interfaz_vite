// Central constants file for the application

// Taxonomic hierarchy columns in their natural order
export const TAXONOMIC_COLUMNS = ['Superdomain', 'Domain', 'Phylum', 'Class', 'Order', 'Family', 'Genus', 'Species']

// Type for taxonomic levels
export type TaxonomicLevel = typeof TAXONOMIC_COLUMNS[number]

// Default taxonomic values
export const DEFAULT_TAXONOMIC_VALUES = {
  Superdomain: 'Prokaryote',
  Domain: '',
  Phylum: '',
  Class: '',
  Order: '',
  Family: '',
  Genus: '',
  Species: ''
} as const
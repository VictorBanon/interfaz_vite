declare module '*.jsx' {
  import { ComponentType } from 'react';
  const Component: ComponentType<any>;
  export default Component;
}

declare module './pages/structural/Structural.jsx' {
  import { ComponentType } from 'react';
  const Component: ComponentType<any>;
  export default Component;
}

declare module './pages/kmer/Kmer.jsx' {
  import { ComponentType } from 'react';
  const Component: ComponentType<any>;
  export default Component;
}

declare module './pages/taxonomy/Taxonomy.jsx' {
  import { ComponentType } from 'react';
  const Component: ComponentType<any>;
  export default Component;
}

declare module './pages/spatial/Spatial.jsx' {
  import { ComponentType } from 'react';
  const Component: ComponentType<any>;
  export default Component;
}

declare module './pages/compositional/Compositional.jsx' {
  import { ComponentType } from 'react';
  const Component: ComponentType<any>;
  export default Component;
}

declare module './pages/motif/Motif.jsx' {
  import { ComponentType } from 'react';
  const Component: ComponentType<any>;
  export default Component;
}

declare module './components/sidebar/Sidebar' {
  import { ComponentType } from 'react';
  const Component: ComponentType<any>;
  export default Component;
}

declare module '../../components/sidebar/Sidebar' {
  import { ComponentType } from 'react';
  const Component: ComponentType<any>;
  export default Component;
}

declare module './utils/constants.ts' {
  export const TAXONOMIC_COLUMNS: readonly string[];
  export type TaxonomicLevel = string;
  export const DEFAULT_TAXONOMIC_VALUES: Record<string, string>;
}
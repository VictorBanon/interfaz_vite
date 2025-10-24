import React, { useEffect, useRef, useState } from 'react';
import './Motif_replicon_plot.css';

interface Feature {
  seqid: string;
  source: string;
  type: string;
  start: number;
  end: number;
  score: string;
  strand: string;
  phase: string;
  attrs: Record<string, string>;
}

interface Count {
  seqid: string;
  start: number;
  end: number;
  value: number;
  density?: number;
}

interface View {
  seqid: string | null;
  start: number;
  end: number;
}

interface Tracks {
  sequence: { y: number; h: number };
  features: { y: number; h: number };
}

interface State {
  features: Feature[];
  counts: Count[];
  seqids: Set<string>;
  view: View;
  pxWidth: number;
  pxHeight: number;
  padding: { left: number; right: number; top: number; bottom: number };
  tracks: Tracks;
  irPositions: number[];
  fastaSequence: string;
  repliconName: string;
  loading: boolean;
  error: string | null;
}

interface MotifRepliconPlotProps {
  selectedOrganism?: any;
  selectedIRRow?: any;
}

const MotifRepliconPlot: React.FC<MotifRepliconPlotProps> = ({ selectedOrganism, selectedIRRow }) => {
  const [state, setState] = useState<State>({
    features: [],
    counts: [],
    seqids: new Set(),
    view: { seqid: null, start: 1, end: 1e4 },
    pxWidth: 1000,
    pxHeight: 250, // Increased height to accommodate sequence track
    padding: { left: 50, right: 15, top: 15, bottom: 20 },
    tracks: { 
      sequence: { y: 30, h: 40 },
      features: { y: 80, h: 120 } // Moved down to make room for sequence
    },
    irPositions: [],
    fastaSequence: '',
    repliconName: '',
    loading: false,
    error: null,
  });

  const gffInputRef = useRef<HTMLInputElement>(null);
  const seqidSelectRef = useRef<HTMLSelectElement>(null);
  const typeFilterRef = useRef<HTMLInputElement>(null);
  const minLenRef = useRef<HTMLInputElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // --- Utilities ---
  const parseAttrs = (attrStr: string) => {
    const out: Record<string, string> = {};
    (attrStr || '').split(';').forEach((kv) => {
      if (!kv) return;
      const [k, ...rest] = kv.split('=');
      const v = rest.join('=');
      out[decodeURIComponent(k.trim())] = decodeURIComponent((v || '').trim());
    });
    return out;
  };

  const parseGFF = (text: string) => {
    const feats: Feature[] = [];
    const seqids = new Set<string>();
    const lines = text.split(/\r?\n/);
    
    console.log('parseGFF debug:');
    console.log('- Total líneas:', lines.length);
    
    let validLines = 0;
    let commentLines = 0;
    let shortLines = 0;
    let invalidCoords = 0;
    let filteredOut = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      
      if (line.startsWith('#')) {
        commentLines++;
        continue;
      }
      
      const parts = line.split(/\t/);
      if (parts.length < 9) {
        shortLines++;
        if (i < 5) {
          console.log(`Línea ${i} con ${parts.length} partes:`, line);
        }
        continue;
      }
      
      const [seqid, source, type, start, end, score, strand, phase, attrs] = parts;
      
      // Filtrar solo genes (case insensitive)
      if (type.toLowerCase() !== 'gene') {
        filteredOut++;
        continue;
      }
      
      const s = parseInt(start, 10);
      const e = parseInt(end, 10);
      
      if (Number.isNaN(s) || Number.isNaN(e)) {
        invalidCoords++;
        if (invalidCoords < 3) {
          console.log(`Coordenadas inválidas en línea ${i}:`, { start, end, s, e });
        }
        continue;
      }
      
      validLines++;
      feats.push({ seqid, source, type, start: s, end: e, score, strand, phase, attrs: parseAttrs(attrs) });
      seqids.add(seqid);
      
      if (validLines <= 3) {
        console.log(`Gene ${validLines}:`, { seqid, type, start: s, end: e });
      }
    }
    
    console.log('- Líneas de comentario:', commentLines);
    console.log('- Líneas muy cortas:', shortLines);
    console.log('- Features filtradas (no genes):', filteredOut);
    console.log('- Coordenadas inválidas:', invalidCoords);
    console.log('- Genes válidos procesados:', validLines);
    
    return { feats, seqids: Array.from(seqids) };
  };

  const parseCSVAsFeatures = (text: string) => {
    const feats: Feature[] = [];
    const seqids = new Set<string>();
    const lines = text.split(/\r?\n/);
    
    console.log('parseCSVAsFeatures debug:');
    console.log('- Total líneas:', lines.length);
    
    let headers: string[] = [];
    let validLines = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      if (i === 0) {
        headers = line.split(',');
        console.log('- Headers:', headers);
        continue;
      }
      
      const parts = line.split(',');
      if (parts.length < headers.length) continue;
      
      const row: any = {};
      headers.forEach((header, idx) => {
        row[header.trim()] = parts[idx]?.trim();
      });
      
      // Validar que los campos esenciales existan
      if (!row.id || !row.start || !row.end) {
        console.log(`Fila ${i} saltada: faltan campos esenciales`, row);
        continue;
      }
      
      const start = parseInt(row.start, 10);
      const end = parseInt(row.end, 10);
      
      if (Number.isNaN(start) || Number.isNaN(end)) {
        console.log(`Fila ${i} saltada: coordenadas inválidas`, { start: row.start, end: row.end });
        continue;
      }
      
      // Verificar que row.id no sea undefined antes de usar startsWith
      const type = (row.id && row.id.startsWith('gene-')) ? 'gene' : 'intergenic_region';
      const seqid = selectedOrganism?.['Replicons_name'] || selectedOrganism?.['ID-replicon'] || 'chromosome';
      
      const attrs: Record<string, string> = {
        ID: row.id || '',
        Name: row.name || '',
      };
      
      feats.push({
        seqid,
        source: 'analysis',
        type,
        start,
        end,
        score: row.count || '.',
        strand: row.sense || '+',
        phase: '.',
        attrs
      });
      
      seqids.add(seqid);
      validLines++;
    }
    
    console.log('- Features válidas procesadas:', validLines);
    console.log('- Genes:', feats.filter(f => f.type === 'gene').length);
    console.log('- Regiones intergénicas:', feats.filter(f => f.type === 'intergenic_region').length);
    
    return { feats, seqids: Array.from(seqids) };
  };

  const parseFASTA = (text: string, targetRepliconName: string) => {
    const lines = text.trim().split('\n');
    let currentSequence = '';
    let currentHeader = '';
    let inTargetSequence = false;

    console.log('Looking for specific replicon:', targetRepliconName);

    for (const line of lines) {
      if (line.startsWith('>')) {
        // If we were reading the target sequence, we found it
        if (inTargetSequence) {
          break;
        }
        
        // Check if this header contains the target replicon name
        currentHeader = line.substring(1).trim();
        
        // Try multiple matching strategies for the specific replicon
        const headerLower = currentHeader.toLowerCase();
        const targetLower = targetRepliconName.toLowerCase();
        
        // Strategy 1: Exact match in header
        inTargetSequence = headerLower.includes(targetLower);
        
        // Strategy 2: If no exact match, try matching by ID parts
        if (!inTargetSequence) {
          // Extract potential identifiers from target name
          const targetParts = targetRepliconName.split('_');
          
          // Check if any significant part of the target name appears in header
          for (const part of targetParts) {
            if (part.length > 3 && headerLower.includes(part.toLowerCase())) {
              inTargetSequence = true;
              break;
            }
          }
        }
        
        // Strategy 3: For chromosome entries, check for chromosome-specific patterns
        if (!inTargetSequence && targetRepliconName.includes('chromosome')) {
          // Look for chromosome patterns in header
          inTargetSequence = headerLower.includes('chromosome') || 
                            headerLower.includes('complete genome') ||
                            (headerLower.includes('complete') && headerLower.includes('sequence'));
        }
        
        console.log('Checking header:', line.substring(0, 80) + '...');
        console.log('Target:', targetRepliconName);
        console.log('Match found?', inTargetSequence);
        
        currentSequence = '';
      } else if (inTargetSequence) {
        // Accumulate sequence lines
        currentSequence += line.trim();
      }
    }

    console.log('Final sequence length:', currentSequence.length);
    console.log('Successfully found sequence for:', targetRepliconName);
    return inTargetSequence ? currentSequence : '';
  };

  const niceTicks = (min: number, max: number, count = 6) => {
    const span = max - min;
    if (span <= 0) return [min];
    const step = Math.pow(10, Math.floor(Math.log10(span / count)));
    const err = (span / count) / step;
    const mult = err >= 7.5 ? 10 : err >= 3 ? 5 : err >= 1.5 ? 2 : 1;
    const stepNice = step * mult;
    const start = Math.ceil(min / stepNice) * stepNice;
    const ticks: number[] = [];
    for (let x = start; x <= max; x += stepNice) ticks.push(Math.round(x));
    return ticks;
  };

  const xScale = (bp: number) => {
    const { left, right } = state.padding;
    const w = state.pxWidth - left - right;
    const { start, end } = state.view;
    const span = Math.max(1, end - start + 1);
    return left + ((bp - start) / span) * w;
  };

  const clearSVG = () => {
    const svg = svgRef.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
  };

  const addEl = (tag: string, attrs: Record<string, string | number> = {}, parent: SVGElement = svgRef.current!) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v.toString());
    parent.appendChild(el);
    return el;
  };

  const showTip = (text: string) => {
    const tooltip = tooltipRef.current;
    if (!tooltip) return;
    tooltip.style.display = 'block';
    tooltip.style.left = '10px';
    tooltip.style.top = '10px';
    tooltip.textContent = text;
  };

  const hideTip = () => {
    const tooltip = tooltipRef.current;
    if (!tooltip) return;
    tooltip.style.display = 'none';
  };

  const filteredFeatures = () => {
    const types = (typeFilterRef.current?.value || '').split(',').map((s) => s.trim()).filter(Boolean);
    const minL = Math.max(1, parseInt(minLenRef.current?.value || '1', 10));
    
    // Si no hay filtro de tipos, mostrar tanto genes como intergénicos
    const defaultTypes = types.length === 0 ? ['gene'] : types;
    
    const filtered = state.features.filter(
      (f) =>
        (!state.view.seqid || f.seqid === state.view.seqid) &&
        (defaultTypes.includes(f.type) || defaultTypes.some(t => f.type.toLowerCase().includes(t.toLowerCase()))) &&
        f.end - f.start + 1 >= minL &&
        !(f.end < state.view.start || f.start > state.view.end)
    );
    
    return filtered;
  };

  // --- Render function ---
  const renderSVG = () => {
    const svg = svgRef.current;
    if (!svg) return;
    clearSVG();
    const W = state.pxWidth;
    const H = state.pxHeight;

    addEl('rect', { x: 0, y: 0, width: W, height: H, fill: '#0a1230' });

    // X axis grid
    const xg = addEl('g', { class: 'axis x' });
    const ticks = niceTicks(state.view.start, state.view.end, 8);
    for (const t of ticks) {
      const x = xScale(t);
      addEl('line', { x1: x, y1: state.padding.top, x2: x, y2: H - state.padding.bottom, stroke: '#444', 'stroke-width': 0.5 }, xg);
      const lbl = addEl('text', { x: x, y: H - 6, 'text-anchor': 'middle', fill: '#ccc', 'font-size': 8 }, xg);
      lbl.textContent = t.toLocaleString();
    }

    // Sequence track
    const st = state.tracks.sequence;
    const sy = st.y;
    const sh = st.h;
    
    console.log('Rendering sequence track:');
    console.log('- fastaSequence length:', state.fastaSequence.length);
    console.log('- repliconName:', state.repliconName);
    console.log('- view:', state.view);
    
    if (state.fastaSequence && state.fastaSequence.length > 0) {
      const sequenceLength = state.fastaSequence.length;
      const visibleStart = Math.max(0, state.view.start - 1); // Convert to 0-based
      const visibleEnd = Math.min(sequenceLength, state.view.end);
      const visibleSequence = state.fastaSequence.substring(visibleStart, visibleEnd);
      
      console.log('- visibleStart:', visibleStart, 'visibleEnd:', visibleEnd);
      console.log('- visibleSequence length:', visibleSequence.length);
      console.log('- visibleSequence sample:', visibleSequence.substring(0, 20));
      
      // Only show sequence if zoom level allows readable text
      const viewWidth = state.view.end - state.view.start;
      const baseWidth = (state.pxWidth - state.padding.left - state.padding.right) / viewWidth;
      
      console.log('- viewWidth:', viewWidth, 'baseWidth:', baseWidth);
      
      if (baseWidth >= 4) { // Reduced threshold to show nucleotides earlier
        console.log('Rendering individual nucleotides...');
        for (let i = 0; i < visibleSequence.length; i++) {
          const bp = visibleStart + i + 1; // Convert back to 1-based
          const x = xScale(bp);
          const nucleotide = visibleSequence[i].toUpperCase();
          
          // Color code nucleotides
          let color = '#ffffff';
          switch (nucleotide) {
            case 'A': color = '#ff6b6b'; break;
            case 'T': color = '#4ecdc4'; break;
            case 'G': color = '#45b7d1'; break;
            case 'C': color = '#96ceb4'; break;
            default: color = '#gray'; break;
          }
          
          // Draw nucleotide background
          addEl('rect', {
            x: x - baseWidth/2,
            y: sy,
            width: baseWidth,
            height: sh,
            fill: color,
            opacity: 0.3,
            stroke: '#333',
            'stroke-width': 0.2
          });
          
          // Draw nucleotide letter
          if (baseWidth >= 6) { // Reduced threshold to show letters earlier
            const txt = addEl('text', {
              x: x,
              y: sy + sh/2 + 3,
              'text-anchor': 'middle',
              fill: color,
              'font-size': Math.min(10, baseWidth - 2),
              'font-weight': '600'
            });
            txt.textContent = nucleotide;
          }
        }
      } else {
        // Show sequence as a continuous bar when zoomed out
        console.log('Showing sequence as continuous bar...');
        const seqStart = xScale(state.view.start);
        const seqEnd = xScale(Math.min(state.view.end, sequenceLength));
        addEl('rect', {
          x: seqStart,
          y: sy,
          width: seqEnd - seqStart,
          height: sh,
          fill: '#4a90e2',
          opacity: 0.5,
          stroke: '#4a90e2',
          'stroke-width': 1
        });
      }
      
      // Add sequence track label
      addEl('text', { x: 6, y: sy + 12, fill: '#fff', 'font-size': 8, 'font-weight': '600' }).textContent = 
        `Sequence (${state.fastaSequence.length} bp)`;
    } else {
      console.log('No FASTA sequence available');
      // Add placeholder text
      addEl('text', { x: 6, y: sy + 12, fill: '#666', 'font-size': 8, 'font-weight': '600' }).textContent = 
        'No sequence loaded';
    }

    // Features track (solo genes)
    const ft = state.tracks.features;
    const fy = ft.y;
    const fh = ft.h;
    const feats = filteredFeatures().sort((a, b) => a.start - b.start);
    const lanes: { x2: number }[] = [];

    function placeLane(x1: number, x2: number) {
      for (let i = 0; i < lanes.length; i++) {
        if (x1 >= lanes[i].x2 + 4) {
          lanes[i] = { x2 };
          return i;
        }
      }
      lanes.push({ x2 });
      return lanes.length - 1;
    }

    const laneH = 10, laneGap = 2, maxLanes = Math.floor(fh / (laneH + laneGap));

    let renderedCount = 0;
    for (const f of feats) {
      const x1 = xScale(Math.max(f.start, state.view.start));
      const x2 = xScale(Math.min(f.end, state.view.end));
      
      if (x2 <= x1) continue;
      const lane = Math.min(placeLane(x1, x2), maxLanes - 1);
      const y = fy + lane * (laneH + laneGap);
      const strandClass = f.strand === '-' ? '#f39c12' : '#e94e77';
      const rect = addEl('rect', { x: x1, y, width: x2 - x1, height: laneH, fill: strandClass, stroke: '#fff', 'stroke-width': 0.5, opacity: 0.9 });
      rect.addEventListener('mousemove', () => {
        const name = f.attrs.Name || f.attrs.gene || f.attrs.ID || '';
        showTip(`${f.type} ${name ? '(' + name + ')' : ''}\n${f.seqid}:${f.start}-${f.end} ${f.strand}`);
      });
      rect.addEventListener('mouseleave', hideTip);
      if (x2 - x1 > 35) {
        const name = f.attrs.Name || f.attrs.gene || f.attrs.ID || f.type;
        const txt = addEl('text', { x: x1 + 3, y: y + laneH * 0.75, fill: '#ffffff', 'font-size': 7, 'font-weight': '600' });
        txt.textContent = name;
      }
      renderedCount++;
    }
    addEl('text', { x: 6, y: fy + 10, fill: '#fff', 'font-size': 8, 'font-weight': '600' }).textContent = 'Genes';

    // Add DnaA marker line if gene exists
    const dnaAGene = state.features.find(f => 
      (!state.view.seqid || f.seqid === state.view.seqid) &&
      f.type.toLowerCase() === 'gene' &&
      (f.attrs.Name?.toLowerCase().includes('dnaa') || 
       f.attrs.gene?.toLowerCase().includes('dnaa') ||
       f.attrs.product?.toLowerCase().includes('dnaa'))
    );
    
    if (dnaAGene) {
      const dnaAX = xScale(dnaAGene.start);
      // Draw red vertical line across all tracks
      addEl('line', { 
        x1: dnaAX, 
        y1: state.padding.top, 
        x2: dnaAX, 
        y2: H - state.padding.bottom, 
        stroke: '#ff0000', 
        'stroke-width': 2,
        'stroke-dasharray': '5,3',
        opacity: 0.8
      });
      
      // Add label for DnaA marker
      addEl('text', { 
        x: dnaAX + 3, 
        y: state.padding.top + 12, 
        fill: '#ff0000', 
        'font-size': 10, 
        'font-weight': '600' 
      }).textContent = 'DnaA';
      
      // Calculate opposite position for periodic data using FASTA sequence length
      const genomeSize = state.fastaSequence.length || 0;
      
      if (genomeSize > 0) {
        // Calculate absolute opposite position (180 degrees around the circular genome)
        const oppositePosition = dnaAGene.start + genomeSize / 2;
        // If the opposite position exceeds genome length, wrap it around
        const wrappedOppositePosition = oppositePosition > genomeSize ? 
          oppositePosition - genomeSize : oppositePosition;
        
        const oppositeX = xScale(wrappedOppositePosition);
        
        // Draw blue vertical line for opposite position
        addEl('line', { 
          x1: oppositeX, 
          y1: state.padding.top, 
          x2: oppositeX, 
          y2: H - state.padding.bottom, 
          stroke: '#0066ff', 
          'stroke-width': 2,
          'stroke-dasharray': '10,5',
          opacity: 0.7
        });
        
        // Add label for opposite marker
        addEl('text', { 
          x: oppositeX + 3, 
          y: state.padding.top + 12, 
          fill: '#0066ff', 
          'font-size': 10, 
          'font-weight': '600' 
        }).textContent = 'Opposite';
      }
    }

    // Render IR position markers
    if (state.irPositions.length > 0) {
      for (const position of state.irPositions) {
        // Only render if position is in current view
        if (position >= state.view.start && position <= state.view.end) {
          const irX = xScale(position);
          
          // Draw green vertical line for IR position
          addEl('line', { 
            x1: irX, 
            y1: state.padding.top, 
            x2: irX, 
            y2: H - state.padding.bottom, 
            stroke: '#00ff00', 
            'stroke-width': 1.5,
            opacity: 0.7
          });
          
          // Add small circle marker at the features track level
          addEl('circle', { 
            cx: irX, 
            cy: ft.y + ft.h / 2, 
            r: 3, 
            fill: '#00ff00', 
            stroke: '#ffffff',
            'stroke-width': 1,
            opacity: 0.9
          });
        }
      }
      
      // Add legend for IR markers
      if (state.irPositions.some(pos => pos >= state.view.start && pos <= state.view.end)) {
        addEl('text', { 
          x: 6, 
          y: fy + 25, 
          fill: '#00ff00', 
          'font-size': 8, 
          'font-weight': '600' 
        }).textContent = `IR Positions (${state.irPositions.length})`;
      }
    }
  };

  // --- Fit to data ---
  const fitToData = () => {
    const seqid = seqidSelectRef.current?.value || state.view.seqid;
    if (!seqid) return;
    const featSeq = state.features.filter((f) => f.seqid === seqid);
    if (!featSeq.length) return;
    const mins = [Math.min(...featSeq.map((f) => f.start))];
    const maxs = [Math.max(...featSeq.map((f) => f.end))];
    const pad = Math.round((Math.max(...maxs) - Math.min(...mins)) * 0.05);
    setState((s) => ({
      ...s,
      view: { ...s.view, seqid, start: Math.max(1, Math.min(...mins) - pad), end: Math.max(Math.min(...mins) - pad + 10, Math.max(...maxs) + pad) },
    }));
  };

  // --- File handlers ---
  const handleFile = (inputRef: React.RefObject<HTMLInputElement | null>, cb: (text: string) => void) => {
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => cb(reader.result as string);
    reader.readAsText(file);
  };

  // --- Load files when organism is selected ---
  useEffect(() => {
    if (!selectedOrganism || !selectedOrganism['ID-replicon']) {
      setState(s => ({ ...s, loading: false, error: null }));
      return;
    }
    
    console.log('Organismo seleccionado:', selectedOrganism);
    
    setState(s => ({ ...s, loading: true, error: null }));
    
    const loadOrganismFiles = async () => {
      try {
        const genomePath = `/data/${selectedOrganism.ID}`;
        const repliconId = selectedOrganism['ID-replicon'];
        // Use Replicons_name for FASTA sequence matching, fallback to ID-replicon
        const repliconName = selectedOrganism['Replicons_name'] || selectedOrganism['ID-replicon'];
        const csvPath = `${genomePath}/analysis/${repliconId}_ir_region.csv`;
        
        console.log('Intentando cargar archivo CSV:', csvPath);
        console.log('Replicon ID:', repliconId);
        console.log('Replicon Name:', repliconName);
        
        // Cargar el archivo CSV que contiene features
        try {
          const csvResponse = await fetch(csvPath);
          console.log('Respuesta CSV:', csvResponse.status, csvResponse.statusText);
          
          if (csvResponse.ok && csvResponse.status === 200) {
            const csvText = await csvResponse.text();
            console.log('Texto CSV cargado, longitud:', csvText.length);
            
            // Check if the response is actually HTML (happens when file doesn't exist in dev server)
            if (csvText.trim().toLowerCase().startsWith('<!doctype html>') || csvText.trim().toLowerCase().startsWith('<html')) {
              console.error('Received HTML instead of CSV - file not found');
              setState(s => ({ 
                ...s, 
                loading: false,
                error: `CSV file not found: ${csvPath}. The server returned HTML instead of CSV data.`
              }));
              return;
            }
            
            // Parsear solo como features
            const { feats, seqids } = parseCSVAsFeatures(csvText);
            
            console.log('Procesado - Features:', feats.length, 'Seqids:', seqids);
            
            setState((s) => {
              const newState = { 
                ...s, 
                features: feats,
                seqids: new Set([...s.seqids, ...seqids]),
                view: seqids.length > 0 ? { ...s.view, seqid: seqids[0] } : s.view,
                repliconName: repliconId,
                loading: false,
                error: null
              };
              
              // Auto-fit to data
              if (feats.length > 0 && seqids.length > 0) {
                const featSeq = feats.filter(f => f.seqid === seqids[0]);
                if (featSeq.length > 0) {
                  const minPos = Math.min(...featSeq.map(f => f.start));
                  const maxPos = Math.max(...featSeq.map(f => f.end));
                  const pad = Math.round((maxPos - minPos) * 0.05);
                  newState.view = {
                    seqid: seqids[0],
                    start: Math.max(1, minPos - pad),
                    end: maxPos + pad
                  };
                }
              }
              
              return newState;
            });
            
            // Load FASTA file after CSV is loaded successfully
            const fastaPath = `${genomePath}/preprocessing/${selectedOrganism.ID}_genomic.fna`;
            console.log('Intentando cargar archivo FASTA:', fastaPath);
            
            try {
              const fastaResponse = await fetch(fastaPath);
              console.log('Respuesta FASTA:', fastaResponse.status, fastaResponse.statusText);
              
              if (fastaResponse.ok && fastaResponse.status === 200) {
                const fastaText = await fastaResponse.text();
                console.log('Texto FASTA cargado, longitud:', fastaText.length);
                
                // Check if the response is actually HTML (happens when file doesn't exist in dev server)
                if (fastaText.trim().toLowerCase().startsWith('<!doctype html>') || fastaText.trim().toLowerCase().startsWith('<html')) {
                  console.error('Received HTML instead of FASTA - file not found');
                  setState(s => ({ 
                    ...s, 
                    loading: false,
                    error: `FASTA file not found: ${fastaPath}. The server returned HTML instead of FASTA data.`
                  }));
                  return;
                }
                
                // Parse FASTA to get sequence for this replicon using Replicons_name
                const sequence = parseFASTA(fastaText, repliconName);
                console.log('Secuencia encontrada para', repliconName, 'con longitud:', sequence.length);
                
                // If no sequence found with repliconName, try with repliconId as fallback
                let finalSequence = sequence;
                if (!sequence && repliconName !== repliconId) {
                  console.log('Intentando buscar con ID como fallback:', repliconId);
                  finalSequence = parseFASTA(fastaText, repliconId);
                  console.log('Secuencia encontrada con ID fallback:', finalSequence.length);
                }
                
                setState((s) => ({
                  ...s,
                  fastaSequence: finalSequence,
                  repliconName: repliconName
                }));
              } else {
                console.error(`Could not load FASTA file ${fastaPath}:`, fastaResponse.status);
                setState(s => ({ 
                  ...s, 
                  loading: false,
                  error: `FASTA file not found: ${fastaPath}. This file is needed for sequence visualization.`
                }));
              }
            } catch (fastaErr) {
              console.error(`Error loading FASTA file ${fastaPath}:`, fastaErr);
              setState(s => ({ 
                ...s, 
                loading: false,
                error: `Error loading FASTA file: ${fastaErr instanceof Error ? fastaErr.message : 'Unknown error'}`
              }));
            }
          } else {
            console.error(`Could not load CSV file ${csvPath}:`, csvResponse.status);
            setState(s => ({ 
              ...s, 
              loading: false,
              error: `CSV file not found: ${csvPath}. This file contains the motif analysis data.`
            }));
          }
        } catch (err) {
          console.error(`Error loading CSV file ${csvPath}:`, err);
          setState(s => ({ 
            ...s, 
            loading: false,
            error: `Error loading CSV file: ${err instanceof Error ? err.message : 'Unknown error'}`
          }));
        }
      } catch (err) {
        console.error('General error loading motif data:', err);
        setState(s => ({ 
          ...s, 
          loading: false,
          error: `General error loading motif data: ${err instanceof Error ? err.message : 'Unknown error'}`
        }));
      }
    };
    
    loadOrganismFiles();
  }, [selectedOrganism]);

  // --- Parse IR positions when IR row is selected ---
  useEffect(() => {
    if (!selectedIRRow || !selectedIRRow.ir_start_concat) {
      setState(s => ({ ...s, irPositions: [] }));
      return;
    }

    try {
      // Parse the semicolon-separated positions
      const positions = selectedIRRow.ir_start_concat
        .split(';')
        .map((pos: string) => parseInt(pos.trim(), 10))
        .filter((pos: number) => !isNaN(pos));
      
      console.log('Parsed IR positions:', positions);
      setState(s => ({ ...s, irPositions: positions }));
    } catch (err) {
      console.error('Error parsing IR positions:', err);
      setState(s => ({ ...s, irPositions: [] }));
    }
  }, [selectedIRRow]);

  // --- Mouse interaction handlers ---
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const { deltaY } = e;
    const zoomFactor = deltaY > 0 ? 1.2 : 1 / 1.2;
    
    setState(s => {
      const { start, end } = s.view;
      const center = (start + end) / 2;
      const span = end - start;
      const newSpan = Math.max(100, span * zoomFactor);
      
      return {
        ...s,
        view: {
          ...s.view,
          start: Math.max(1, Math.round(center - newSpan / 2)),
          end: Math.round(center + newSpan / 2)
        }
      };
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Solo botón izquierdo
    
    const startX = e.clientX;
    const startView = state.view;
    const svg = svgRef.current;
    
    if (svg) {
      svg.style.cursor = 'grabbing';
    }
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const viewWidth = startView.end - startView.start;
      const pixelWidth = rect.width - state.padding.left - state.padding.right;
      const bpPerPixel = viewWidth / pixelWidth;
      const deltaBp = deltaX * bpPerPixel;
      
      setState(s => ({
        ...s,
        view: {
          ...s.view,
          start: Math.max(1, Math.round(startView.start - deltaBp)),
          end: Math.round(startView.end - deltaBp)
        }
      }));
    };
    
    const handleMouseUp = () => {
      if (svg) {
        svg.style.cursor = 'grab';
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // --- Resize observer to fit card ---
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const resize = () => {
      const rect = svg.getBoundingClientRect();
      setState((s) => ({ ...s, pxWidth: rect.width, pxHeight: rect.height }));
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // --- Add mouse event listeners ---
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    
    svg.addEventListener('wheel', handleWheel as any);
    return () => svg.removeEventListener('wheel', handleWheel as any);
  }, []);

  useEffect(() => { renderSVG(); }, [state]);

  // Show loading state
  if (state.loading) {
    return (
      <div className="genome-viewer" style={{ backgroundColor: '#1a1a1a', color: '#ffffff', padding: '20px', textAlign: 'center' }}>
        <h3>Loading motif data...</h3>
        <div style={{ 
          fontSize: '0.9rem', 
          color: '#4fc3f7',
          marginTop: '10px'
        }}>
          {selectedOrganism && (
            <>Loading files for <em>{selectedOrganism.genus} {selectedOrganism.species}</em> ({selectedOrganism.ID})</>
          )}
        </div>
      </div>
    );
  }

  // Show error state
  if (state.error) {
    return (
      <div className="genome-viewer" style={{ backgroundColor: '#1a1a1a', color: '#ffffff', padding: '20px' }}>
        <div style={{
          backgroundColor: '#4a1a1a',
          border: '1px solid #cc4444',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <h3 style={{ color: '#ff6b6b', margin: '0 0 10px 0' }}>⚠️ File Not Found</h3>
          <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>
            {state.error}
          </p>
          {selectedOrganism && (
            <div style={{ 
              fontSize: '0.8rem', 
              color: '#999',
              marginTop: '10px',
              padding: '10px',
              backgroundColor: '#2a2a2a',
              borderRadius: '4px'
            }}>
              <strong>Organism:</strong> <em>{selectedOrganism.genus} {selectedOrganism.species}</em> ({selectedOrganism.ID})<br/>
              <strong>Replicon:</strong> {selectedOrganism['ID-replicon']}<br/>
              <strong>Expected path:</strong> /data/{selectedOrganism.ID}/
            </div>
          )}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#999' }}>
          💡 <strong>Tip:</strong> Make sure the organism files have been processed and are available in the data directory.
        </div>
      </div>
    );
  }

  return (
    <div className="genome-viewer" style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
      <div style={{ 
        marginBottom: 8, 
        padding: '8px 12px',
        backgroundColor: '#2d2d2d',
        borderRadius: '6px',
        border: '1px solid #404040'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 12, 
          flexWrap: 'nowrap',
          justifyContent: 'space-between',
          width: '100%'
        }}>
          {/* Nombre del organismo */}
          {selectedOrganism && (
            <div style={{ 
              fontSize: '0.8rem',
              fontWeight: '600',
              color: '#4fc3f7',
              minWidth: 'fit-content'
            }}>
              <em>{selectedOrganism.genus} {selectedOrganism.species}</em>
              <span style={{ color: '#999', marginLeft: 6, fontSize: '0.7rem' }}>({selectedOrganism.ID})</span>
            </div>
          )}
          
          {/* Controles en una línea */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8,
            fontSize: '0.7rem'
          }}>
            <span style={{ color: '#ccc' }}>GFF:</span>
            <input 
              type="file" 
              ref={gffInputRef} 
              onChange={() => handleFile(gffInputRef, (text) => {
                const { feats, seqids } = parseGFF(text);
                setState((s) => ({ ...s, features: feats, seqids: new Set([...s.seqids, ...seqids]) }));
              })}
              style={{
                padding: '2px 4px',
                backgroundColor: '#404040',
                border: '1px solid #555',
                borderRadius: '3px',
                color: '#fff',
                fontSize: '0.6rem',
                width: '70px'
              }}
            />
            
            <span style={{ color: '#ccc', marginLeft: 4 }}>Filtro:</span>
            <input 
              ref={typeFilterRef}
              type="text"
              placeholder="gene,..."
              style={{
                padding: '2px 4px',
                backgroundColor: '#404040',
                border: '1px solid #555',
                borderRadius: '3px',
                color: '#fff',
                fontSize: '0.6rem',
                width: '80px'
              }}
              onChange={() => renderSVG()}
            />
          </div>
        </div>
      </div> 

      <div style={{ flex: 1, position: 'relative' }}>
        <svg 
          ref={svgRef} 
          style={{ width: '100%', height: '100%', cursor: 'grab' }} 
          onMouseDown={handleMouseDown}
        />
        <div ref={tooltipRef} style={{ 
          position: 'absolute', 
          display: 'none', 
          left: '10px',
          top: '10px',
          backgroundColor: 'rgba(0,0,0,0.85)', 
          color: '#fff', 
          padding: '6px 8px', 
          borderRadius: '4px', 
          pointerEvents: 'none', 
          fontSize: '0.7rem',
          border: '1px solid #444',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          zIndex: 1000,
          whiteSpace: 'pre-line',
          minWidth: '120px'
        }} />
        
        {/* Controles de navegación */}
        <div style={{ 
          position: 'absolute', 
          top: 10, 
          right: 10, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 3,
          backgroundColor: 'rgba(45, 45, 45, 0.9)',
          padding: '6px',
          borderRadius: '6px',
          border: '1px solid #555'
        }}>
          <div style={{ display: 'flex', gap: 3 }}>
            <button
              onClick={() => setState(s => {
                const span = s.view.end - s.view.start;
                const newSpan = span / 2;
                const center = (s.view.start + s.view.end) / 2;
                return {
                  ...s,
                  view: {
                    ...s.view,
                    start: Math.max(1, Math.round(center - newSpan / 2)),
                    end: Math.round(center + newSpan / 2)
                  }
                };
              })}
              style={{ 
                padding: '3px 6px', 
                fontSize: '10px', 
                backgroundColor: '#404040', 
                border: '1px solid #666', 
                borderRadius: '3px', 
                color: '#fff',
                cursor: 'pointer'
              }}
              title="Zoom In"
            >
              +
            </button>
            <button
              onClick={() => setState(s => {
                const span = s.view.end - s.view.start;
                const newSpan = span * 2;
                const center = (s.view.start + s.view.end) / 2;
                return {
                  ...s,
                  view: {
                    ...s.view,
                    start: Math.max(1, Math.round(center - newSpan / 2)),
                    end: Math.round(center + newSpan / 2)
                  }
                };
              })}
              style={{ 
                padding: '3px 6px', 
                fontSize: '10px', 
                backgroundColor: '#404040', 
                border: '1px solid #666', 
                borderRadius: '3px', 
                color: '#fff',
                cursor: 'pointer'
              }}
              title="Zoom Out"
            >
              −
            </button>
          </div>
          <button
            onClick={fitToData}
            style={{ 
              padding: '3px 6px', 
              fontSize: '9px', 
              backgroundColor: '#4fc3f7', 
              border: '1px solid #29b6f6', 
              borderRadius: '3px', 
              color: '#000',
              cursor: 'pointer'
            }}
            title="Fit to Data"
          >
            Fit
          </button>
        </div>
        
        {/* Información de navegación */}
        <div style={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          backgroundColor: 'rgba(45, 45, 45, 0.9)',
          padding: '4px 8px',
          borderRadius: '3px',
          border: '1px solid #555',
          fontSize: '9px',
          color: '#ccc'
        }}>
          {state.view.seqid}: {state.view.start.toLocaleString()} - {state.view.end.toLocaleString()} 
          <span style={{ marginLeft: 8 }}>
            ({(state.view.end - state.view.start + 1).toLocaleString()} bp)
          </span>
        </div>
      </div>
    </div>
  );
};

export default MotifRepliconPlot;
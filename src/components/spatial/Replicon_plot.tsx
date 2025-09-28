import React, { useEffect, useRef, useState } from 'react';
import './Replicon_plot.css';

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
  density?: number; // Agregar densidad
}

interface View {
  seqid: string | null;
  start: number;
  end: number;
}

interface Tracks {
  counts: { y: number; h: number };
  density: { y: number; h: number }; // Nuevo track para densidad
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
}

interface RepliconPlotProps {
  selectedOrganism?: any;
}

const RepliconPlot: React.FC<RepliconPlotProps> = ({ selectedOrganism }) => {
  const [state, setState] = useState<State>({
    features: [],
    counts: [],
    seqids: new Set(),
    view: { seqid: null, start: 1, end: 1e4 },
    pxWidth: 1200,
    pxHeight: 450, // Reduced height significantly
    padding: { left: 60, right: 15, top: 20, bottom: 25 },
    tracks: { 
      counts: { y: 50, h: 80 }, // Reduced height and spacing
      density: { y: 140, h: 80 }, // Reduced height and spacing
      features: { y: 230, h: 150 } // Reduced height and spacing
    },
  });

  const gffInputRef = useRef<HTMLInputElement>(null);
  const countsInputRef = useRef<HTMLInputElement>(null);
  const seqidSelectRef = useRef<HTMLSelectElement>(null);
  const viewStartRef = useRef<HTMLInputElement>(null);
  const viewEndRef = useRef<HTMLInputElement>(null);
  const typeFilterRef = useRef<HTMLInputElement>(null);
  const minLenRef = useRef<HTMLInputElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<any>(null);

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

  const parseCounts = (text: string) => {
    const out: Count[] = [];
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      if (!line || line.startsWith('#') || line.startsWith('track') || line.startsWith('browser')) continue;
      const parts = line.trim().split(/\s+/);
      if (parts.length < 4) continue;
      const [seqid, s, e, v] = parts;
      const start = parseInt(s, 10);
      const end = parseInt(e, 10);
      const value = parseFloat(v);
      if ([start, end].some(Number.isNaN) || !isFinite(value)) continue;
      out.push({ seqid, start: Math.max(1, start), end: Math.max(1, end), value });
    }
    return out;
  };

  const parseCountsCSV = (text: string) => {
    const out: Count[] = [];
    const lines = text.split(/\r?\n/);
    let headers: string[] = [];
    
    console.log('parseCountsCSV debug:');
    console.log('- Total líneas:', lines.length);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      if (i === 0) {
        // Primera línea: headers
        headers = line.split(',');
        console.log('- Headers encontrados:', headers);
        continue;
      }
      
      const parts = line.split(',');
      if (parts.length < headers.length) continue;
      
      // Crear objeto con los headers
      const row: any = {};
      headers.forEach((header, idx) => {
        row[header.trim()] = parts[idx]?.trim();
      });
      
      // Debug primeras filas
      if (i <= 3) {
        console.log(`Fila ${i}:`, row);
      }
      
      // Extraer datos necesarios - usar 'count' en lugar de 'ir_count'
      const start = parseInt(row.start, 10);
      const end = parseInt(row.end, 10);
      const value = parseFloat(row.count); // Cambio aquí: usar 'count'
      const density = parseFloat(row.density); // Parsear también densidad
      
      if ([start, end].some(Number.isNaN) || !isFinite(value) || !isFinite(density)) {
        if (i <= 5) {
          console.log(`Fila ${i} saltada por valores inválidos:`, { start, end, value, density, row });
        }
        continue;
      }
      
      // Usar el seqid del organismo seleccionado
      const seqid = selectedOrganism?.['Replicons_name'] || selectedOrganism?.['ID-replicon'] || 'chromosome';
      
      out.push({ 
        seqid, 
        start: Math.max(1, start), 
        end: Math.max(1, end), 
        value,
        density 
      });
    }
    
    console.log('- Conteos válidos parseados:', out.length);
    if (out.length > 0) {
      console.log('- Primeros 3 conteos:', out.slice(0, 3));
      console.log('- Rango de valores count:', {
        min: Math.min(...out.map(c => c.value)),
        max: Math.max(...out.map(c => c.value))
      });
      console.log('- Rango de valores density:', {
        min: Math.min(...out.map(c => c.density || 0)),
        max: Math.max(...out.map(c => c.density || 0))
      });
    }
    
    return out;
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

  const invX = (px: number) => {
    const { left, right } = state.padding;
    const w = state.pxWidth - left - right;
    const { start, end } = state.view;
    const span = Math.max(1, end - start + 1);
    return start + ((px - left) / w) * span;
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

  const showTip = (ev: any, text: string) => {
    const tooltip = tooltipRef.current;
    if (!tooltip) return;
    tooltip.style.display = 'block';
    tooltip.style.left = ev.pageX + 12 + 'px';
    tooltip.style.top = ev.pageY + 12 + 'px';
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

  const countsInView = () => {
    return state.counts.filter(
      (c) => (!state.view.seqid || c.seqid === state.view.seqid) && !(c.end < state.view.start || c.start > state.view.end)
    );
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
      const lbl = addEl('text', { x: x, y: H - 6, 'text-anchor': 'middle', fill: '#ccc', 'font-size': 10 }, xg);
      lbl.textContent = t.toLocaleString();
    }

    const cData = countsInView();

    // Counts track
    const ct = state.tracks.counts;
    const ch = ct.h;
    const cy = ct.y;
    let cmin = 0, cmax = 1;
    if (cData.length) {
      cmin = Math.min(0, ...cData.map((d) => d.value));
      cmax = Math.max(...cData.map((d) => d.value));
      if (cmax === cmin) cmax = cmin + 1;
    }
    const zeroY = cy + ch - ((0 - cmin) / (cmax - cmin)) * ch;
    addEl('line', { x1: state.padding.left, y1: zeroY, x2: W - state.padding.right, y2: zeroY, stroke: '#888', 'stroke-dasharray': '4 2' });

    for (const d of cData) {
      const x1 = xScale(Math.max(d.start, state.view.start));
      const x2 = xScale(Math.min(d.end, state.view.end));
      const val = Math.max(cmin, Math.min(cmax, d.value));
      const y = cy + ch - ((val - cmin) / (cmax - cmin)) * ch;
      const rect = addEl('rect', { x: x1, y: Math.min(y, zeroY), width: Math.max(0, x2 - x1), height: Math.abs(zeroY - y), fill: '#4a90e2', opacity: 0.8 });
      rect.addEventListener('mousemove', (ev) => showTip(ev, `Count\n${d.seqid}:${d.start}-${d.end} = ${d.value}`));
      rect.addEventListener('mouseleave', hideTip);
    }

      addEl('text', { x: 6, y: cy + 10, fill: '#fff', 'font-size': 10, 'font-weight': '600' }).textContent = 'Count';    // Density track
    const dt = state.tracks.density;
    const dh = dt.h;
    const dy = dt.y;
    let dmin = 0, dmax = 1;
    if (cData.length && cData.some(d => d.density !== undefined)) {
      const densityValues = cData.map(d => d.density || 0).filter(v => isFinite(v));
      if (densityValues.length > 0) {
        dmin = Math.min(0, ...densityValues);
        dmax = Math.max(...densityValues);
        if (dmax === dmin) dmax = dmin + 0.1;
      }
    }
    const densityZeroY = dy + dh - ((0 - dmin) / (dmax - dmin)) * dh;
    addEl('line', { x1: state.padding.left, y1: densityZeroY, x2: W - state.padding.right, y2: densityZeroY, stroke: '#888', 'stroke-dasharray': '4 2' });

    for (const d of cData) {
      if (d.density !== undefined && isFinite(d.density)) {
        const x1 = xScale(Math.max(d.start, state.view.start));
        const x2 = xScale(Math.min(d.end, state.view.end));
        const val = Math.max(dmin, Math.min(dmax, d.density));
        const y = dy + dh - ((val - dmin) / (dmax - dmin)) * dh;
        const rect = addEl('rect', { x: x1, y: Math.min(y, densityZeroY), width: Math.max(0, x2 - x1), height: Math.abs(densityZeroY - y), fill: '#e67e22', opacity: 0.8 });
        rect.addEventListener('mousemove', (ev) => showTip(ev, `Density\n${d.seqid}:${d.start}-${d.end} = ${d.density?.toFixed(3)}`));
        rect.addEventListener('mouseleave', hideTip);
      }
    }

    addEl('text', { x: 6, y: dy + 10, fill: '#fff', 'font-size': 10, 'font-weight': '600' }).textContent = 'Density';

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

    const laneH = 12, laneGap = 4, maxLanes = Math.floor(fh / (laneH + laneGap));

    let renderedCount = 0;
    for (const f of feats) {
      const x1 = xScale(Math.max(f.start, state.view.start));
      const x2 = xScale(Math.min(f.end, state.view.end));
      
      if (x2 <= x1) continue;
      const lane = Math.min(placeLane(x1, x2), maxLanes - 1);
      const y = fy + lane * (laneH + laneGap);
      const strandClass = f.strand === '-' ? '#f39c12' : '#e94e77';
      const rect = addEl('rect', { x: x1, y, width: x2 - x1, height: laneH, fill: strandClass, stroke: '#fff', 'stroke-width': 0.5, opacity: 0.9 });
      rect.addEventListener('mousemove', (ev) => {
        const name = f.attrs.Name || f.attrs.gene || f.attrs.ID || '';
        showTip(ev, `${f.type} ${name ? '(' + name + ')' : ''}\n${f.seqid}:${f.start}-${f.end} ${f.strand}`);
      });
      rect.addEventListener('mouseleave', hideTip);
      if (x2 - x1 > 35) {
        const name = f.attrs.Name || f.attrs.gene || f.attrs.ID || f.type;
        const txt = addEl('text', { x: x1 + 3, y: y + laneH * 0.75, fill: '#ccc', 'font-size': 9 });
        txt.textContent = name;
      }
      renderedCount++;
    }
    addEl('text', { x: 6, y: fy + 10, fill: '#fff', 'font-size': 10, 'font-weight': '600' }).textContent = 'Genes';
  };

  // --- Fit to data ---
  const fitToData = () => {
    const seqid = seqidSelectRef.current?.value || state.view.seqid;
    if (!seqid) return;
    const featSeq = state.features.filter((f) => f.seqid === seqid);
    const cntSeq = state.counts.filter((c) => c.seqid === seqid);
    const mins: number[] = [];
    const maxs: number[] = [];
    if (featSeq.length) {
      mins.push(Math.min(...featSeq.map((f) => f.start)));
      maxs.push(Math.max(...featSeq.map((f) => f.end)));
    }
    if (cntSeq.length) {
      mins.push(Math.min(...cntSeq.map((c) => c.start)));
      maxs.push(Math.max(...cntSeq.map((c) => c.end)));
    }
    if (!mins.length) return;
    const pad = Math.round((Math.max(...maxs) - Math.min(...mins)) * 0.05);
    setState((s) => ({
      ...s,
      view: { ...s.view, seqid, start: Math.max(1, Math.min(...mins) - pad), end: Math.max(Math.min(...mins) - pad + 10, Math.max(...maxs) + pad) },
    }));
  };

  // --- File handlers ---
  const handleFile = (inputRef: React.RefObject<HTMLInputElement>, cb: (text: string) => void) => {
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => cb(reader.result as string);
    reader.readAsText(file);
  };

  // --- Load files when organism is selected ---
  useEffect(() => {
    if (!selectedOrganism || !selectedOrganism['ID-replicon']) return;
    
    console.log('Organismo seleccionado:', selectedOrganism);
    
    const loadOrganismFiles = async () => {
      try {
        const genomePath = `/data/${selectedOrganism.ID}`;
        const repliconId = selectedOrganism['ID-replicon'];
        // Corregir aquí: usar repliconId directamente sin "chromosome_" extra
        const csvPath = `${genomePath}/analysis/${repliconId}_ir_region.csv`;
        
        console.log('Intentando cargar archivo CSV:', csvPath);
        
        // Cargar el archivo CSV que contiene tanto features como counts
        try {
          const csvResponse = await fetch(csvPath);
          console.log('Respuesta CSV:', csvResponse.status, csvResponse.statusText);
          
          if (csvResponse.ok && csvResponse.status === 200) {
            const csvText = await csvResponse.text();
            console.log('Texto CSV cargado, longitud:', csvText.length);
            
            // Parsear como features y como counts
            const { feats, seqids } = parseCSVAsFeatures(csvText);
            const counts = parseCountsCSV(csvText);
            
            console.log('Procesado - Features:', feats.length, 'Counts:', counts.length, 'Seqids:', seqids);
            
            setState((s) => {
              const newState = { 
                ...s, 
                features: feats,
                counts,
                seqids: new Set([...s.seqids, ...seqids]),
                view: seqids.length > 0 ? { ...s.view, seqid: seqids[0] } : s.view
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
          } else {
            console.error('No se pudo cargar el archivo CSV:', csvResponse.status);
          }
        } catch (err) {
          console.error('Error cargando archivo CSV:', err);
        }
      } catch (err) {
        console.error('Error general:', err);
      }
    };
    
    loadOrganismFiles();
  }, [selectedOrganism]);

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
              fontSize: '0.9rem',
              fontWeight: '600',
              color: '#4fc3f7',
              minWidth: 'fit-content'
            }}>
              <em>{selectedOrganism.genus} {selectedOrganism.species}</em>
              <span style={{ color: '#999', marginLeft: 6, fontSize: '0.8rem' }}>({selectedOrganism.ID})</span>
            </div>
          )}
          
          {/* Controles en una línea */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8,
            fontSize: '0.75rem'
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
                padding: '3px 6px',
                backgroundColor: '#404040',
                border: '1px solid #555',
                borderRadius: '3px',
                color: '#fff',
                fontSize: '0.7rem',
                width: '80px'
              }}
            />
            
            <span style={{ color: '#ccc', marginLeft: 4 }}>Counts:</span>
            <input 
              type="file" 
              ref={countsInputRef} 
              onChange={() => handleFile(countsInputRef, (text) => {
                const counts = parseCounts(text);
                setState((s) => ({ ...s, counts, seqids: new Set([...s.seqids, ...counts.map(c => c.seqid)]) }));
              })}
              style={{
                padding: '3px 6px',
                backgroundColor: '#404040',
                border: '1px solid #555',
                borderRadius: '3px',
                color: '#fff',
                fontSize: '0.7rem',
                width: '80px'
              }}
            />
            
            <span style={{ color: '#ccc', marginLeft: 4 }}>Filtro:</span>
            <input 
              ref={typeFilterRef}
              type="text"
              placeholder="gene,..."
              style={{
                padding: '3px 6px',
                backgroundColor: '#404040',
                border: '1px solid #555',
                borderRadius: '3px',
                color: '#fff',
                fontSize: '0.7rem',
                width: '90px'
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
        <div ref={tooltipRef} style={{ position: 'absolute', display: 'none', backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff', padding: 4, borderRadius: 4, pointerEvents: 'none', fontSize: '0.8rem' }} />
        
        {/* Controles de navegación */}
        <div style={{ 
          position: 'absolute', 
          top: 10, 
          right: 10, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 4,
          backgroundColor: 'rgba(45, 45, 45, 0.9)',
          padding: '8px',
          borderRadius: '6px',
          border: '1px solid #555'
        }}>
          <div style={{ display: 'flex', gap: 4 }}>
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
                padding: '4px 8px', 
                fontSize: '12px', 
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
                padding: '4px 8px', 
                fontSize: '12px', 
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
              padding: '4px 8px', 
              fontSize: '10px', 
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
          bottom: 10,
          left: 10,
          backgroundColor: 'rgba(45, 45, 45, 0.9)',
          padding: '6px 12px',
          borderRadius: '4px',
          border: '1px solid #555',
          fontSize: '11px',
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

export default RepliconPlot;

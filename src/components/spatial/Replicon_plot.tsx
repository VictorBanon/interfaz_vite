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
}

interface View {
  seqid: string | null;
  start: number;
  end: number;
}

interface Tracks {
  counts: { y: number; h: number };
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
    pxHeight: 520,
    padding: { left: 70, right: 20, top: 30, bottom: 30 },
    tracks: { counts: { y: 70, h: 160 }, features: { y: 260, h: 210 } },
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
        if (i < 5) { // Debug primeras líneas problemáticas
          console.log(`Línea ${i} con ${parts.length} partes:`, line);
        }
        continue;
      }
      
      const [seqid, source, type, start, end, score, strand, phase, attrs] = parts;
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
        console.log(`Feature ${validLines}:`, { seqid, type, start: s, end: e });
      }
    }
    
    console.log('- Líneas de comentario:', commentLines);
    console.log('- Líneas muy cortas:', shortLines);
    console.log('- Coordenadas inválidas:', invalidCoords);
    console.log('- Líneas válidas procesadas:', validLines);
    
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
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      if (i === 0) {
        // Primera línea: headers
        headers = line.split(',');
        continue;
      }
      
      const parts = line.split(',');
      if (parts.length < headers.length) continue;
      
      // Crear objeto con los headers
      const row: any = {};
      headers.forEach((header, idx) => {
        row[header] = parts[idx];
      });
      
      // Extraer datos necesarios (start, end, ir_count)
      const start = parseInt(row.start, 10);
      const end = parseInt(row.end, 10);
      const value = parseFloat(row.ir_count);
      
      if ([start, end].some(Number.isNaN) || !isFinite(value)) continue;
      
      // Usar un seqid genérico o extraer de los datos si está disponible
      const seqid = row.seqid || selectedOrganism?.['Replicons_name'] || 'chromosome';
      
      out.push({ seqid, start: Math.max(1, start), end: Math.max(1, end), value });
    }
    return out;
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
    const filtered = state.features.filter(
      (f) =>
        (!state.view.seqid || f.seqid === state.view.seqid) &&
        (types.length === 0 || types.includes(f.type)) &&
        f.end - f.start + 1 >= minL &&
        !(f.end < state.view.start || f.start > state.view.end)
    );
    
    // Debug información
    console.log('Debug filteredFeatures:');
    console.log('- Total features en state:', state.features.length);
    console.log('- View seqid:', state.view.seqid);
    console.log('- View range:', state.view.start, '-', state.view.end);
    console.log('- Types filter:', types);
    console.log('- Min length:', minL);
    console.log('- Features filtradas:', filtered.length);
    if (filtered.length > 0) {
      console.log('- Primeras 3 features filtradas:', filtered.slice(0, 3));
    }
    
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
      const lbl = addEl('text', { x: x, y: H - 8, 'text-anchor': 'middle', fill: '#ccc', 'font-size': 12 }, xg);
      lbl.textContent = t.toLocaleString();
    }

    // Counts track
    const ct = state.tracks.counts;
    const ch = ct.h;
    const cy = ct.y;
    const cData = countsInView();
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
      rect.addEventListener('mousemove', (ev) => showTip(ev, `Counts\n${d.seqid}:${d.start}-${d.end} = ${d.value}`));
      rect.addEventListener('mouseleave', hideTip);
    }

    addEl('text', { x: 8, y: cy + 12, fill: '#fff', 'font-size': 12, 'font-weight': '600' }).textContent = 'Counts';

    // Features track
    const ft = state.tracks.features;
    const fy = ft.y;
    const fh = ft.h;
    const feats = filteredFeatures().sort((a, b) => a.start - b.start);
    const lanes: { x2: number }[] = [];

    console.log('Debug renderSVG Features:');
    console.log('- Features para renderizar:', feats.length);
    console.log('- Track Y:', fy, 'Height:', fh);

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

    const laneH = 16, laneGap = 6, maxLanes = Math.floor(fh / (laneH + laneGap));

    let renderedCount = 0;
    for (const f of feats) {
      const x1 = xScale(Math.max(f.start, state.view.start));
      const x2 = xScale(Math.min(f.end, state.view.end));
      
      if (renderedCount < 3) {
        console.log(`Feature ${renderedCount}:`, {
          seqid: f.seqid,
          start: f.start,
          end: f.end,
          type: f.type,
          x1,
          x2,
          skip: x2 <= x1
        });
      }
      
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
      if (x2 - x1 > 40) {
        const name = f.attrs.Name || f.attrs.gene || f.attrs.ID || f.type;
        const txt = addEl('text', { x: x1 + 4, y: y + laneH * 0.72, fill: '#ccc', 'font-size': 12 });
        txt.textContent = name;
      }
      renderedCount++;
    }
    console.log('Total features renderizadas:', renderedCount);
    addEl('text', { x: 8, y: fy + 12, fill: '#fff', 'font-size': 12, 'font-weight': '600' }).textContent = 'Features';
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
    if (!selectedOrganism || !selectedOrganism.ID) return;
    
    console.log('Organismo seleccionado:', selectedOrganism);
    
    const loadOrganismFiles = async () => {
      try {
        // Construir las rutas de los archivos basado en el ID del organismo
        const genomePath = `/data/${selectedOrganism.ID}`;
        // Reordenamos para intentar primero con los archivos que sabemos que existen
        const gffPath1 = `${genomePath}/preprocessing/${selectedOrganism.ID}_genomic.gff`; // Patrón real encontrado
        const gffPath2 = `${genomePath}/preprocessing/${selectedOrganism["ID-replicon"]}_genomic.gff`;
        const gffPath3 = `${genomePath}/preprocessing/${selectedOrganism["ID-replicon"]}_protein.gff`;
        const countsPath = `/ir_count_by_region.csv`; // Archivo global en la raíz
        
        console.log('Intentando cargar archivos:');
        console.log('- GFF principal (ID completo):', gffPath1);
        console.log('- GFF alternativo (ID-replicon):', gffPath2);
        console.log('- GFF protein (fallback):', gffPath3);
        console.log('- Counts:', countsPath);
        
        // Cargar archivo GFF con fallback
        let gffLoaded = false;
        
        // Intentar con el primer archivo
        try {
          console.log('Cargando archivo GFF principal (ID completo)...');
          const gffResponse = await fetch(gffPath1);
          console.log('Respuesta GFF principal:', gffResponse.status, gffResponse.statusText);
          
          if (gffResponse.ok && gffResponse.status === 200) {
            const gffText = await gffResponse.text();
            console.log('Texto GFF cargado, longitud:', gffText.length);
            
            // Mostrar las primeras líneas del archivo para debug
            console.log('Primeras 10 líneas del archivo GFF:');
            console.log(gffText.split('\n').slice(0, 10).join('\n'));
            
            // Verificar que el contenido es realmente un GFF válido
            if (gffText.includes('\t') && (gffText.includes('##gff-version') || gffText.split('\n').some(line => line.split('\t').length >= 9))) {
              gffLoaded = true;
              const { feats, seqids } = parseGFF(gffText);
              console.log('Features parseadas:', feats.length, 'Seqids:', seqids);
              
              setState((s) => {
                const newState = { 
                  ...s, 
                  features: feats, 
                  seqids: new Set([...s.seqids, ...seqids]),
                  view: seqids.length > 0 ? { ...s.view, seqid: seqids[0] } : s.view
                };
                
                // Auto-fit to data cuando se cargan features
                if (feats.length > 0 && seqids.length > 0) {
                  const featSeq = feats.filter(f => f.seqid === seqids[0]);
                  if (featSeq.length > 0) {
                    const minPos = Math.min(...featSeq.map(f => f.start));
                    const maxPos = Math.max(...featSeq.map(f => f.end));
                    const pad = Math.round((maxPos - minPos) * 0.1);
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
              console.log('El contenido del archivo principal no parece ser un GFF válido, longitud:', gffText.length);
            }
          }
        } catch (err) {
          console.error('Error cargando archivo GFF principal:', err);
        }
        
        // Si no se pudo cargar el archivo principal, intentar con el alternativo
        if (!gffLoaded) {
          try {
            console.log('Intentando cargar archivo GFF alternativo (ID-replicon)...');
            const gffResponse = await fetch(gffPath2);
            console.log('Respuesta GFF alternativo:', gffResponse.status, gffResponse.statusText);
            
            if (gffResponse.ok && gffResponse.status === 200) {
              const gffText = await gffResponse.text();
              console.log('Texto GFF alternativo cargado, longitud:', gffText.length);
              
              // Verificar que el contenido es realmente un GFF válido
              if (gffText.includes('\t') && (gffText.includes('##gff-version') || gffText.split('\n').some(line => line.split('\t').length >= 9))) {
                gffLoaded = true;
                const { feats, seqids } = parseGFF(gffText);
                console.log('Features parseadas del archivo alternativo:', feats.length, 'Seqids:', seqids);
                
                setState((s) => {
                  const newState = { 
                    ...s, 
                    features: feats, 
                    seqids: new Set([...s.seqids, ...seqids]),
                    view: seqids.length > 0 ? { ...s.view, seqid: seqids[0] } : s.view
                  };
                  
                  // Auto-fit to data cuando se cargan features
                  if (feats.length > 0 && seqids.length > 0) {
                    const featSeq = feats.filter(f => f.seqid === seqids[0]);
                    if (featSeq.length > 0) {
                      const minPos = Math.min(...featSeq.map(f => f.start));
                      const maxPos = Math.max(...featSeq.map(f => f.end));
                      const pad = Math.round((maxPos - minPos) * 0.1);
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
                console.log('El contenido del archivo alternativo no parece ser un GFF válido');
              }
            }
          } catch (err) {
            console.error('Error cargando archivo GFF alternativo:', err);
          }
        }
        
        // Cargar archivo de conteos
        try {
          console.log('Cargando archivo de conteos...');
          const countsResponse = await fetch(countsPath);
          console.log('Respuesta Counts:', countsResponse.status, countsResponse.statusText);
          
          if (countsResponse.ok) {
            const countsText = await countsResponse.text();
            console.log('Texto de conteos cargado, longitud:', countsText.length);
            
            // Filtrar los conteos solo para el organismo seleccionado
            const allCounts = parseCountsCSV(countsText);
            console.log('Todos los conteos parseados:', allCounts.length);
            
            // Asignar el seqid correcto a todos los conteos
            const countsWithSeqid = allCounts.map(count => ({
              ...count,
              seqid: selectedOrganism['Replicons_name'] || 'chromosome'
            }));
            
            console.log('Conteos filtrados para el organismo:', countsWithSeqid.length);
            
            setState((s) => ({ 
              ...s, 
              counts: countsWithSeqid, 
              seqids: new Set([...s.seqids, ...countsWithSeqid.map(c => c.seqid)]) 
            }));
          } else {
            console.error('Error al cargar conteos:', countsResponse.status, countsResponse.statusText);
          }
        } catch (err) {
          console.error('Error cargando archivo de conteos:', err);
        }
      } catch (err) {
        console.error('Error general cargando archivos del organismo:', err);
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
              placeholder="CDS,gene..."
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

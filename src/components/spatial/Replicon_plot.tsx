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

const RepliconPlot: React.FC = () => {
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
    for (const line of lines) {
      if (!line || line.startsWith('#')) continue;
      const parts = line.split(/\t/);
      if (parts.length < 9) continue;
      const [seqid, source, type, start, end, score, strand, phase, attrs] = parts;
      const s = parseInt(start, 10);
      const e = parseInt(end, 10);
      if (Number.isNaN(s) || Number.isNaN(e)) continue;
      feats.push({ seqid, source, type, start: s, end: e, score, strand, phase, attrs: parseAttrs(attrs) });
      seqids.add(seqid);
    }
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
    return state.features.filter(
      (f) =>
        (!state.view.seqid || f.seqid === state.view.seqid) &&
        (types.length === 0 || types.includes(f.type)) &&
        f.end - f.start + 1 >= minL &&
        !(f.end < state.view.start || f.start > state.view.end)
    );
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
      if (x2 - x1 > 40) {
        const name = f.attrs.Name || f.attrs.gene || f.attrs.ID || f.type;
        const txt = addEl('text', { x: x1 + 4, y: y + laneH * 0.72, fill: '#ccc', 'font-size': 12 });
        txt.textContent = name;
      }
    }
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

  useEffect(() => { renderSVG(); }, [state]);

  return (
    <div className="genome-viewer">
      <div style={{ marginBottom: 8 }}>
        <input type="file" ref={gffInputRef} onChange={() => handleFile(gffInputRef, (text) => {
          const { feats, seqids } = parseGFF(text);
          setState((s) => ({ ...s, features: feats, seqids: new Set([...s.seqids, ...seqids]) }));
        })} />
        <input type="file" ref={countsInputRef} onChange={() => handleFile(countsInputRef, (text) => {
          const counts = parseCounts(text);
          setState((s) => ({ ...s, counts, seqids: new Set([...s.seqids, ...counts.map(c => c.seqid)]) }));
        })} />
      </div>

      <div style={{ marginBottom: 8 }}>
        <select ref={seqidSelectRef} onChange={() => setState((s) => ({ ...s, view: { ...s.view, seqid: seqidSelectRef.current?.value || null } }))}></select>
        <input type="number" ref={viewStartRef} placeholder="start" />
        <input type="number" ref={viewEndRef} placeholder="end" />
        <input ref={typeFilterRef} placeholder="type filter (comma)" />
        <input type="number" ref={minLenRef} placeholder="min length" />
        <button onClick={fitToData}>Fit</button>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
        <div ref={tooltipRef} style={{ position: 'absolute', display: 'none', backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff', padding: 4, borderRadius: 4, pointerEvents: 'none', fontSize: '0.8rem' }} />
      </div>
    </div>
  );
};

export default RepliconPlot;

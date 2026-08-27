import React, { useState, useRef, useEffect, useCallback } from 'react';
import './canva.css';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 88;
const PORT_Y = 44;
const RULER_SIZE = 24;
const GRID_SNAP = 20;

// Pastel fills — used for swatches, badges, port centers
const TYPE_COLOR = {
  source: '#9CC5F0',
  processor: '#B6ABE6',
  target: '#8AD6CC',
};

// Deeper tones of the same hues — used for strokes/borders where contrast on white matters
const STROKE_COLOR = {
  source: '#4F86C6',
  processor: '#7A6BC4',
  target: '#3FA79C',
};

const clone = (v) => JSON.parse(JSON.stringify(v));
const escapeXml = (str) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export default function Canva() {
  const [nodes, setNodes] = useState([
    { id: '1', title: 'Input Source', type: 'source', x: 100, y: 150 },
    { id: '2', title: 'Data Processor', type: 'processor', x: 420, y: 150 },
    { id: '3', title: 'Output Target', type: 'target', x: 740, y: 150 },
  ]);

  const [connections, setConnections] = useState([
    { id: 'c1', from: '1', to: '2' },
    { id: 'c2', from: '2', to: '3' },
  ]);

  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [draggingNode, setDraggingNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [connecting, setConnecting] = useState(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [mouseDownPos, setMouseDownPos] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });
  const [contextMenu, setContextMenu] = useState(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [historyStats, setHistoryStats] = useState({ canUndo: false, canRedo: false });
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const canvasRef = useRef(null);
  const importInputRef = useRef(null);
  const stateRef = useRef({});
  stateRef.current = { pan, zoom, draggingNode, dragOffset, connecting, isPanning };

  const nodesRef = useRef(nodes);
  const connectionsRef = useRef(connections);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { connectionsRef.current = connections; }, [connections]);

  const historyPast = useRef([]);
  const historyFuture = useRef([]);
  const dragSnapshotRef = useRef(null);

  const syncHistoryStats = () => setHistoryStats({
    canUndo: historyPast.current.length > 0,
    canRedo: historyFuture.current.length > 0,
  });

  const pushHistory = (snapshot) => {
    const snap = snapshot || { nodes: clone(nodesRef.current), connections: clone(connectionsRef.current) };
    historyPast.current = [...historyPast.current.slice(-49), snap];
    historyFuture.current = [];
    syncHistoryStats();
  };

  const undo = () => {
    if (historyPast.current.length === 0) return;
    const prev = historyPast.current[historyPast.current.length - 1];
    historyPast.current = historyPast.current.slice(0, -1);
    historyFuture.current = [...historyFuture.current, { nodes: clone(nodesRef.current), connections: clone(connectionsRef.current) }];
    setNodes(prev.nodes);
    setConnections(prev.connections);
    setSelectedNode(null);
    setSelectedConnection(null);
    syncHistoryStats();
  };

  const redo = () => {
    if (historyFuture.current.length === 0) return;
    const next = historyFuture.current[historyFuture.current.length - 1];
    historyFuture.current = historyFuture.current.slice(0, -1);
    historyPast.current = [...historyPast.current, { nodes: clone(nodesRef.current), connections: clone(connectionsRef.current) }];
    setNodes(next.nodes);
    setConnections(next.connections);
    setSelectedNode(null);
    setSelectedConnection(null);
    syncHistoryStats();
  };

  useEffect(() => {
    const el = canvasRef.current;
    const update = () => setViewport({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const screenToCanvas = useCallback((clientX, clientY) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const { pan, zoom } = stateRef.current;
    return { x: (clientX - rect.left - pan.x) / zoom, y: (clientY - rect.top - pan.y) / zoom };
  }, []);

  const canvasToScreen = useCallback((x, y) => {
    const { pan, zoom } = stateRef.current;
    return { x: x * zoom + pan.x, y: y * zoom + pan.y };
  }, []);

  const portPos = (node, side) => ({
    x: node.x + (side === 'output' ? NODE_WIDTH : 0),
    y: node.y + PORT_Y,
  });

  const handleNodeMouseDown = (node, e) => {
    e.stopPropagation();
    setSelectedNode(node.id);
    setSelectedConnection(null);
    const c = screenToCanvas(e.clientX, e.clientY);
    setDraggingNode(node.id);
    setDragOffset({ x: c.x - node.x, y: c.y - node.y });
    dragSnapshotRef.current = { nodes: clone(nodesRef.current), connections: clone(connectionsRef.current), moved: false };
  };

  const addNode = (type, atX, atY) => {
    pushHistory();
    let x = atX, y = atY;
    if (x === undefined) {
      const rect = canvasRef.current.getBoundingClientRect();
      const center = screenToCanvas(rect.left + rect.width / 2, rect.top + rect.height / 2);
      x = center.x - NODE_WIDTH / 2 + (Math.random() * 60 - 30);
      y = center.y - 42 + (Math.random() * 60 - 30);
    }
    const newNode = { id: Date.now().toString(), title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`, type, x, y };
    setNodes(prev => [...prev, newNode]);
    setSelectedNode(newNode.id);
  };

  const duplicateNode = (id) => {
    const node = nodesRef.current.find(n => n.id === id);
    if (!node) return;
    pushHistory();
    const copy = { ...node, id: `${Date.now()}`, x: node.x + 32, y: node.y + 32, title: `${node.title} copy` };
    setNodes(prev => [...prev, copy]);
    setSelectedNode(copy.id);
  };

  const deleteNode = useCallback((id) => {
    pushHistory();
    setNodes(prev => prev.filter(n => n.id !== id));
    setConnections(prev => prev.filter(c => c.from !== id && c.to !== id));
    setSelectedNode(sel => (sel === id ? null : sel));
  }, []);

  const deleteConnection = useCallback((id) => {
    pushHistory();
    setConnections(prev => prev.filter(c => c.id !== id));
    setSelectedConnection(sel => (sel === id ? null : sel));
  }, []);

  const clearCanvas = () => {
    if (nodesRef.current.length === 0 && connectionsRef.current.length === 0) return;
    if (!window.confirm('Clear the entire canvas? You can undo this with Ctrl+Z.')) return;
    pushHistory();
    setNodes([]);
    setConnections([]);
    setSelectedNode(null);
    setSelectedConnection(null);
  };

  const startConnecting = (node, e) => {
    e.stopPropagation();
    const p = portPos(node, 'output');
    setConnecting({ fromId: node.id, startX: p.x, startY: p.y, curX: p.x, curY: p.y });
  };

  const finishConnecting = (node, e) => {
    e.stopPropagation();
    setConnecting(current => {
      if (current && current.fromId !== node.id) {
        const exists = connectionsRef.current.some(c => c.from === current.fromId && c.to === node.id);
        if (!exists) {
          pushHistory();
          setConnections(prev => [...prev, { id: `c${Date.now()}`, from: current.fromId, to: node.id }]);
        }
      }
      return null;
    });
  };

  const handleWorkspaceMouseDown = (e) => {
    if (contextMenu) { setContextMenu(null); return; }
    setMouseDownPos({ x: e.clientX, y: e.clientY });
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleWorkspaceMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    if (draggingNode) {
      const c = screenToCanvas(e.clientX, e.clientY);
      if (dragSnapshotRef.current) dragSnapshotRef.current.moved = true;
      let nx = c.x - dragOffset.x;
      let ny = c.y - dragOffset.y;
      if (snapEnabled) { nx = Math.round(nx / GRID_SNAP) * GRID_SNAP; ny = Math.round(ny / GRID_SNAP) * GRID_SNAP; }
      setNodes(prev => prev.map(n => n.id === draggingNode ? { ...n, x: Math.max(0, nx), y: Math.max(0, ny) } : n));
      return;
    }
    if (connecting) {
      const c = screenToCanvas(e.clientX, e.clientY);
      setConnecting(prev => prev ? { ...prev, curX: c.x, curY: c.y } : prev);
      return;
    }
    if (isPanning) setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  };

  const handleWorkspaceMouseUp = (e) => {
    if (isPanning) {
      const dist = Math.hypot(e.clientX - mouseDownPos.x, e.clientY - mouseDownPos.y);
      if (dist < 6) { setSelectedNode(null); setSelectedConnection(null); }
      setIsPanning(false);
    }
    if (draggingNode) {
      if (dragSnapshotRef.current && dragSnapshotRef.current.moved) {
        pushHistory({ nodes: dragSnapshotRef.current.nodes, connections: dragSnapshotRef.current.connections });
      }
      dragSnapshotRef.current = null;
      setDraggingNode(null);
    }
    if (connecting) setConnecting(null);
  };

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setZoom(prevZoom => {
      const factor = e.deltaY > 0 ? 0.96 : 1.04;
      const newZoom = Math.min(2.5, Math.max(0.3, prevZoom * factor));
      setPan(prevPan => {
        const cX = (mouseX - prevPan.x) / prevZoom;
        const cY = (mouseY - prevPan.y) / prevZoom;
        return { x: mouseX - cX * newZoom, y: mouseY - cY * newZoom };
      });
      return newZoom;
    });
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleCanvasContextMenu = (e) => {
    e.preventDefault();
    const c = screenToCanvas(e.clientX, e.clientY);
    setContextMenu({ type: 'canvas', screenX: e.clientX, screenY: e.clientY, canvasX: c.x, canvasY: c.y });
  };

  const handleNodeContextMenu = (node, e) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedNode(node.id);
    setContextMenu({ type: 'node', nodeId: node.id, screenX: e.clientX, screenY: e.clientY });
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if (meta && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
      if (meta && e.key.toLowerCase() === 'd') { e.preventDefault(); if (selectedNode) duplicateNode(selectedNode); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedConnection) deleteConnection(selectedConnection);
        else if (selectedNode) deleteNode(selectedNode);
        return;
      }
      if (e.key === 'Escape') { setConnecting(null); setContextMenu(null); setSelectedNode(null); setSelectedConnection(null); return; }
      if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomBy(1.1); return; }
      if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomBy(0.9); return; }
      if (e.key === '0') { e.preventDefault(); resetView(); return; }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedNode, selectedConnection, deleteNode, deleteConnection, nodes, connections, zoom]);

  const zoomBy = (factor) => {
    const mouseX = viewport.width / 2;
    const mouseY = viewport.height / 2;
    setZoom(prevZoom => {
      const newZoom = Math.min(2.5, Math.max(0.3, prevZoom * factor));
      setPan(prevPan => {
        const cX = (mouseX - prevPan.x) / prevZoom;
        const cY = (mouseY - prevPan.y) / prevZoom;
        return { x: mouseX - cX * newZoom, y: mouseY - cY * newZoom };
      });
      return newZoom;
    });
  };

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const fitView = () => {
    if (nodes.length === 0 || !viewport.width) { resetView(); return; }
    const minX = Math.min(...nodes.map(n => n.x));
    const minY = Math.min(...nodes.map(n => n.y));
    const maxX = Math.max(...nodes.map(n => n.x + NODE_WIDTH));
    const maxY = Math.max(...nodes.map(n => n.y + NODE_HEIGHT));
    const boxW = Math.max(maxX - minX, 1);
    const boxH = Math.max(maxY - minY, 1);
    const padding = 80;
    const newZoom = Math.min(2.5, Math.max(0.3, Math.min(
      (viewport.width - padding) / boxW,
      (viewport.height - padding) / boxH
    )));
    setZoom(newZoom);
    setPan({
      x: (viewport.width - boxW * newZoom) / 2 - minX * newZoom,
      y: (viewport.height - boxH * newZoom) / 2 - minY * newZoom,
    });
  };

  const focusNode = (node) => {
    setSelectedNode(node.id);
    setSelectedConnection(null);
    const target = { x: node.x + NODE_WIDTH / 2, y: node.y + NODE_HEIGHT / 2 };
    setPan({ x: viewport.width / 2 - target.x * zoom, y: viewport.height / 2 - target.y * zoom });
  };

  const handleSearchKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    const term = searchTerm.trim().toLowerCase();
    if (!term) return;
    const match = nodes.find(n => n.title.toLowerCase().includes(term));
    if (match) focusNode(match);
  };

  const bezierPath = (x1, y1, x2, y2) => {
    const midX = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
  };

  const deleteBtnScreenPos = (conn) => {
    const fromNode = nodes.find(n => n.id === conn.from);
    const toNode = nodes.find(n => n.id === conn.to);
    if (!fromNode || !toNode) return null;
    const p1 = portPos(fromNode, 'output');
    const p2 = portPos(toNode, 'input');
    return canvasToScreen((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExportJson = () => {
    const data = JSON.stringify({ nodes, connections }, null, 2);
    downloadBlob(new Blob([data], { type: 'application/json' }), 'nodeflow-diagram.json');
  };

  const handleImportClick = () => importInputRef.current && importInputRef.current.click();

  const handleImportFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (Array.isArray(parsed.nodes) && Array.isArray(parsed.connections)) {
          pushHistory();
          setNodes(parsed.nodes);
          setConnections(parsed.connections);
          setSelectedNode(null);
          setSelectedConnection(null);
        }
      } catch (err) {
        // ignore malformed file
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportImage = () => {
    if (nodes.length === 0) return;
    const minX = Math.min(...nodes.map(n => n.x));
    const minY = Math.min(...nodes.map(n => n.y));
    const maxX = Math.max(...nodes.map(n => n.x + NODE_WIDTH));
    const maxY = Math.max(...nodes.map(n => n.y + NODE_HEIGHT));
    const pad = 60;
    const width = maxX - minX + pad * 2;
    const height = maxY - minY + pad * 2;
    const ox = -minX + pad, oy = -minY + pad;

    const connectionsSvg = connections.map(conn => {
      const fromNode = nodes.find(n => n.id === conn.from);
      const toNode = nodes.find(n => n.id === conn.to);
      if (!fromNode || !toNode) return '';
      const x1 = fromNode.x + NODE_WIDTH + ox, y1 = fromNode.y + PORT_Y + oy;
      const x2 = toNode.x + ox, y2 = toNode.y + PORT_Y + oy;
      const midX = (x1 + x2) / 2;
      const color = STROKE_COLOR[fromNode.type];
      return `<path d="M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="2"/>`;
    }).join('');

    const nodesSvg = nodes.map(node => {
      const nx = node.x + ox, ny = node.y + oy;
      return `<foreignObject x="${nx}" y="${ny}" width="${NODE_WIDTH}" height="${NODE_HEIGHT}">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width:${NODE_WIDTH}px;height:${NODE_HEIGHT}px;background:#FFFFFF;border:1px solid #D3E3F5;border-radius:7px;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;overflow:hidden;">
          <div style="display:flex;align-items:center;gap:7px;padding:9px 10px;border-bottom:1px solid #EDF3FA;">
            <span style="width:7px;height:7px;border-radius:2px;background:${TYPE_COLOR[node.type]};display:inline-block;"></span>
            <span style="font-size:11px;font-weight:600;letter-spacing:1px;color:#7C8FA8;text-transform:uppercase;">${escapeXml(node.type)}</span>
          </div>
          <div style="padding:10px;">
            <div style="font-size:15px;font-weight:500;color:#1F2E42;">${escapeXml(node.title)}</div>
          </div>
        </div>
      </foreignObject>`;
    }).join('');

    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#E7EFF9" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="#EFF5FC"/>
      <rect width="100%" height="100%" fill="url(#grid)"/>
      ${connectionsSvg}
      ${nodesSvg}
    </svg>`;

    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => { if (blob) downloadBlob(blob, 'nodeflow-diagram.png'); }, 'image/png');
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  };

  const rulerUnit = zoom < 0.4 ? 500 : zoom < 0.8 ? 200 : 100;
  const genTicks = (panAxis, size) => {
    const ticks = [];
    const firstVal = -panAxis / zoom;
    let start = Math.floor(firstVal / rulerUnit) * rulerUnit;
    for (let v = start; ; v += rulerUnit) {
      const screenPos = v * zoom + panAxis;
      if (screenPos > size + rulerUnit * zoom) break;
      if (screenPos >= -rulerUnit * zoom) ticks.push({ v, pos: screenPos });
    }
    return ticks;
  };
  const hTicks = viewport.width ? genTicks(pan.x, viewport.width) : [];
  const vTicks = viewport.height ? genTicks(pan.y, viewport.height) : [];

  return (
    <div className="canvas-container">
      <header className="canvas-header">
        <div className="brand">
          <div className="brand-mark mono">NF</div>
          <div className="brand-text">
            <h1>NodeFlow</h1>
            <div className="brand-status"><span className="status-dot"></span>Workspace synced</div>
          </div>
        </div>

        <div className="canvas-toolbar">
          <div className="btn-group">
            <button className="icon-btn" onClick={undo} disabled={!historyStats.canUndo} title="Undo (Ctrl+Z)">Undo</button>
            <button className="icon-btn" onClick={redo} disabled={!historyStats.canRedo} title="Redo (Ctrl+Shift+Z)">Redo</button>
          </div>
          <div className="toolbar-divider" />
          <input
            type="text"
            className="search-input"
            placeholder="Find node…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          <div className="toolbar-divider" />
          <div className="btn-group">
            <button className="icon-btn" onClick={handleImportClick} title="Import a saved diagram">Import</button>
            <button className="icon-btn" onClick={handleExportJson} title="Export as JSON">Export</button>
            <button className="icon-btn" onClick={handleExportImage} title="Export as PNG image">PNG</button>
            <input ref={importInputRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={handleImportFile} />
          </div>
          <div className="toolbar-divider" />
          <button className="icon-btn danger" onClick={clearCanvas} title="Clear the canvas">Clear</button>
          <div className="toolbar-divider" />
          <div className="btn-group">
            <button onClick={() => addNode('source')} className="tool-btn">
              <span className="tool-swatch" style={{ background: TYPE_COLOR.source }}></span>Source
            </button>
            <button onClick={() => addNode('processor')} className="tool-btn">
              <span className="tool-swatch" style={{ background: TYPE_COLOR.processor }}></span>Processor
            </button>
            <button onClick={() => addNode('target')} className="tool-btn">
              <span className="tool-swatch" style={{ background: TYPE_COLOR.target }}></span>Target
            </button>
          </div>
        </div>
      </header>

      <div className="canvas-body">
        <div className="ruler-corner mono"></div>
        <div className="ruler-h mono">
          {hTicks.map(t => (
            <React.Fragment key={t.v}>
              <div className={`tick-h${t.v % (rulerUnit * 2) === 0 ? ' major' : ''}`} style={{ left: t.pos }} />
              {t.v % (rulerUnit * 2) === 0 && <div className="tick-label-h" style={{ left: t.pos }}>{t.v}</div>}
            </React.Fragment>
          ))}
          <div className="cursor-marker-h" style={{ left: mousePos.x - RULER_SIZE }} />
        </div>
        <div className="ruler-v mono">
          {vTicks.map(t => (
            <React.Fragment key={t.v}>
              <div className={`tick-v${t.v % (rulerUnit * 2) === 0 ? ' major' : ''}`} style={{ top: t.pos }} />
              {t.v % (rulerUnit * 2) === 0 && <div className="tick-label-v" style={{ top: t.pos }}>{t.v}</div>}
            </React.Fragment>
          ))}
          <div className="cursor-marker-v" style={{ top: mousePos.y - RULER_SIZE }} />
        </div>

        <div
          className={`canvas-workspace${isPanning ? ' panning' : ''}`}
          ref={canvasRef}
          onMouseDown={handleWorkspaceMouseDown}
          onMouseMove={handleWorkspaceMouseMove}
          onMouseUp={handleWorkspaceMouseUp}
          onMouseLeave={handleWorkspaceMouseUp}
          onContextMenu={handleCanvasContextMenu}
          style={{
            backgroundSize: `${rulerUnit * zoom}px ${rulerUnit * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        >
          <div className="canvas-world" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
            <svg className="connections-layer">
              <g transform="translate(4000,4000)">
                {connections.map(conn => {
                  const fromNode = nodes.find(n => n.id === conn.from);
                  const toNode = nodes.find(n => n.id === conn.to);
                  if (!fromNode || !toNode) return null;
                  const p1 = portPos(fromNode, 'output');
                  const p2 = portPos(toNode, 'input');
                  const d = bezierPath(p1.x, p1.y, p2.x, p2.y);
                  const selected = selectedConnection === conn.id;
                  const color = STROKE_COLOR[fromNode.type];
                  return (
                    <g key={conn.id}>
                      <path d={d} className={`connection-visible${selected ? ' selected' : ''}`} style={{ stroke: color }} />
                      <path d={d} className="connection-hit" onMouseDown={(e) => { e.stopPropagation(); setSelectedConnection(conn.id); setSelectedNode(null); }} />
                      <circle r="3" className="data-stream-particle" style={{ fill: color }}>
                        <animateMotion path={d} dur="3.2s" repeatCount="indefinite" />
                      </circle>
                    </g>
                  );
                })}
                {connecting && <path d={bezierPath(connecting.startX, connecting.startY, connecting.curX, connecting.curY)} className="connection-temp" />}
              </g>
            </svg>

            {nodes.map(node => (
              <div key={node.id} className={`workflow-node ${node.type} ${selectedNode === node.id ? 'selected' : ''}`}
                style={{ transform: `translate(${node.x}px, ${node.y}px)`, borderColor: selectedNode === node.id ? STROKE_COLOR[node.type] : undefined }}
                onMouseDown={(e) => handleNodeMouseDown(node, e)}
                onContextMenu={(e) => handleNodeContextMenu(node, e)}
              >
                <div className="port port-input" style={{ borderColor: STROKE_COLOR[node.type] }} onMouseUp={(e) => finishConnecting(node, e)} onMouseDown={(e) => e.stopPropagation()} title="Connect here" />
                <div className="port port-output" style={{ borderColor: STROKE_COLOR[node.type] }} onMouseDown={(e) => startConnecting(node, e)} title="Drag to connect" />
                <div className="node-header">
                  <div className="node-header-left">
                    <span className="node-swatch" style={{ background: TYPE_COLOR[node.type] }}></span>
                    <span className="node-type-label mono">{node.type}</span>
                  </div>
                  <button className="node-delete-btn" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }} title="Delete Node">&times;</button>
                </div>
                <div className="node-body">
                  <input type="text" value={node.title} onMouseDown={(e) => e.stopPropagation()}
                    onChange={(e) => { const val = e.target.value; setNodes(prev => prev.map(n => n.id === node.id ? { ...n, title: val } : n)); }}
                    className="node-input" />
                </div>
              </div>
            ))}
          </div>

          {selectedConnection && (() => {
            const conn = connections.find(c => c.id === selectedConnection);
            const pos = conn ? deleteBtnScreenPos(conn) : null;
            if (!pos) return null;
            return (
              <button className="conn-delete-btn" style={{ left: pos.x, top: pos.y }}
                onMouseDown={(e) => e.stopPropagation()} onClick={() => deleteConnection(selectedConnection)} title="Delete connection">&times;</button>
            );
          })()}

          {contextMenu && contextMenu.type === 'canvas' && (
            <div className="context-menu" onMouseDown={(e) => e.stopPropagation()} style={{ left: contextMenu.screenX, top: contextMenu.screenY }}>
              <div className="context-menu-label">Add node</div>
              {['source', 'processor', 'target'].map(type => (
                <button key={type} className="context-menu-item" onClick={() => { addNode(type, contextMenu.canvasX - NODE_WIDTH / 2, contextMenu.canvasY - 20); setContextMenu(null); }}>
                  <span className="context-menu-dot" style={{ backgroundColor: TYPE_COLOR[type] }}></span>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          )}

          {contextMenu && contextMenu.type === 'node' && (
            <div className="context-menu" onMouseDown={(e) => e.stopPropagation()} style={{ left: contextMenu.screenX, top: contextMenu.screenY }}>
              <div className="context-menu-label">Node</div>
              <button className="context-menu-item" onClick={() => { duplicateNode(contextMenu.nodeId); setContextMenu(null); }}>
                Duplicate
              </button>
              <button className="context-menu-item danger" onClick={() => { deleteNode(contextMenu.nodeId); setContextMenu(null); }}>
                Delete
              </button>
            </div>
          )}

          <div className="zoom-controls" onMouseDown={(e) => e.stopPropagation()}>
            <button className="zoom-btn" onClick={() => zoomBy(0.9)} title="Zoom out (-)">−</button>
            <span className="zoom-pct" onClick={resetView} title="Reset view (0)">{Math.round(zoom * 100)}%</span>
            <button className="zoom-btn" onClick={() => zoomBy(1.1)} title="Zoom in (+)">+</button>
            <span className="zoom-divider" />
            <button className={`zoom-btn snap ${snapEnabled ? 'active' : ''}`} onClick={() => setSnapEnabled(v => !v)} title="Snap to grid">Snap</button>
            <button className="zoom-btn fit" onClick={fitView} title="Fit all nodes in view">Fit</button>
          </div>

          <div className="canvas-legend">Drag a port to connect · Right-click for options · Del to remove · Scroll to zoom</div>
        </div>
      </div>
    </div>
  );
}

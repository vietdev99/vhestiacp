import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import {
  ArrowLeft, ZoomIn, ZoomOut, Maximize2, Tag, Tags
} from 'lucide-react';

export default function HAProxyVisualize() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [showLabels, setShowLabels] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const { data, isLoading, error } = useQuery({
    queryKey: ['haproxy-visualize'],
    queryFn: async () => {
      const [vizRes, userBackendsRes] = await Promise.all([
        api.get('/api/haproxy/visualize'),
        api.get('/api/haproxy/user-backends').catch(() => ({ data: [] }))
      ]);

      const vizData = vizRes.data;
      const userBackends = userBackendsRes.data || [];

      // Add user backend nodes and edges
      userBackends.forEach((ub, idx) => {
        const domainSafe = ub.domain.replace(/\./g, '_').replace(/-/g, '_');
        const backendId = `backend_backend_${domainSafe}`;
        const userBackendId = `user_backend_${idx}`;

        // Add user backend node
        vizData.nodes.push({
          id: userBackendId,
          type: 'user_backend',
          label: ub.domain,
          user: ub.user,
          host: ub.host,
          port: ub.port,
          backendType: ub.type
        });

        // Find if there's a matching backend for this domain
        const matchingBackend = vizData.nodes.find(n =>
          n.type === 'backend' && n.label.includes(domainSafe)
        );

        if (matchingBackend) {
          // Connect backend to user backend
          vizData.edges.push({
            from: matchingBackend.id,
            to: userBackendId,
            type: 'user_backend'
          });
        }
      });

      return vizData;
    }
  });

  // Calculate node positions
  const calculatePositions = useCallback((nodes, edges) => {
    const positions = {};
    const padding = 80;
    const nodeWidth = 180;
    const nodeHeight = 60;
    const levelGap = 200;

    // Separate by type
    const frontends = nodes.filter(n => n.type === 'frontend');
    const backends = nodes.filter(n => n.type === 'backend');
    const servers = nodes.filter(n => n.type === 'server');
    const listens = nodes.filter(n => n.type === 'listen');
    const userBackends = nodes.filter(n => n.type === 'user_backend');

    // Position frontends on the left
    frontends.forEach((node, i) => {
      positions[node.id] = {
        x: padding,
        y: padding + i * (nodeHeight + 40)
      };
    });

    // Position backends in the middle
    backends.forEach((node, i) => {
      positions[node.id] = {
        x: padding + levelGap,
        y: padding + i * (nodeHeight + 40)
      };
    });

    // Position servers on the right (grouped by backend)
    let serverY = padding;
    backends.forEach(backend => {
      const backendServers = servers.filter(s =>
        edges.some(e => e.from === `backend_${backend.label}` && e.to === s.id)
      );
      backendServers.forEach((server, i) => {
        positions[server.id] = {
          x: padding + levelGap * 2,
          y: serverY
        };
        serverY += nodeHeight + 20;
      });
      if (backendServers.length > 0) {
        serverY += 20;
      }
    });

    // Position user backends on the far right (level 4)
    let userBackendY = padding;
    userBackends.forEach((ub, i) => {
      positions[ub.id] = {
        x: padding + levelGap * 3,
        y: userBackendY
      };
      userBackendY += nodeHeight + 20;
    });

    // Position listen sections below
    const maxY = Math.max(
      frontends.length * (nodeHeight + 40),
      backends.length * (nodeHeight + 40),
      serverY
    ) + padding;

    listens.forEach((node, i) => {
      positions[node.id] = {
        x: padding,
        y: maxY + i * (nodeHeight + 40)
      };

      // Position listen servers
      const listenServers = servers.filter(s =>
        edges.some(e => e.from === `listen_${node.label}` && e.to === s.id)
      );
      listenServers.forEach((server, j) => {
        positions[server.id] = {
          x: padding + levelGap,
          y: maxY + i * (nodeHeight + 40) + j * (nodeHeight + 20)
        };
      });
    });

    return positions;
  }, []);

  // Draw the visualization
  const draw = useCallback(() => {
    if (!canvasRef.current || !data) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { nodes, edges } = data;

    // Set canvas size
    const container = containerRef.current;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }

    // Clear canvas
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    const positions = calculatePositions(nodes, edges);
    const nodeWidth = 180;
    const nodeHeight = 60;

    // Draw edges
    edges.forEach(edge => {
      const from = positions[edge.from];
      const to = positions[edge.to];
      if (!from || !to) return;

      const fromX = from.x + nodeWidth;
      const fromY = from.y + nodeHeight / 2;
      const toX = to.x;
      const toY = to.y + nodeHeight / 2;

      ctx.beginPath();
      ctx.moveTo(fromX, fromY);

      // Bezier curve for smoother lines
      const cpX = (fromX + toX) / 2;
      ctx.bezierCurveTo(cpX, fromY, cpX, toY, toX, toY);

      // Set line style based on type
      if (edge.type === 'default') {
        ctx.strokeStyle = '#22c55e';
        ctx.setLineDash([]);
        ctx.lineWidth = 2;
      } else if (edge.type === 'conditional') {
        ctx.strokeStyle = '#f97316';
        ctx.setLineDash([5, 3]);
        ctx.lineWidth = 2;
      } else if (edge.type === 'user_backend') {
        ctx.strokeStyle = '#a855f7';
        ctx.setLineDash([3, 2]);
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = '#94a3b8';
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
      }

      ctx.stroke();

      // Draw arrow
      const angle = Math.atan2(toY - fromY, toX - cpX);
      const arrowSize = 8;
      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(toX - arrowSize * Math.cos(angle - Math.PI / 6), toY - arrowSize * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(toX - arrowSize * Math.cos(angle + Math.PI / 6), toY - arrowSize * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();

      // Draw label
      if (showLabels && edge.label && edge.type === 'conditional') {
        ctx.font = '10px system-ui';
        ctx.fillStyle = '#6b7280';
        ctx.textAlign = 'center';
        const midX = (fromX + toX) / 2;
        const midY = (fromY + toY) / 2 - 10;
        ctx.fillText(edge.label, midX, midY);
      }
    });

    // Draw nodes
    nodes.forEach(node => {
      const pos = positions[node.id];
      if (!pos) return;

      // Set colors based on type
      let bgColor, borderColor, textColor;
      switch (node.type) {
        case 'frontend':
          bgColor = '#dbeafe';
          borderColor = '#3b82f6';
          textColor = '#1d4ed8';
          break;
        case 'backend':
          bgColor = '#dcfce7';
          borderColor = '#22c55e';
          textColor = '#15803d';
          break;
        case 'server':
          bgColor = '#f3f4f6';
          borderColor = '#9ca3af';
          textColor = '#374151';
          break;
        case 'listen':
          bgColor = '#ffedd5';
          borderColor = '#f97316';
          textColor = '#c2410c';
          break;
        case 'user_backend':
          bgColor = '#fae8ff';
          borderColor = '#a855f7';
          textColor = '#7e22ce';
          break;
        default:
          bgColor = '#f3f4f6';
          borderColor = '#9ca3af';
          textColor = '#374151';
      }

      // Draw node background
      ctx.fillStyle = bgColor;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([]);

      // Rounded rectangle
      const radius = 8;
      ctx.beginPath();
      ctx.moveTo(pos.x + radius, pos.y);
      ctx.lineTo(pos.x + nodeWidth - radius, pos.y);
      ctx.quadraticCurveTo(pos.x + nodeWidth, pos.y, pos.x + nodeWidth, pos.y + radius);
      ctx.lineTo(pos.x + nodeWidth, pos.y + nodeHeight - radius);
      ctx.quadraticCurveTo(pos.x + nodeWidth, pos.y + nodeHeight, pos.x + nodeWidth - radius, pos.y + nodeHeight);
      ctx.lineTo(pos.x + radius, pos.y + nodeHeight);
      ctx.quadraticCurveTo(pos.x, pos.y + nodeHeight, pos.x, pos.y + nodeHeight - radius);
      ctx.lineTo(pos.x, pos.y + radius);
      ctx.quadraticCurveTo(pos.x, pos.y, pos.x + radius, pos.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw type badge
      ctx.font = 'bold 9px system-ui';
      ctx.fillStyle = borderColor;
      ctx.textAlign = 'left';
      ctx.fillText(node.type.toUpperCase(), pos.x + 10, pos.y + 16);

      // Draw label
      ctx.font = 'bold 12px system-ui';
      ctx.fillStyle = textColor;
      ctx.fillText(node.label, pos.x + 10, pos.y + 34);

      // Draw additional info
      ctx.font = '10px system-ui';
      ctx.fillStyle = '#6b7280';
      if (node.type === 'server' && node.address) {
        ctx.fillText(node.address, pos.x + 10, pos.y + 50);
      } else if (node.type === 'user_backend') {
        ctx.fillText(`${node.user} • ${node.host}:${node.port}`, pos.x + 10, pos.y + 50);
      } else if (node.bind?.length > 0) {
        ctx.fillText(node.bind[0], pos.x + 10, pos.y + 50);
      } else if (node.balance) {
        ctx.fillText(`balance: ${node.balance}`, pos.x + 10, pos.y + 50);
      }
    });

    ctx.restore();
  }, [data, zoom, offset, showLabels, calculatePositions]);

  // Draw on data change
  useEffect(() => {
    draw();
  }, [draw]);

  // Handle mouse events for panning
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle zoom
  const handleZoomIn = () => setZoom(z => Math.min(z * 1.2, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z / 1.2, 0.3));
  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 text-center text-red-600">
        Failed to load visualization data. Please try again.
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-180px)] flex flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Link to="/haproxy" className="btn btn-secondary px-3 py-1.5 text-sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`btn btn-secondary px-3 py-1.5 text-sm ${showLabels ? 'bg-primary-100 dark:bg-primary-900/30' : ''}`}
          >
            {showLabels ? <Tag className="w-4 h-4 mr-1" /> : <Tags className="w-4 h-4 mr-1" />}
            Labels
          </button>
          <button onClick={handleZoomOut} className="btn btn-secondary px-3 py-1.5 text-sm">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-500 w-16 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={handleZoomIn} className="btn btn-secondary px-3 py-1.5 text-sm">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={handleReset} className="btn btn-secondary px-3 py-1.5 text-sm">
            <Maximize2 className="w-4 h-4 mr-1" />
            Reset
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-200 border-2 border-blue-500"></div>
          <span>Frontend</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-200 border-2 border-green-500"></div>
          <span>Backend</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-200 border-2 border-gray-400"></div>
          <span>Server</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-orange-200 border-2 border-orange-500"></div>
          <span>Listen</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-purple-200 border-2 border-purple-500"></div>
          <span>User Domain</span>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <div className="w-8 h-0.5 bg-green-500"></div>
          <span>Default route</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-orange-500 border-dashed" style={{ borderStyle: 'dashed' }}></div>
          <span>Conditional route</span>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 card overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
        />
      </div>

      {/* Info */}
      <div className="mt-4 text-sm text-gray-500 dark:text-dark-muted">
        {data?.nodes?.filter(n => n.type === 'frontend').length || 0} frontend(s),
        {' '}{data?.nodes?.filter(n => n.type === 'backend').length || 0} backend(s),
        {' '}{data?.nodes?.filter(n => n.type === 'server').length || 0} server(s)
        {' '}• Drag to pan, use buttons to zoom
      </div>
    </div>
  );
}

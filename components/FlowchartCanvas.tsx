import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AgentNode, type AgentNodeData, type AgentStatus } from './AgentNode';
import {
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid3X3,
} from 'lucide-react';

interface Connection {
  from: string;
  to: string;
  status: 'idle' | 'active' | 'completed';
}

interface FlowchartCanvasProps {
  experimentId?: string;
  onNodeSelect?: (node: AgentNodeData | null) => void;
}

// Demo agent nodes positioned in a flow
const createDemoNodes = (): AgentNodeData[] => [
  {
    id: 'start',
    type: 'planning',
    name: 'Planning Agent',
    status: 'completed',
    duration: 21340,
    tokensUsed: 1823,
    messagesCount: 4,
    details: {
      risk_level: 'R1',
      approval: 'Auto-approved',
      experiments: 3,
    },
    position: { x: 80, y: 120 },
  },
  {
    id: 'design',
    type: 'design',
    name: 'Design Agent',
    status: 'completed',
    duration: 15670,
    tokensUsed: 2105,
    messagesCount: 6,
    details: {
      runs_designed: 12,
      parameters: 8,
      materials: 3,
    },
    position: { x: 420, y: 60 },
  },
  {
    id: 'simulation',
    type: 'simulation',
    name: 'Simulation Agent',
    status: 'running',
    duration: 8450,
    tokensUsed: 1245,
    messagesCount: 3,
    details: {
      simulations: '8/12',
      confidence: '87%',
      model: 'Live Sinter™',
    },
    position: { x: 420, y: 320 },
  },
  {
    id: 'controller',
    type: 'controller',
    name: 'Controller Agent',
    status: 'waiting',
    tokensUsed: 0,
    messagesCount: 0,
    position: { x: 760, y: 180 },
  },
  {
    id: 'analyzer',
    type: 'analyzer',
    name: 'Analyzer Agent',
    status: 'idle',
    tokensUsed: 0,
    messagesCount: 0,
    position: { x: 1100, y: 180 },
  },
];

const createConnections = (): Connection[] => [
  { from: 'start', to: 'design', status: 'completed' },
  { from: 'start', to: 'simulation', status: 'completed' },
  { from: 'design', to: 'controller', status: 'active' },
  { from: 'simulation', to: 'controller', status: 'active' },
  { from: 'controller', to: 'analyzer', status: 'idle' },
];

export function FlowchartCanvas({ experimentId, onNodeSelect }: FlowchartCanvasProps) {
  const [nodes, setNodes] = useState<AgentNodeData[]>(createDemoNodes());
  const [connections] = useState<Connection[]>(createConnections());
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isRunning, setIsRunning] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);
  const lastPanPos = useRef({ x: 0, y: 0 });

  // Simulate workflow progress
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setNodes((prev) => {
        const newNodes = [...prev];
        const simNode = newNodes.find((n) => n.id === 'simulation');
        if (simNode && simNode.status === 'running') {
          simNode.duration = (simNode.duration || 0) + 1000;
          const progress = Math.min(12, Math.floor((simNode.duration || 0) / 3000));
          simNode.details = {
            ...simNode.details,
            simulations: `${progress}/12`,
            confidence: `${Math.min(95, 70 + progress * 2)}%`,
          };

          if (progress >= 12) {
            simNode.status = 'completed';
            const controllerNode = newNodes.find((n) => n.id === 'controller');
            if (controllerNode) {
              controllerNode.status = 'running';
            }
          }
        }

        const controllerNode = newNodes.find((n) => n.id === 'controller');
        if (controllerNode && controllerNode.status === 'running') {
          controllerNode.duration = (controllerNode.duration || 0) + 1000;
          controllerNode.tokensUsed = (controllerNode.tokensUsed || 0) + 50;
          controllerNode.messagesCount = Math.min(8, (controllerNode.messagesCount || 0) + 1);
          controllerNode.details = {
            jobs_queued: Math.min(12, Math.floor((controllerNode.duration || 0) / 2000)),
            printer: 'X25Pro-01',
            status: 'Executing',
          };

          if ((controllerNode.duration || 0) >= 15000) {
            controllerNode.status = 'completed';
            const analyzerNode = newNodes.find((n) => n.id === 'analyzer');
            if (analyzerNode) {
              analyzerNode.status = 'running';
            }
          }
        }

        return newNodes;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const handleNodeClick = (node: AgentNodeData) => {
    setSelectedNode(node.id);
    onNodeSelect?.(node);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('canvas-bg')) {
      setSelectedNode(null);
      onNodeSelect?.(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Allow panning with middle-click, Alt+left-click, or left-click on canvas background
    const target = e.target as HTMLElement;
    const isCanvasBackground = target.classList.contains('canvas-bg') ||
                               target.closest('.canvas-bg') === e.currentTarget;

    if (e.button === 1 || (e.button === 0 && e.altKey) || (e.button === 0 && isCanvasBackground)) {
      setIsPanning(true);
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastPanPos.current.x;
      const dy = e.clientY - lastPanPos.current.y;
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPanPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prev) => Math.max(0.5, Math.min(2, prev + delta)));
    }
  };

  const getConnectionPath = (from: AgentNodeData, to: AgentNodeData): string => {
    const fromX = from.position.x + 280 + 8; // Right edge + connector
    const fromY = from.position.y + 80; // Center height
    const toX = to.position.x - 8; // Left edge - connector
    const toY = to.position.y + 80;

    const midX = (fromX + toX) / 2;

    // Bezier curve for smooth connection
    return `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
  };

  const getConnectionColor = (status: Connection['status']) => {
    switch (status) {
      case 'completed':
        return '#22c55e'; // green-500
      case 'active':
        return '#eab308'; // yellow-500
      default:
        return '#3a3a3a';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0a0a0a] overflow-hidden">
      {/* Toolbar */}
      <div className="h-12 border-b border-[#2a2a2a] flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`p-2 rounded transition-colors ${
              isRunning ? 'bg-green-500/20 text-green-400' : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
            }`}
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setNodes(createDemoNodes())}
            className="p-2 rounded bg-[#2a2a2a] text-gray-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-[#2a2a2a] mx-2" />
          <span className="text-sm text-gray-400">
            {experimentId || 'EXP-2024-1251'} • Fe-Co Alloy Optimization
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
            className="p-2 rounded bg-[#2a2a2a] text-gray-400 hover:text-white transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
            className="p-2 rounded bg-[#2a2a2a] text-gray-400 hover:text-white transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-[#2a2a2a] mx-2" />
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="p-2 rounded bg-[#2a2a2a] text-gray-400 hover:text-white transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button className="p-2 rounded bg-[#2a2a2a] text-gray-400 hover:text-white transition-colors">
            <Grid3X3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing canvas-bg"
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          backgroundImage: `
            radial-gradient(circle at 1px 1px, #2a2a2a 1px, transparent 0)
          `,
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {/* SVG Connections */}
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: '2000px', height: '1000px' }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#3a3a3a" />
              </marker>
              <marker
                id="arrowhead-active"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#eab308" />
              </marker>
              <marker
                id="arrowhead-completed"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
              </marker>
            </defs>

            {connections.map((conn) => {
              const fromNode = nodes.find((n) => n.id === conn.from);
              const toNode = nodes.find((n) => n.id === conn.to);
              if (!fromNode || !toNode) return null;

              const path = getConnectionPath(fromNode, toNode);
              const color = getConnectionColor(conn.status);
              const markerId =
                conn.status === 'completed'
                  ? 'arrowhead-completed'
                  : conn.status === 'active'
                  ? 'arrowhead-active'
                  : 'arrowhead';

              return (
                <g key={`${conn.from}-${conn.to}`}>
                  <path
                    d={path}
                    fill="none"
                    stroke={color}
                    strokeWidth={conn.status === 'active' ? 3 : 2}
                    strokeDasharray={conn.status === 'active' ? '8 4' : 'none'}
                    markerEnd={`url(#${markerId})`}
                    className={conn.status === 'active' ? 'animate-dash' : ''}
                  />
                  {conn.status === 'active' && (
                    <circle r="4" fill={color}>
                      <animateMotion dur="2s" repeatCount="indefinite" path={path} />
                    </circle>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Start Node */}
          <div
            className="absolute w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30"
            style={{ left: 0, top: 140 }}
          >
            <Play className="w-6 h-6 text-white ml-1" />
          </div>

          {/* Agent Nodes */}
          {nodes.map((node) => (
            <AgentNode
              key={node.id}
              data={node}
              isSelected={selectedNode === node.id}
              onClick={() => handleNodeClick(node)}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -24;
          }
        }
        .animate-dash {
          animation: dash 1s linear infinite;
        }
      `}</style>
    </div>
  );
}

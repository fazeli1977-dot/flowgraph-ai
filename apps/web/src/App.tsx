import React, { useState, useCallback, useRef, useMemo } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  Node,
  Edge,
  Connection,
  NodeChange,
  EdgeChange,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import NodePalette from './components/NodePalette';

const NODE_CONFIG: Record<string, { icon: string; defaultColor: string; label: string }> = {
  polars_node: { icon: '⚡', defaultColor: '#38bdf8', label: 'Polars Transform' },
  mass_balance_node: { icon: '⚖️', defaultColor: '#34d399', label: 'Mass Balance' },
  energy_efficiency_node: { icon: '🌱', defaultColor: '#facc15', label: 'Energy Efficiency' },
};

const GenericDpiNode = ({ data, type }: { data: any; type: string }) => {
  const config = NODE_CONFIG[type] || { icon: '🔹', defaultColor: '#818cf8', label: type };

  const statusColor = (() => {
    switch (data.status) {
      case 'success': return '#22c55e';
      case 'running': return '#eab308';
      case 'error': return '#ef4444';
      default: return config.defaultColor;
    }
  })();

  const metrics = data.metrics || {};
  const execTimeMs = metrics.duration_ms != null 
    ? metrics.duration_ms.toFixed(2) 
    : (data.executionTime != null ? (data.executionTime * 1000).toFixed(2) : null);
  const cpuPercent = metrics.cpu_percent != null ? metrics.cpu_percent.toFixed(1) : null;
  const peakRamMb = metrics.peak_memory_mb != null ? metrics.peak_memory_mb.toFixed(1) : null;

  return (
    <div
      style={{
        background: '#131b2e',
        border: `2px solid ${statusColor}`,
        borderRadius: '12px',
        padding: '14px',
        color: '#f8fafc',
        minWidth: '240px',
        boxShadow: `0 8px 24px rgba(0, 0, 0, 0.45)`,
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: statusColor, width: '10px', height: '10px', border: '2px solid #0f172a' }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={{ fontSize: '18px' }}>{config.icon}</span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong style={{ fontSize: '14px', letterSpacing: '0.3px', color: '#f1f5f9' }}>
            {data.label || config.label}
          </strong>
          <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>{type}</span>
        </div>
        <span
          style={{
            marginLeft: 'auto',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: statusColor,
            boxShadow: `0 0 8px ${statusColor}`,
          }}
        />
      </div>

      <div style={{ background: '#0b111e', padding: '10px', borderRadius: '8px', fontSize: '12px' }}>
        {data.operation && (
          <div style={{ color: '#94a3b8', marginBottom: '4px' }}>
            Op: <span style={{ color: config.defaultColor, fontWeight: 600 }}>{data.operation}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '6px' }}>
          <div style={{ color: '#64748b', fontSize: '11px' }}>
            ⏱️ <span style={{ color: '#cbd5e1' }}>{execTimeMs ? `${execTimeMs}ms` : '--'}</span>
          </div>
          <div style={{ color: '#64748b', fontSize: '11px' }}>
            📊 <span style={{ color: '#cbd5e1' }}>{cpuPercent ? `${cpuPercent}% CPU` : '--'}</span>
          </div>
          <div style={{ color: '#64748b', fontSize: '11px' }}>
            💾 <span style={{ color: '#cbd5e1' }}>{peakRamMb ? `${peakRamMb}MB` : '--'}</span>
          </div>
          {data.rows != null && (
            <div style={{ color: '#64748b', fontSize: '11px' }}>
              📑 <span style={{ color: '#cbd5e1' }}>{data.rows} rows</span>
            </div>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: statusColor, width: '10px', height: '10px', border: '2px solid #0f172a' }}
      />
    </div>
  );
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'polars_node',
    position: { x: 250, y: 50 },
    data: { label: 'Polars Inflow', operation: 'filter' },
  },
  {
    id: '2',
    type: 'mass_balance_node',
    position: { x: 230, y: 240 },
    data: { label: 'Mass Balance Analyzer', operation: 'mass_balance' },
  },
];

const initialEdges: Edge[] = [{ id: 'e1-2', source: '1', target: '2', animated: true }];

function FlowEditor() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const { screenToFlowPosition } = useReactFlow();

  const nodeTypes = useMemo(
    () => ({
      polars_node: (props: any) => <GenericDpiNode {...props} type="polars_node" />,
      mass_balance_node: (props: any) => <GenericDpiNode {...props} type="mass_balance_node" />,
      energy_efficiency_node: (props: any) => <GenericDpiNode {...props} type="energy_efficiency_node" />,
    }),
    []
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, animated: true }, eds)),
    []
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData('application/reactflow');
      if (!nodeType) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const nextId = `${nodes.length + 1}`;
      const conf = NODE_CONFIG[nodeType];
      const newNode: Node = {
        id: nextId,
        type: nodeType,
        position,
        data: {
          label: conf ? `${conf.label} #${nextId}` : `${nodeType} #${nextId}`,
          operation: nodeType === 'polars_node' ? 'filter' : nodeType,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [nodes, screenToFlowPosition]
  );

  const handleRunPipeline = async () => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, status: 'running' },
      }))
    );
    setIsRunning(true);

    const payload = {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type || 'polars_node',
        data: {
          operation: n.data?.operation || 'filter',
          params: n.data?.params || {},
        },
      })),
      edges: edges.map((e) => ({
        source: e.source,
        target: e.target,
      })),
    };

    try {
      const response = await fetch('/api/v1/graph/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[DPI Pipeline] Execution Success:', result);

            const nodeOutputs = result?.results ?? result?.result?.node_outputs ?? {};
      const globalDurationMs = result?.total_duration_ms ?? result?.duration_ms ?? result?.execution_time_ms ?? null;

      setNodes((nds) =>
        nds.map((node) => {
          const outputs = nodeOutputs[node.id];
          const nodeMetrics = outputs?.metrics || {};
          const executionTime =
            nodeMetrics.duration_ms != null
              ? nodeMetrics.duration_ms / 1000
              : globalDurationMs != null
              ? globalDurationMs / 1000
              : node.data.executionTime ?? 0;

          return {
            ...node,
            data: {
              ...node.data,
              status: (outputs?.status === 'error' || outputs?.status === 'failed') ? 'error' : 'success',
              executionTime,
              metrics: nodeMetrics,
              rows: outputs?.output_rows ?? outputs?.row_count ?? outputs?.rows ?? node.data.rows,
              result: outputs?.result ?? outputs?.outputs ?? node.data.result,
            },
          };
        })
      );
    } catch (err) {
      console.error('[DPI Pipeline] Execution Error:', err);
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: { ...n.data, status: 'error' },
        }))
      );
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#0b0f19', color: '#f8fafc' }}>
      <NodePalette />
      <div style={{ flex: 1, position: 'relative' }} ref={reactFlowWrapper}>
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            padding: '8px 16px',
            borderRadius: '12px',
            border: '1px solid #1e293b',
          }}
        >
          <button
            onClick={handleRunPipeline}
            disabled={isRunning}
            style={{
              background: isRunning ? '#0284c7' : '#0284c7',
              color: '#fff',
              border: 'none',
              padding: '8px 18px',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: isRunning ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)',
              transition: 'all 0.2s',
            }}
          >
            <span>{isRunning ? '⏳' : '▶'}</span>
            {isRunning ? 'Running...' : 'Run Pipeline'}
          </button>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>
            Nodes: {nodes.length} | Edges: {edges.length}
          </span>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background color="#1e293b" gap={16} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <FlowEditor />
    </ReactFlowProvider>
  );
}




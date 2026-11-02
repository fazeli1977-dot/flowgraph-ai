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

const CustomPolarsNode = ({ data }: { data: any }) => {
  return (
    <div
      style={{
        background: '#1a2234',
        border: '2px solid #38bdf8',
        borderRadius: '12px',
        padding: '16px',
        color: '#f8fafc',
        minWidth: '220px',
        boxShadow: '0 8px 24px rgba(56, 189, 248, 0.25)',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#38bdf8', width: '12px', height: '12px' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '18px' }}>⚡</span>
        <strong style={{ fontSize: '16px', letterSpacing: '0.5px' }}>{data.label}</strong>
        <span
          style={{
            marginLeft: 'auto',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: data.status === 'success' ? '#22c55e' : data.status === 'running' ? '#eab308' : '#38bdf8',
          }}
        />
      </div>
      <div style={{ background: '#0f172a', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
        <div style={{ color: '#94a3b8' }}>Op: <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{data.operation || 'filter'}</span></div>
        <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>Time: {data.executionTime ? `${(data.executionTime * 1000).toFixed(2)}ms` : '12.50ms'}</div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#38bdf8', width: '12px', height: '12px' }} />
    </div>
  );
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'polars_node',
    position: { x: 250, y: 50 },
    data: { label: 'polars_node #1', operation: 'filter' },
  },
  {
    id: '2',
    type: 'polars_node',
    position: { x: 200, y: 250 },
    data: { label: 'polars_node #2', operation: 'filter' },
  },
];

const initialEdges: Edge[] = [{ id: 'e1-2', source: '1', target: '2', animated: true }];

function FlowEditor() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const { screenToFlowPosition } = useReactFlow();

  const nodeTypes = useMemo(() => ({ polars_node: CustomPolarsNode }), []);

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

      const newNode: Node = {
        id: `${nodes.length + 1}`,
        type: nodeType,
        position,
        data: { label: `${nodeType} #${nodes.length + 1}`, operation: 'filter' },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [nodes, screenToFlowPosition]
  );

  const handleRunPipeline = async () => {
    setIsRunning(true);
    console.log('[DPI Pipeline] Starting execution with nodes:', nodes, 'edges:', edges);

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
      const response = await fetch('http://127.0.0.1:8001/api/v1/graph/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log('[DPI Pipeline] Execution Success:', result);

      if (result.status === 'success' && result.result?.node_outputs) {
        setNodes((nds) =>
          nds.map((node) => ({
            ...node,
            data: {
              ...node.data,
              status: 'success',
              executionTime: result.result.execution_time,
            },
          }))
        );
      }
    } catch (err) {
      console.error('[DPI Pipeline] Execution Error:', err);
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

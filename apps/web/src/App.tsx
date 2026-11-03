import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { PolarsNode } from './components/PolarsNode';
import NodePalette, { CatalogNodeItem } from './components/NodePalette';
import { NodeConfigPanel } from './components/NodeConfigPanel';
import * as nodesApiModule from './services/nodesApi';

const nodeTypes = {
  polars_node: PolarsNode,
  mass_balance_node: PolarsNode,
  energy_efficiency_node: PolarsNode,
};

const initialNodes: Node[] = [
  {
    id: 'source-1',
    type: 'polars_node',
    position: { x: 100, y: 150 },
    data: { label: 'CSV / Inflow Data', operation: 'scan_csv', params: { file: 'stream_data.csv' } },
  },
  {
    id: 'process-1',
    type: 'mass_balance_node',
    position: { x: 450, y: 150 },
    data: { label: 'Civil Mass Balancer', operation: 'mass_balance', params: { retention_time: 4.5 } },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: 'source-1', target: 'process-1', animated: true, style: { stroke: '#89b4fa', strokeWidth: 2 } },
];

function FlowCanvas() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [catalog, setCatalog] = useState<CatalogNodeItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState<boolean>(true);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [runLogs, setRunLogs] = useState<string>('Ready for execution.');

  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    async function loadCatalog() {
      try {
        setLoadingCatalog(true);
        // Universal fetch handler covering both default & named export variants
        const apiAny = nodesApiModule as Record<string, unknown>;
        const fetchFn = (apiAny.fetchRegisteredNodes || apiAny.fetchNodeTypes || apiAny.default) as (() => Promise<unknown>) | undefined;

        if (typeof fetchFn === 'function') {
          const res = (await fetchFn()) as { catalog?: CatalogNodeItem[]; nodes?: string[] } | string[];
          if (Array.isArray(res)) {
            setCatalog(res.map((n) => ({
              id: n,
              name: n.replace(/_/g, ' ').toUpperCase(),
              category: 'Engine',
              description: 'Registered processing node',
            })));
          } else if (res && res.catalog) {
            setCatalog(res.catalog);
          } else if (res && res.nodes) {
            setCatalog(res.nodes.map((n) => ({
              id: n,
              name: n.replace(/_/g, ' ').toUpperCase(),
              category: 'Engine',
              description: 'Registered backend node',
            })));
          }
        }
      } catch (err) {
        console.error('Failed to load node catalog:', err);
      } finally {
        setLoadingCatalog(false);
      }
    }
    loadCatalog();
  }, []);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#89b4fa', strokeWidth: 2 } }, eds)),
    []
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

      const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData('application/reactflow');
      if (!nodeType || !screenToFlowPosition) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const uniqueSuffix = Math.random().toString(36).substring(2, 6);
      const newNodeId = `${nodeType}-${uniqueSuffix}`;

      const newNode: Node = {
        id: newNodeId,
        type: nodeType,
        position,
        data: {
          label: `${nodeType.replace(/_/g, ' ')}`,
          operation: 'process',
          params: {},
        },
      };

      setNodes((nds) => nds.concat(newNode));
      setSelectedNode(newNode);
    },
    [screenToFlowPosition]
  );

  const handleRunPipeline = async () => {
    setIsRunning(true);
    setRunLogs('Compiling graph execution payload...');

    const payload = {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type || 'polars_node',
        params: n.data?.params || {},
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
        throw new Error(`Execution error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setRunLogs(JSON.stringify(data, null, 2));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setRunLogs(`Failed to run pipeline: ${message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleUpdateNodeParams = (nodeId: string, newParams: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              params: newParams,
            },
          };
        }
        return node;
      })
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: '#1e1e2e' }}>
      <header style={{
        height: '52px',
        backgroundColor: '#11111b',
        borderBottom: '1px solid #313244',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        color: '#cdd6f4'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#a6e3a1' }} />
          <strong style={{ fontSize: '16px', letterSpacing: '0.8px', color: '#cba6f7' }}>FLOWGRAPH AI</strong>
          <span style={{ fontSize: '11px', color: '#6c7086', borderLeft: '1px solid #45475a', paddingLeft: '10px' }}>
            Data-Path Intelligence / Civil & Environmental
          </span>
        </div>
        <button
          onClick={handleRunPipeline}
          disabled={isRunning}
          style={{
            backgroundColor: isRunning ? '#45475a' : '#89b4fa',
            color: '#11111b',
            border: 'none',
            padding: '8px 18px',
            borderRadius: '6px',
            fontWeight: 700,
            cursor: isRunning ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          {isRunning ? 'Executing...' : 'Run Pipeline'}
        </button>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <NodePalette catalog={catalog} isLoading={loadingCatalog} />

        <main style={{ flex: 1, width: '100%', height: '100%', position: 'relative' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            fitView
          >
            <Background color="#313244" gap={16} variant={BackgroundVariant.Dots} />
            <Controls style={{ backgroundColor: '#181825', borderColor: '#313244' }} />
          </ReactFlow>
        </main>

        <NodeConfigPanel
          selectedNode={selectedNode}
          onUpdateParams={handleUpdateNodeParams}
        />
      </div>

      <footer style={{
        height: '42px',
        backgroundColor: '#11111b',
        borderTop: '1px solid #313244',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        fontSize: '12px',
        color: '#a6adc8',
        fontFamily: 'monospace'
      }}>
        <span style={{ color: '#89b4fa', marginRight: '8px' }}>[Console]:</span>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {runLogs}
        </span>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}

import React, { useState, useCallback, useRef } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';
import { NodePalette } from './components/NodePalette';
import { PolarsNode } from './components/PolarsNode';

const nodeTypes = {
  polars_node: PolarsNode,
};

const initialNodes: Node[] = [
  {
    id: 'source-1',
    type: 'polars_node',
    position: { x: 50, y: 120 },
    data: { label: 'CSV / Inflow Data', nodeType: 'scan_csv' }
  },
  {
    id: 'process-1',
    type: 'polars_node',
    position: { x: 420, y: 120 },
    data: { label: 'Civil Mass Balancer', nodeType: 'mass_balance' }
  }
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: 'source-1', target: 'process-1', animated: true }
];

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'metrics' | 'data' | 'json'>('data');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('source-1');
  const [isConsoleOpen, setIsConsoleOpen] = useState(true);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  const handleRunPipeline = async () => {
    setIsRunning(true);
    setIsConsoleOpen(true);
    try {
      const payload = {
        nodes: nodes.map(n => ({
          id: n.id,
          type: (n.data?.nodeType as string) || (n.data?.label as string) || 'polars_node',
          params: n.data || {}
        })),
        edges: edges.map(e => ({
          source: e.source,
          target: e.target
        }))
      };

      const res = await fetch('/api/v1/graph/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Execution error: ${res.statusText}`);
      }

      const data = await res.json();
      setExecutionResult(data);

      // Map backend execution results to node state for inspector preview
      const results = data.results ?? {};
      setNodes((nds) =>
        nds.map((node) => {
          const nodeRes = results[node.id];
          return {
            ...node,
            data: {
              ...node.data,
              status: nodeRes ? 'success' : node.data.status,
              executionTime: nodeRes?.duration_ms,
              rows: nodeRes?.output_rows,
              preview: nodeRes?.preview ?? [],
              result: nodeRes
            }
          };
        })
      );

      if (nodes.length > 0) {
        setSelectedNodeId(nodes[0].id);
      }
    } catch (err: any) {
      setExecutionResult({
        status: 'error',
        error: err.message || 'Unknown network error'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedNodeData = selectedNode?.data?.preview;

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0d1117', color: '#c9d1d9', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Top Header */}
      <header style={{
        height: '52px',
        borderBottom: '1px solid #30363d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        backgroundColor: '#161b22',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#2ea043', boxShadow: '0 0 8px #2ea043' }} />
          <h1 style={{ fontSize: '15px', fontWeight: 700, margin: 0, letterSpacing: '0.5px', color: '#f0f6fc' }}>
            FLOWGRAPH AI <span style={{ fontWeight: 400, color: '#8b949e', fontSize: '12px', marginLeft: '6px' }}>| Data-Path Intelligence / Civil & Environmental</span>
          </h1>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleRunPipeline}
            disabled={isRunning}
            style={{
              backgroundColor: isRunning ? '#238636aa' : '#238636',
              color: '#ffffff',
              border: 'none',
              padding: '6px 18px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: isRunning ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              transition: 'background-color 0.2s'
            }}
          >
            {isRunning ? 'Executing...' : '▶ Run Pipeline'}
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        <NodePalette />
        
        <div ref={reactFlowWrapper} style={{ flex: 1, height: '100%', position: 'relative' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            fitView
            style={{ backgroundColor: '#0d1117' }}
          >
            <Controls style={{ backgroundColor: '#21262d', border: '1px solid #30363d', borderRadius: '6px' }} />
            <MiniMap style={{ backgroundColor: '#161b22', border: '1px solid #30363d' }} nodeColor={() => '#58a6ff'} />
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#30363d" />
          </ReactFlow>
        </div>
      </div>

      {/* Bottom Engineering Console & Data Inspector */}
      <div style={{
        borderTop: '1px solid #30363d',
        backgroundColor: '#161b22',
        display: 'flex',
        flexDirection: 'column',
        height: isConsoleOpen ? '260px' : '36px',
        transition: 'height 0.25s ease-in-out',
        zIndex: 20
      }}>
        {/* Drawer Bar */}
        <div style={{
          height: '36px',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: isConsoleOpen ? '1px solid #30363d' : 'none',
          backgroundColor: '#1c2128'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#58a6ff' }}>[Console & Data Inspector]:</span>
            <span style={{ fontSize: '11px', color: executionResult?.status === 'success' ? '#3fb950' : '#8b949e' }}>
              {executionResult ? (executionResult.status === 'success' ? `Execution finished (${executionResult.total_duration_ms} ms)` : 'Execution Failed') : 'Pipeline idle'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isConsoleOpen && (
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => setActiveTab('data')}
                  style={{
                    backgroundColor: activeTab === 'data' ? '#30363d' : 'transparent',
                    border: 'none',
                    color: activeTab === 'data' ? '#58a6ff' : '#8b949e',
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  📊 Data Preview
                </button>
                <button
                  onClick={() => setActiveTab('metrics')}
                  style={{
                    backgroundColor: activeTab === 'metrics' ? '#30363d' : 'transparent',
                    border: 'none',
                    color: activeTab === 'metrics' ? '#58a6ff' : '#8b949e',
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  ⚡ Metrics
                </button>
                <button
                  onClick={() => setActiveTab('json')}
                  style={{
                    backgroundColor: activeTab === 'json' ? '#30363d' : 'transparent',
                    border: 'none',
                    color: activeTab === 'json' ? '#58a6ff' : '#8b949e',
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {'{ }'} Raw JSON
                </button>
              </div>
            )}
            <button
              onClick={() => setIsConsoleOpen(!isConsoleOpen)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#8b949e',
                cursor: 'pointer',
                fontSize: '11px',
                padding: '2px 6px'
              }}
            >
              {isConsoleOpen ? 'Collapse ▼' : 'Expand ▲'}
            </button>
          </div>
        </div>

        {/* Console Body Content */}
        {isConsoleOpen && (
          <div style={{ flex: 1, padding: '12px 16px', overflowY: 'auto', fontSize: '12px' }}>
            {!executionResult && (
              <div style={{ color: '#8b949e', fontStyle: 'italic', paddingTop: '20px', textAlign: 'center' }}>
                Run the pipeline to inspect Polars DataFrames and hydraulic mass balances.
              </div>
            )}

            {executionResult && activeTab === 'data' && (
              <div>
                {/* Node Selector Tabs */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#8b949e', textTransform: 'uppercase' }}>Select Output:</span>
                    {nodes.map(n => (
                      <button
                        key={n.id}
                        onClick={() => setSelectedNodeId(n.id)}
                        style={{
                          backgroundColor: selectedNodeId === n.id ? '#1f6feb' : '#21262d',
                          color: '#ffffff',
                          border: '1px solid #30363d',
                          borderRadius: '4px',
                          padding: '3px 10px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontWeight: selectedNodeId === n.id ? 600 : 400
                        }}
                      >
                        {n.data?.label || n.id}
                      </button>
                    ))}
                  </div>

                  {selectedNodeData && selectedNodeData.length > 0 && (
                    <div style={{ fontSize: '11px', color: '#8b949e', display: 'flex', gap: '14px' }}>
                      <span>Rows: <strong style={{ color: '#79c0ff' }}>{selectedNodeData.length.toLocaleString()}</strong></span>
                      <span>Columns: <strong style={{ color: '#79c0ff' }}>{Object.keys(selectedNodeData[0]).length}</strong></span>
                    </div>
                  )}
                </div>

                {/* Data Table */}
                {selectedNodeData && selectedNodeData.length > 0 ? (
                  <div style={{ overflowX: 'auto', border: '1px solid #30363d', borderRadius: '4px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#21262d', borderBottom: '1px solid #30363d' }}>
                          {Object.keys(selectedNodeData[0]).map((col) => (
                            <th key={col} style={{ padding: '6px 12px', fontWeight: 600, color: '#f0f6fc' }}>
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedNodeData.map((row, rIdx) => (
                          <tr key={rIdx} style={{ borderBottom: '1px solid #21262d', backgroundColor: rIdx % 2 === 0 ? '#161b22' : '#0d1117' }}>
                            {Object.keys(selectedNodeData[0]).map((col, cIdx) => (
                              <td key={col} style={{ padding: '5px 12px', fontFamily: 'monospace', color: '#c9d1d9' }}>
                                {row[col] != null ? (typeof row[col] === 'number' ? row[col].toLocaleString() : String(row[col])) : '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ color: '#8b949e' }}>No table preview available for this node.</div>
                )}
              </div>
            )}

            {executionResult && activeTab === 'metrics' && (
              <div>
                <div style={{ display: 'flex', gap: '18px', marginBottom: '14px' }}>
                  <div>Status: <span style={{ color: '#3fb950', fontWeight: 600 }}>{executionResult.status}</span></div>
                  <div>Total Duration: <span style={{ color: '#58a6ff', fontWeight: 600 }}>{executionResult.total_duration_ms} ms</span></div>
                  <div>Nodes Evaluated: <span style={{ color: '#f0f6fc', fontWeight: 600 }}>{executionResult.nodes_evaluated}</span></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                  {Object.entries(executionResult.results || {}).map(([id, info]: [string, any]) => (
                    <div key={id} style={{ backgroundColor: '#21262d', padding: '10px', borderRadius: '6px', border: '1px solid #30363d' }}>
                      <div style={{ fontWeight: 600, color: '#d2a8ff' }}>Node ID: {id}</div>
                      <div style={{ fontSize: '11px', color: '#8b949e', marginTop: '4px' }}>Type: {info.type}</div>
                      <div style={{ fontSize: '11px', color: '#79c0ff', marginTop: '2px' }}>Duration: {info.duration_ms} ms</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {executionResult && activeTab === 'json' && (
              <pre style={{ margin: 0, padding: '10px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '4px', overflowX: 'auto', fontSize: '11px', color: '#7ee787', fontFamily: 'monospace' }}>
                {JSON.stringify(executionResult, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

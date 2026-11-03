import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';

import { PolarsNode } from './components/PolarsNode';
import { NodePalette } from './components/NodePalette';
import { NodeConfigPanel } from './components/NodeConfigPanel';
import { DataInspector } from './components/DataInspector';

const nodeTypes = {
  polars_node: PolarsNode,
  mass_balance_node: PolarsNode,
  aeration_basin_node: PolarsNode,
  sedimentation_node: PolarsNode,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'polars_node',
    position: { x: 250, y: 150 },
    data: {
      label: 'polars_node #1',
      config: { expression: 'col("flow_rate") * 1.2' },
      status: 'idle'
    }
  },
  {
    id: '2',
    type: 'polars_node',
    position: { x: 550, y: 150 },
    data: {
      label: 'polars_node #2',
      config: { expression: 'col("bod_in") * 0.1' },
      status: 'idle'
    }
  }
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true }
];

export const App: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    // انتخاب را با کلیک روی پس‌زمینه لغو نمی‌کنیم تا جدول باز بماند یا کاربر دستی ببندد
  }, []);

  const handleAddNode = (type: string, label: string) => {
    const id = `${nodes.length + 1}`;
    const newNode: Node = {
      id,
      type: 'polars_node',
      position: { x: 300 + (nodes.length * 30), y: 180 + (nodes.length * 20) },
      data: {
        label: `${label} #${id}`,
        node_type: type,
        config: {},
        status: 'idle'
      }
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const handleRunPipeline = async () => {
    setIsRunning(true);
    try {
      const graphPayload = {
        graph_id: "pipe_" + Date.now(),
        nodes: nodes.map(n => ({
          id: n.id,
          type: n.data.node_type || n.type || "polars_node",
          config: n.data.config || {}
        })),
        edges: edges.map(e => ({
          source: e.source,
          target: e.target
        }))
      };

      const response = await fetch('http://127.0.0.1:8001/api/v1/graph/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(graphPayload)
      });

      if (!response.ok) {
        throw new Error(`Execution failed: ${response.statusText}`);
      }

      const result = await response.json();
      const nodeMetrics = result.node_metrics || {};

      setNodes((nds) =>
        nds.map((node) => {
          const metrics = nodeMetrics[node.id];
          if (metrics) {
            return {
              ...node,
              data: {
                ...node.data,
                status: metrics.status || 'success',
                outputs: {
                  ...metrics.outputs,
                  duration_ms: metrics.outputs?.duration_ms ?? metrics.duration_ms,
                  output_rows: metrics.outputs?.output_rows ?? metrics.outputs?.row_count ?? metrics.outputs?.rows ?? 0,
                  preview: metrics.outputs?.preview ?? [
                    { step: 1, parameter: "COD", value: 240, status: "OK" },
                    { step: 2, parameter: "BOD5", value: 120, status: "OK" },
                    { step: 3, parameter: "TSS", value: 180, status: "Optimal" }
                  ]
                }
              }
            };
          }
          return node;
        })
      );
    } catch (err) {
      console.error("Pipeline run error:", err);
    } finally {
      setIsRunning(false);
    }
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', backgroundColor: '#090d16', overflow: 'hidden' }}>
      <NodePalette onAddNode={handleAddNode} />

      <div style={{ flex: 1, position: 'relative', height: '100%' }}>
        {/* Top Control Header */}
        <div style={{
          position: 'absolute',
          top: 16,
          right: 20,
          zIndex: 10,
          display: 'flex',
          gap: '12px',
          alignItems: 'center'
        }}>
          <button
            onClick={handleRunPipeline}
            disabled={isRunning}
            style={{
              padding: '10px 20px',
              backgroundColor: isRunning ? '#475569' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            {isRunning ? '⚡ Executing...' : '▶ Run Pipeline'}
          </button>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background color="#1e293b" gap={20} variant={BackgroundVariant.Dots} />
          <Controls style={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
          <MiniMap nodeColor="#3b82f6" maskColor="rgba(15, 23, 42, 0.7)" style={{ backgroundColor: '#0f172a' }} />
        </ReactFlow>

        {/* Bottom Data Preview Drawer */}
        <DataInspector
          nodeId={selectedNodeId}
          nodeData={selectedNode?.data}
          onClose={() => setSelectedNodeId(null)}
        />
      </div>
    </div>
  );
};

export default App;

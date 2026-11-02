import React from 'react';
import type { Node } from 'reactflow';

interface NodeConfigPanelProps {
  selectedNode: Node | null;
  onUpdateNodeData: (id: string, updatedData: Record<string, unknown>) => void;
  onClose: () => void;
}

export const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({
  selectedNode,
  onUpdateNodeData,
  onClose,
}) => {
  if (!selectedNode) return null;

  const data = (selectedNode.data || {}) as Record<string, unknown>;

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        right: 20,
        width: 280,
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: 8,
        padding: 16,
        color: '#f8fafc',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        zIndex: 20,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h4 style={{ margin: 0, fontSize: 14 }}>Node Inspector</h4>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Node ID</label>
        <input
          disabled
          value={selectedNode.id}
          style={{ width: '100%', padding: '6px 8px', background: '#0f172a', border: '1px solid #334155', borderRadius: 4, color: '#64748b', fontSize: 12 }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Label</label>
        <input
          value={(data.label as string) || ''}
          onChange={(e) => onUpdateNodeData(selectedNode.id, { ...data, label: e.target.value })}
          style={{ width: '100%', padding: '6px 8px', background: '#0f172a', border: '1px solid #334155', borderRadius: 4, color: '#f8fafc', fontSize: 12 }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Polars Operation</label>
        <select
          value={(data.operation as string) || 'filter'}
          onChange={(e) => onUpdateNodeData(selectedNode.id, { ...data, operation: e.target.value })}
          style={{ width: '100%', padding: '6px 8px', background: '#0f172a', border: '1px solid #334155', borderRadius: 4, color: '#f8fafc', fontSize: 12 }}
        >
          <option value="csv_reader">CSV Reader</option>
          <option value="filter">Filter</option>
          <option value="select">Select Columns</option>
          <option value="groupby">Group By & Agg</option>
          <option value="sort">Sort</option>
        </select>
      </div>
    </div>
  );
};

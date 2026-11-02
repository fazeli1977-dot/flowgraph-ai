import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';

export interface PolarsNodeData {
  label: string;
  operation?: string;
  status?: 'idle' | 'running' | 'success' | 'error';
  executionTime?: number;
  config?: Record<string, unknown>;
}

export const PolarsNode = memo(({ data, selected }: NodeProps<PolarsNodeData>) => {
  const statusColors = {
    idle: '#475569',
    running: '#3b82f6',
    success: '#10b981',
    error: '#ef4444',
  };

  const currentStatus = data.status || 'idle';

  return (
    <div
      style={{
        padding: '12px 16px',
        borderRadius: '10px',
        background: '#1e293b',
        border: selected ? '2px solid #38bdf8' : '1px solid #334155',
        boxShadow: selected ? '0 0 15px rgba(56, 189, 248, 0.35)' : '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
        minWidth: '190px',
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '13px',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#38bdf8', width: 9, height: 9, borderRadius: '50%' }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px' }}>⚡</span>
          <strong style={{ fontSize: '13px', letterSpacing: '0.3px' }}>{data.label}</strong>
        </div>
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: statusColors[currentStatus],
            boxShadow: currentStatus === 'running' ? '0 0 8px #3b82f6' : 'none',
          }}
          title={currentStatus}
        />
      </div>

      <div style={{ fontSize: '11px', color: '#94a3b8', background: '#0f172a', padding: '5px 8px', borderRadius: '6px' }}>
        <div>Op: <span style={{ color: '#38bdf8' }}>{data.operation || 'polars_dataframe'}</span></div>
        {data.executionTime !== undefined && (
          <div style={{ marginTop: '2px', fontSize: '10px', color: '#64748b' }}>
            Time: {data.executionTime.toFixed(2)}ms
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#10b981', width: 9, height: 9, borderRadius: '50%' }}
      />
    </div>
  );
});

PolarsNode.displayName = 'PolarsNode';

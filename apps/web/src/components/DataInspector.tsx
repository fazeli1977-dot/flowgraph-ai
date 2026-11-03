import React from 'react';

interface DataInspectorProps {
  nodeId: string | null;
  nodeData: any;
  onClose: () => void;
}

export const DataInspector: React.FC<DataInspectorProps> = ({ nodeId, nodeData, onClose }) => {
  if (!nodeId || !nodeData) return null;

  const outputs = nodeData.outputs || {};
  const preview = outputs.preview || [];
  const columns = preview.length > 0 ? Object.keys(preview[0]) : [];
  const rowCount = outputs.output_rows ?? outputs.row_count ?? outputs.rows ?? 0;
  const duration = outputs.duration_ms ?? nodeData.duration_ms ?? null;

  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '240px',
      backgroundColor: '#0f172a',
      borderTop: '2px solid #3b82f6',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        backgroundColor: '#1e293b',
        borderBottom: '1px solid #334155'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: '13px' }}>
            📊 DATA INSPECTOR:
          </span>
          <span style={{ color: '#f8fafc', fontWeight: 600, fontSize: '13px' }}>
            {nodeData.label || nodeId}
          </span>
          <span style={{
            fontSize: '11px',
            backgroundColor: '#334155',
            color: '#94a3b8',
            padding: '2px 8px',
            borderRadius: '10px'
          }}>
            {rowCount} rows
          </span>
          {duration !== null && (
            <span style={{
              fontSize: '11px',
              backgroundColor: '#064e3b',
              color: '#34d399',
              padding: '2px 8px',
              borderRadius: '10px'
            }}>
              ⚡ {duration} ms
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            fontSize: '16px',
            cursor: 'pointer',
            padding: '2px 6px'
          }}
          title="Close Inspector"
        >
          ✕
        </button>
      </div>

      {/* Table Content Area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
        {preview.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#64748b',
            fontSize: '13px'
          }}>
            No tabular preview data available for this node execution.
          </div>
        ) : (
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '12px',
            textAlign: 'left'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#1e293b', color: '#94a3b8' }}>
                <th style={{ padding: '6px 10px', borderBottom: '1px solid #334155' }}>#</th>
                {columns.map(col => (
                  <th key={col} style={{ padding: '6px 10px', borderBottom: '1px solid #334155', color: '#38bdf8' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row: any, idx: number) => (
                <tr key={idx} style={{
                  borderBottom: '1px solid #1e293b',
                  backgroundColor: idx % 2 === 0 ? '#0f172a' : '#141e33'
                }}>
                  <td style={{ padding: '6px 10px', color: '#64748b' }}>{idx + 1}</td>
                  {columns.map(col => (
                    <td key={col} style={{ padding: '6px 10px', color: '#e2e8f0' }}>
                      {typeof row[col] === 'number' ? row[col].toLocaleString() : String(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

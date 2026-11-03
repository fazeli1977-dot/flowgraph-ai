import React from 'react';

export interface NodeConfigPanelProps {
  selectedNode: any;
  onUpdateParams?: (nodeId: string, newParams: Record<string, unknown>) => void;
  onClose?: () => void;
}

export const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({
  selectedNode,
  onUpdateParams,
  onClose,
}) => {
  if (!selectedNode) return null;

  const { id, data } = selectedNode;
  const operation = data?.operation || 'scan_csv';
  const params = data?.params || {};
  const result = data?.result;

  // Extract preview data for dynamic table rendering
  const preview: Record<string, any>[] = Array.isArray(result?.preview) ? result.preview : [];
  const columns = preview.length > 0 ? Object.keys(preview[0]) : [];

  const handleInputChange = (key: string, value: any) => {
    if (onUpdateParams) {
      onUpdateParams(id, {
        ...params,
        [key]: value,
      });
    }
  };

  return (
    <aside
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        width: 340,
        backgroundColor: '#111827',
        border: '1px solid #1f2937',
        borderRadius: 10,
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161e2e' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase' }}>Node Inspector</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f3f4f6' }}>{data?.label || operation}</div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 16 }}>✕</button>
        )}
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ fontSize: 10, background: '#1f2937', color: '#94a3b8', padding: '2px 6px', borderRadius: 4 }}>ID: {id}</span>
          <span style={{ fontSize: 10, background: '#064e3b', color: '#34d399', padding: '2px 6px', borderRadius: 4 }}>OP: {operation}</span>
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#93c5fd', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
            Parameters
          </label>
          {operation === 'scan_csv' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 11, color: '#9ca3af' }}>Inflow Rate (m³/day)</label>
              <input
                type="number"
                value={params.inflow_rate ?? 12500}
                onChange={(e) => handleInputChange('inflow_rate', parseFloat(e.target.value) || 0)}
                style={inputStyle}
              />
            </div>
          )}
          {operation === 'mass_balance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 11, color: '#9ca3af' }}>Split Ratio (0.0 - 1.0)</label>
              <input
                type="number"
                step="0.05"
                value={params.split_ratio ?? 0.65}
                onChange={(e) => handleInputChange('split_ratio', parseFloat(e.target.value) || 0)}
                style={inputStyle}
              />
            </div>
          )}
          {operation !== 'scan_csv' && operation !== 'mass_balance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 11, color: '#9ca3af' }}>Expression / Formula</label>
              <input
                type="text"
                value={params.expr ?? 'col("*")'}
                onChange={(e) => handleInputChange('expr', e.target.value)}
                style={inputStyle}
              />
            </div>
          )}
        </div>

        {/* Data Preview Table */}
        <div style={{ borderTop: '1px solid #1f2937', paddingTop: 10 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#34d399', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Data Preview
          </label>
          {preview.length > 0 && columns.length > 0 ? (
            <div style={{ overflowX: 'auto', border: '1px solid #374151', borderRadius: 6, backgroundColor: '#0b0f19' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, color: '#cbd5e1' }}>
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col}
                        style={{
                          padding: '6px 8px',
                          textAlign: 'left',
                          backgroundColor: '#1e293b',
                          color: '#94a3b8',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          fontSize: 10,
                          borderBottom: '1px solid #374151',
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      style={{
                        borderBottom: '1px solid #1f2937',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1e293b'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
                    >
                      {columns.map((col) => (
                        <td
                          key={col}
                          style={{
                            padding: '6px 8px',
                            textAlign: 'left',
                            color: '#f1f5f9',
                            borderRight: '1px solid #1f2937',
                          }}
                        >
                          {row[col] != null ? String(row[col]) : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: '4px 8px', fontSize: 10, color: '#64748b', backgroundColor: '#0f172a', borderTop: '1px solid #1f2937' }}>
                {preview.length} row{preview.length !== 1 ? 's' : ''} × {columns.length} column{columns.length !== 1 ? 's' : ''}
              </div>
            </div>
          ) : (
            <div style={{ padding: '16px 8px', textAlign: 'center', color: '#64748b', fontSize: 12, backgroundColor: '#0f172a', borderRadius: 6, border: '1px dashed #374151' }}>
              No table preview available for this node.
            </div>
          )}
        </div>

        {/* Execution Output (JSON) */}
        {result && (
          <div style={{ borderTop: '1px solid #1f2937', paddingTop: 10 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#93c5fd', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              Execution Output
            </label>
            <pre style={{ margin: 0, padding: 8, backgroundColor: '#090d16', color: '#38bdf8', fontSize: 10, borderRadius: 6, overflowX: 'auto' }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </aside>
  );
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  backgroundColor: '#0b0f19',
  border: '1px solid #374151',
  borderRadius: 4,
  color: '#f8fafc',
  fontSize: 12,
  outline: 'none',
  boxSizing: 'border-box',
};

export default NodeConfigPanel;

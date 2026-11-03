import React from 'react';

export interface CatalogNodeItem {
  id?: string;
  name: string;
  category?: string;
  description?: string;
  type?: string;
  params?: Record<string, any>;
}

export interface NodePaletteProps {
  catalog?: CatalogNodeItem[];
  isLoading?: boolean;
}

const DEFAULT_CATALOG: CatalogNodeItem[] = [
  { name: 'CSV / Inflow Data', category: 'SOURCE', description: 'Reads CSV data into Polars DataFrame', type: 'scan_csv' },
  { name: 'Civil Mass Balancer', category: 'CIVIL & ENVIRONMENTAL', description: 'Calculates hydraulic mass balance and flow splits', type: 'mass_balance' },
  { name: 'Energy Efficiency Balancer', category: 'CIVIL & MECHANICAL', description: 'Evaluates specific energy consumption kWh/m3', type: 'energy_efficiency' },
  { name: 'Polars Data Transformer', category: 'TRANSFORM', description: 'High-performance Polars tabular operations', type: 'polars_node' },
];

export const NodePalette: React.FC<NodePaletteProps> = ({ catalog, isLoading = false }) => {
  const items = (catalog && catalog.length > 0) ? catalog : DEFAULT_CATALOG;

  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow/type', nodeType);
    event.dataTransfer.setData('application/reactflow/label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside style={{ width: 260, backgroundColor: '#0f172a', borderRight: '1px solid #1e293b', padding: 16, overflowY: 'auto' }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', margin: '0 0 4px 0' }}>Node Palette</h3>
      <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 16px 0' }}>Drag & drop nodes into canvas</p>

      {isLoading ? (
        <div style={{ color: '#38bdf8', fontSize: 12 }}>Loading catalog...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((item, index) => (
            <div
              key={index}
              draggable
              onDragStart={(e) => onDragStart(e, item.type || 'polars_node', item.name)}
              style={{
                backgroundColor: '#1e293b',
                padding: '12px',
                borderRadius: 8,
                border: '1px solid #334155',
                cursor: 'grab',
                userSelect: 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{item.name}</span>
                {item.category && (
                  <span style={{ fontSize: 9, backgroundColor: '#334155', color: '#38bdf8', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                    {item.category}
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>
                {item.description || 'Computational node block'}
              </p>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
};

export default NodePalette;

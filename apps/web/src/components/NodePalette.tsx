import React, { useEffect, useState } from 'react';

export interface NodeDefinition {
  type: string;
  label: string;
  category: string;
  description?: string;
  icon: string;
  color: string;
}

const DEFAULT_NODES: NodeDefinition[] = [
  {
    type: 'polars_node',
    label: 'Polars Transform',
    category: 'Data Processing',
    description: 'High performance data pipeline',
    icon: '⚡',
    color: '#38bdf8'
  },
  {
    type: 'mass_balance_node',
    label: 'Mass Balance Analysis',
    category: 'Civil & Environmental',
    description: 'Conservation of mass solver',
    icon: '⚖️',
    color: '#34d399'
  },
  {
    type: 'energy_efficiency_node',
    label: 'Energy Efficiency & Loss',
    category: 'Civil & Mechanical',
    description: 'First law thermodynamic balance',
    icon: '🌱',
    color: '#facc15'
  }
];

export const NodePalette: React.FC = () => {
  const [nodeList, setNodeList] = useState<NodeDefinition[]>(DEFAULT_NODES);

  useEffect(() => {
    fetch('/api/v1/nodes/registry')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.registry)) {
          const registered = data.registry.map((item: any) => {
            const found = DEFAULT_NODES.find((d) => d.type === item.type);
            return {
              type: item.type,
              label: item.label || item.type,
              category: item.category || 'Civil & Engineering',
              description: item.description || '',
              icon: found ? found.icon : '⚙️',
              color: found ? found.color : '#818cf8'
            };
          });
          setNodeList(registered);
        }
      })
      .catch(() => {
        // Retain default nodes on failure
      });
  }, []);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside
      style={{
        width: '270px',
        padding: '20px 14px',
        background: '#0b1120',
        color: '#f8fafc',
        borderRight: '1px solid #1e293b',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        userSelect: 'none',
        boxSizing: 'border-box'
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🧩</span>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.3px' }}>
            Nodes Palette
          </h3>
        </div>
        <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b' }}>
          Drag components onto canvas
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
        {nodeList.map((node) => (
          <div
            key={node.type}
            onDragStart={(e) => onDragStart(e, node.type)}
            draggable
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              background: '#131d33',
              color: '#e2e8f0',
              cursor: 'grab',
              fontSize: '12px',
              border: '1px solid #1e2e4a',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              boxShadow: '0 3px 8px rgba(0,0,0,0.25)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = node.color;
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#1e2e4a';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.25)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px' }}>{node.icon}</span>
                <span style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '13px' }}>{node.label}</span>
              </div>
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 600,
                  color: node.color,
                  background: 'rgba(255,255,255,0.06)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid #334155'
                }}
              >
                {node.category}
              </span>
            </div>
            {node.description && (
              <span style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.3 }}>
                {node.description}
              </span>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '9px', color: '#475569', fontFamily: 'monospace' }}>
              {node.type}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default NodePalette;


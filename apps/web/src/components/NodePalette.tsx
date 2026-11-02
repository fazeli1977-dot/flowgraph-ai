import React from 'react';

export interface NodePaletteProps {
  nodes?: string[];
  nodeTypes?: string[];
}

export const NodePalette: React.FC<NodePaletteProps> = ({ nodes, nodeTypes }) => {
  const items = nodes || nodeTypes || ['polars_node'];

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside
      style={{
        width: '240px',
        padding: '16px',
        background: '#181825',
        color: '#cdd6f4',
        borderRight: '1px solid #313244',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        userSelect: 'none',
        boxSizing: 'border-box'
      }}
    >
      <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: 600, color: '#cba6f7' }}>
        Nodes Palette
      </h3>
      {items.length === 0 ? (
        <div style={{ fontSize: '13px', color: '#6c7086' }}>Loading nodes...</div>
      ) : (
        items.map((type) => (
          <div
            key={type}
            onDragStart={(e) => onDragStart(e, type)}
            draggable
            style={{
              padding: '10px 14px',
              borderRadius: '6px',
              background: '#313244',
              color: '#cdd6f4',
              cursor: 'grab',
              fontSize: '13px',
              border: '1px solid #45475a',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a6e3a1' }}></span>
            {type}
          </div>
        ))
      )}
    </aside>
  );
};

export default NodePalette;

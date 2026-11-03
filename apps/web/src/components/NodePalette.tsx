import React, { useEffect, useState } from 'react';
import { fetchAvailableNodes, NodeMetadata } from '../services/nodesApi';

interface NodePaletteProps {
  onAddNode?: (type: string, label: string) => void;
}

export const NodePalette: React.FC<NodePaletteProps> = ({ onAddNode }) => {
  const [nodes, setNodes] = useState<NodeMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailableNodes()
      .then((data) => {
        setNodes(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch nodes');
        setLoading(false);
      });
  }, []);

  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow/type', nodeType);
    event.dataTransfer.setData('application/reactflow/label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'civil & environmental':
      case 'civil':
      case 'environmental':
        return 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60';
      case 'data processing':
      case 'polars':
        return 'bg-cyan-950/60 text-cyan-300 border-cyan-700/60';
      case 'civil & mechanical':
      case 'mechanical':
      case 'energy':
        return 'bg-amber-950/60 text-amber-300 border-amber-700/60';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getNodeIcon = (type: string, category: string) => {
    if (type.includes('mass') || category?.toLowerCase().includes('environmental')) return '🧪';
    if (type.includes('energy') || category?.toLowerCase().includes('mechanical')) return '🌱';
    return '⚡';
  };

  return (
    <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col h-full select-none z-10 shadow-2xl">
      <div className="p-4 border-b border-slate-800 bg-slate-950/40">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <span className="text-emerald-400">🧩</span>
          <span>Nodes Palette</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">Drag or click to add components onto canvas</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && (
          <div className="flex items-center justify-center p-8 text-sm text-slate-400">
            <span className="animate-pulse">Loading nodes catalog...</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-950/50 border border-red-800 rounded-lg text-xs text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && nodes.map((node) => (
          <div
            key={node.type}
            draggable
            onDragStart={(e) => onDragStart(e, node.type, node.label)}
            onClick={() => onAddNode && onAddNode(node.type, node.label)}
            className="group p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 rounded-xl cursor-grab active:cursor-grabbing transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-base">{getNodeIcon(node.type, node.category)}</span>
                <span className="font-semibold text-slate-200 text-sm group-hover:text-emerald-300 transition-colors">
                  {node.label}
                </span>
              </div>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${getCategoryBadgeClass(node.category)}`}>
                {node.category || 'General'}
              </span>
            </div>

            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
              {node.description}
            </p>

            <div className="mt-2.5 pt-2 border-t border-slate-750 flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-mono text-[10px] text-slate-400">{node.type}</span>
              <span className="text-emerald-400/80 group-hover:text-emerald-300 transition-colors">Click or Drag +</span>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default NodePalette;
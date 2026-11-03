import axios from 'axios';

export interface NodeMetadata {
  type: string;
  label: string;
  category: string;
  description: string;
  version?: string;
  default_config?: Record<string, any>;
}

export const fetchAvailableNodes = async (): Promise<NodeMetadata[]> => {
  try {
    const res = await axios.get('/api/v1/nodes');
    if (res.data && Array.isArray(res.data.nodes)) {
      return res.data.nodes;
    }
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return [
      {
        type: 'mass_balance_node',
        label: 'Mass Balance Analysis',
        category: 'Civil & Environmental',
        description: 'Environmental mass accumulation and reaction rate modeling'
      },
      {
        type: 'energy_efficiency_node',
        label: 'Energy Efficiency & Loss',
        category: 'Civil & Mechanical',
        description: 'Thermodynamic heat balance and energy recovery estimation'
      },
      {
        type: 'polars_node',
        label: 'Polars Transform',
        category: 'Data Processing',
        description: 'High-performance Polars DataFrame operations'
      }
    ];
  } catch (err) {
    console.error('Failed to fetch available nodes metadata, using fallback defaults', err);
    return [
      {
        type: 'mass_balance_node',
        label: 'Mass Balance Analysis',
        category: 'Civil & Environmental',
        description: 'Environmental mass accumulation and reaction rate modeling'
      },
      {
        type: 'energy_efficiency_node',
        label: 'Energy Efficiency & Loss',
        category: 'Civil & Mechanical',
        description: 'Thermodynamic heat balance and energy recovery estimation'
      },
      {
        type: 'polars_node',
        label: 'Polars Transform',
        category: 'Data Processing',
        description: 'High-performance Polars DataFrame operations'
      }
    ];
  }
};

export const fetchNodeTypes = async (): Promise<string[]> => {
  const nodes = await fetchAvailableNodes();
  return nodes.map((n) => n.type);
};

export default { fetchAvailableNodes, fetchNodeTypes };
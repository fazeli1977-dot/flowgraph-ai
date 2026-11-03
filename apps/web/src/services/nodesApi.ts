import axios from 'axios';

export interface NodeRegistryItem {
  type: string;
  label: string;
  category: string;
  description: string;
}

export interface NodeRegistryResponse {
  nodes: string[];
  registry: NodeRegistryItem[];
}

export const fetchNodeTypes = async (): Promise<string[]> => {
  try {
    const res = await axios.get('/api/v1/nodes/registry');
    if (res.data && Array.isArray(res.data.nodes)) {
      return res.data.nodes;
    }
    return ['polars_node', 'mass_balance_node', 'energy_efficiency_node'];
  } catch (err) {
    console.error('Failed to fetch node types:', err);
    return ['polars_node', 'mass_balance_node', 'energy_efficiency_node'];
  }
};

export default fetchNodeTypes;

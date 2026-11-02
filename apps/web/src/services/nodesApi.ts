import axios from 'axios';

export const fetchNodeTypes = async (): Promise<string[]> => {
  try {
    const res = await axios.get('/api/v1/nodes');
    if (res.data && Array.isArray(res.data.nodes)) {
      return res.data.nodes;
    }
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return ['polars_node'];
  } catch (err) {
    console.error('Failed to fetch node types:', err);
    return ['polars_node'];
  }
};

export default fetchNodeTypes;

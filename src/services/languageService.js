import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.test4funtalk.site';

let _cache = null;

export const getLanguages = async () => {
  if (_cache) return _cache;
  const { data } = await axios.get(`${BASE_URL}/api/languages/getAllLanguages`);
  // normalise common response shapes: plain array, { data: [] }, { languages: [] }
  const list = Array.isArray(data)
    ? data
    : data.data ?? data.languages ?? data.result ?? [];
  _cache = list;
  return list;
};

import { API_URL } from '@env';

const API_BASE =
  (API_URL || '').replace(/\/+$/g, '') ||
  'http://10.0.2.2:3000'; // Android emulator fallback

export default API_BASE;

const LOCAL_IP = "192.168.1.24";

const API_BASE = __DEV__
  ? `http://${LOCAL_IP}:3000`
  : "https://api.tarafis.com";

export default API_BASE;
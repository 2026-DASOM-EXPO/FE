const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8080/api').replace(/\/$/, '');

const TOKEN_KEY = 'worksafe_access_token';
const REFRESH_TOKEN_KEY = 'worksafe_refresh_token';

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem(TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: ({ accessToken, refreshToken }) => {
    if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

const queryString = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
};

export const apiRequest = async (endpoint, options = {}) => {
  const { method = 'GET', data, signal, headers: customHeaders } = options;
  const token = tokenStorage.getAccessToken();
  const headers = { Accept: 'application/json', ...customHeaders };
  if (data !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      signal,
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    const body = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(body?.message || `요청을 처리하지 못했습니다. (${response.status})`);
      error.status = response.status;
      error.code = body?.code;
      throw error;
    }
    return { success: true, data: body?.data ?? null, message: body?.message || '', code: body?.code || String(response.status) };
  } catch (error) {
    if (error.name !== 'AbortError') console.error('API request failed:', error);
    return { success: false, data: null, error: error.message, status: error.status, code: error.code };
  }
};

const get = (path, params) => apiRequest(`${path}${queryString(params)}`);
const post = (path, data) => apiRequest(path, { method: 'POST', data });
const patch = (path, data) => apiRequest(path, { method: 'PATCH', data });
const remove = (path) => apiRequest(path, { method: 'DELETE' });

export const authAPI = {
  signup: (data) => post('/auth/signup', data),
  login: async (data) => {
    const result = await post('/auth/login', data);
    if (result.success) tokenStorage.setTokens(result.data);
    return result;
  },
  refresh: (refreshToken = tokenStorage.getRefreshToken()) => post('/auth/refresh', { refreshToken }),
  me: () => get('/auth/me'),
  changePassword: (data) => patch('/auth/password', data),
  logout: () => tokenStorage.clear(),
};

export const workerAPI = {
  getAll: () => get('/workers'),
  getById: (id) => get(`/workers/${id}`),
  create: (data) => post('/workers', data),
  update: (id, data) => patch(`/workers/${id}`, data),
  updateLocation: (id, latitude, longitude) => patch(`/workers/${id}/location${queryString({ latitude, longitude })}`),
  delete: (id) => remove(`/workers/${id}`),
};

export const sensorAPI = {
  getAll: () => get('/sensor-logs'),
  getLatest: (workerId) => get(`/sensor-logs/latest/workers/${workerId}`),
  getHistory: (workerId) => get(`/sensor-logs/workers/${workerId}`),
  getByEquipment: (equipmentId) => get(`/sensor-logs/equipment/${equipmentId}`),
  create: (data) => post('/sensor-logs', data),
};

export const alertAPI = {
  getAll: () => get('/alerts'),
  getUnread: () => get('/alerts/unread'),
  markAsRead: (id) => patch(`/alerts/${id}/read`),
  markAllAsRead: () => patch('/alerts/read-all'),
  streamUrl: () => `${API_BASE_URL}/alerts/stream`,
};

export const dashboardAPI = {
  getSummary: () => get('/dashboard/summary'),
  getWorkerStatus: () => get('/dashboard/workers/status'),
  getEquipmentStatus: () => get('/dashboard/equipment/status'),
  getRecentRiskEvents: () => get('/dashboard/risk-events/recent'),
  getDroneStatus: () => get('/dashboard/drones/status'),
};

export const riskEventAPI = {
  getAll: () => get('/risk-events'),
  getById: (id) => get(`/risk-events/${id}`),
  getByWorker: (workerId) => get(`/risk-events/workers/${workerId}`),
  getReports: (filters) => get('/events/risk', filters),
  create: (data) => post('/risk-events', data),
  updateStatus: (id, status) => patch(`/risk-events/${id}/status`, { status }),
};

export const equipmentAPI = {
  getAll: () => get('/equipment'),
  getById: (id) => get(`/equipment/${id}`),
  getStatus: () => get('/equipment/status'),
  getLogs: (filters) => get('/equipment/logs', filters),
  create: (data) => post('/equipment', data),
  update: (id, data) => patch(`/equipment/${id}`, data),
  assign: (id, workerId) => patch(`/equipment/${id}/assign/${workerId}`),
  setWearStatus: (id, wearStatus) => patch(`/equipment/${id}/wear-status`, { wearStatus }),
  setManualWearStatus: (id, data) => patch(`/equipment/${id}/manual-wear-status`, data),
  setBuzzer: (id, data) => patch(`/equipment/${id}/buzzer`, data),
  startTimer: (id, reason) => patch(`/equipment/${id}/work-timer/start`, { reason }),
  stopTimer: (id, reason) => patch(`/equipment/${id}/work-timer/stop`, { reason }),
  delete: (id) => remove(`/equipment/${id}`),
};

export const droneAPI = {
  getAll: () => get('/drones'),
  getById: (id) => get(`/drones/${id}`),
  create: (data) => post('/drones', data),
  update: (id, data) => patch(`/drones/${id}`, data),
  delete: (id) => remove(`/drones/${id}`),
  dispatch: (id, data) => post(`/drones/${id}/dispatch`, data),
  getDispatches: () => get('/drones/dispatches'),
  getDispatchById: (id) => get(`/drones/dispatches/${id}`),
  updateDispatchStatus: (id, status) => patch(`/drones/dispatches/${id}/status`, { status }),
  createVideo: (id, data) => post(`/drones/${id}/videos`, data),
  getActiveVideo: (id) => get(`/drones/${id}/videos/active`),
};

export const wearableCommandAPI = {
  create: (data) => post('/wearable-commands', data),
  getPending: () => get('/wearable-commands/pending'),
  acknowledge: (id) => patch(`/wearable-commands/${id}/ack`),
};

export const droneVideoAPI = {
  start: (id) => patch(`/drone-videos/${id}/start`),
  stop: (id) => patch(`/drone-videos/${id}/stop`),
};

export const droneDropAPI = {
  create: (dispatchId, data) => post(`/drone-dispatches/${dispatchId}/drop-logs`, data),
  getAll: (dispatchId) => get(`/drone-dispatches/${dispatchId}/drop-logs`),
  updateStatus: (id, data) => patch(`/drone-drop-logs/${id}/status`, data),
};

export const iotAPI = {
  biometrics: (data) => post('/iot/biometrics', data),
  imu: (data) => post('/iot/imu', data),
  gps: (data) => post('/iot/gps', data),
  equipmentStatus: (data) => post('/iot/equipment-status', data),
  sos: (data) => post('/iot/sos', data),
  droneObstacle: (data) => post('/iot/drone-obstacle', data),
};

export const realtimeEventNames = [
  'alert',
  'sensor',
  'equipment',
  'equipment-deleted',
  'worker',
  'worker-deleted',
  'drone',
  'drone-deleted',
  'dispatch',
  'video',
  'risk',
];

export const subscribeToRealtime = (handlers = {}, onStatus) => {
  if (typeof fetch === 'undefined' || typeof TextDecoder === 'undefined') return () => undefined;

  const controller = new AbortController();
  let stopped = false;

  const parseBlock = (block) => {
    let eventName = 'message';
    const dataLines = [];
    block.split(/\r?\n/).forEach((line) => {
      if (line.startsWith('event:')) eventName = line.slice(6).trim();
      if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
    });
    if (!dataLines.length || !handlers[eventName]) return;
    try {
      handlers[eventName](JSON.parse(dataLines.join('\n')));
    } catch (error) {
      onStatus?.('error', error);
    }
  };

  const delayReconnect = () => new Promise((resolve) => {
    const timeout = setTimeout(resolve, 1500);
    controller.signal.addEventListener('abort', () => {
      clearTimeout(timeout);
      resolve();
    }, { once: true });
  });

  const connect = async () => {
    while (!stopped) {
      try {
        onStatus?.('connecting');
        const token = tokenStorage.getAccessToken();
        const response = await fetch(alertAPI.streamUrl(), {
          method: 'GET',
          headers: {
            Accept: 'text/event-stream',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok || !response.body) {
          throw new Error(`SSE 연결에 실패했습니다. (${response.status})`);
        }

        onStatus?.('live');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!stopped) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split(/\r?\n\r?\n/);
          buffer = blocks.pop() || '';
          blocks.forEach(parseBlock);
        }
      } catch (error) {
        if (stopped || error.name === 'AbortError') return;
        onStatus?.('error', error);
      }

      if (!stopped) await delayReconnect();
    }
  };

  connect();
  return () => {
    stopped = true;
    controller.abort();
  };
};

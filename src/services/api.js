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
  attendance: (data) => post('/iot/attendance', data),
  biometrics: (data) => post('/iot/biometrics', data),
  imu: (data) => post('/iot/imu', data),
  gps: (data) => post('/iot/gps', data),
  equipmentStatus: (data) => post('/iot/equipment-status', data),
  sos: (data) => post('/iot/sos', data),
  droneObstacle: (data) => post('/iot/drone-obstacle', data),
};

// Existing pages import these names. They now point to the documented domains.
export const safetyEquipmentAPI = { ...equipmentAPI, runAction: (action, data) => {
  if (action === 'read-list') return equipmentAPI.getAll();
  if (action === 'read-detail') return equipmentAPI.getById(data.equipmentId);
  if (action === 'delete') return equipmentAPI.delete(data.equipmentId);
  if (action === 'update') return equipmentAPI.update(data.equipmentId, data);
  return equipmentAPI.create(data);
} };
export const droneManagementAPI = { ...droneAPI, runAction: (action, data) => {
  if (action === 'read-list') return droneAPI.getAll();
  if (action === 'read-detail') return droneAPI.getById(data.droneId);
  if (action === 'delete') return droneAPI.delete(data.droneId);
  if (action === 'update') return droneAPI.update(data.droneId, data);
  return droneAPI.create(data);
} };

export const subscribeToAlerts = (onAlert, onError) => {
  if (process.env.REACT_APP_ENABLE_ALERT_SSE !== 'true') return () => undefined;
  if (typeof EventSource === 'undefined') return () => undefined;
  const source = new EventSource(alertAPI.streamUrl());
  const handleAlert = (event) => {
    try { onAlert(JSON.parse(event.data)); } catch (error) { onError?.(error); }
  };
  source.addEventListener('alert', handleAlert);
  source.onerror = (error) => onError?.(error);
  return () => {
    source.removeEventListener('alert', handleAlert);
    source.close();
  };
};

export const realtimeAPI = {
  streamUrl: () => `${API_BASE_URL}/realtime/stream`,
};

// ESP32 -> 백엔드 -> 프론트로 이어지는 장비 착용상태/센서값 실시간 반영.
// 백엔드가 /realtime/stream(SseEmitter)에서 'equipment-status', 'sensor-update' 이벤트를 emit해줘야 동작함.
export const subscribeToDeviceUpdates = (handlers = {}, onError) => {
  if (process.env.REACT_APP_ENABLE_DEVICE_SSE !== 'true') return () => undefined;
  if (typeof EventSource === 'undefined') return () => undefined;
  const source = new EventSource(realtimeAPI.streamUrl());
  const handleEquipmentStatus = (event) => {
    try { handlers.onEquipmentStatus?.(JSON.parse(event.data)); } catch (error) { onError?.(error); }
  };
  const handleSensorUpdate = (event) => {
    try { handlers.onSensorUpdate?.(JSON.parse(event.data)); } catch (error) { onError?.(error); }
  };
  source.addEventListener('equipment-status', handleEquipmentStatus);
  source.addEventListener('sensor-update', handleSensorUpdate);
  source.onerror = (error) => onError?.(error);
  return () => {
    source.removeEventListener('equipment-status', handleEquipmentStatus);
    source.removeEventListener('sensor-update', handleSensorUpdate);
    source.close();
  };
};

// Deprecated page adapters retained until the corresponding screen is redesigned.
export const iotIntegrationAPI = {
  syncFeature: (feature, data) => {
    const handler = {
      'rfid-attendance': iotAPI.attendance,
      'biometric-realtime': iotAPI.biometrics,
      'motion-impact': iotAPI.imu,
      'gps-location': iotAPI.gps,
      'equipment-status': iotAPI.equipmentStatus,
      'sos-report': iotAPI.sos,
      'drone-obstacle': iotAPI.droneObstacle,
    }[feature];
    return handler ? handler(data) : Promise.resolve({ success: false, error: '지원하지 않는 IoT 데이터 유형입니다.' });
  },
};
export const monitoringAPI = {
  queryFeature: (feature, filters) => {
    const handler = {
      'alert-stream': alertAPI.getAll,
      'equipment-overview': equipmentAPI.getStatus,
      'equipment-history': () => equipmentAPI.getLogs(filters),
      'incident-report': () => riskEventAPI.getReports(filters),
    }[feature];
    return handler ? handler() : Promise.resolve({ success: false, error: '지원하지 않는 관제 조회입니다.' });
  },
};
export const droneResponseAPI = {
  dispatchDrone: (droneId, data) => droneAPI.dispatch(droneId, data),
  dropEmergencyKit: (dispatchId, data) => droneDropAPI.create(dispatchId, data),
  getActiveVideo: (droneId) => droneAPI.getActiveVideo(droneId),
  startVideo: (videoId) => droneVideoAPI.start(videoId),
};
export const deviceManagementAPI = wearableCommandAPI;

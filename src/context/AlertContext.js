import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { alertAPI } from '../services/api';
import { useRealtime } from './RealtimeContext';

const AlertContext = createContext(null);
const normalizeAlert = (alert) => ({
  ...alert,
  severity: alert.severity?.toLowerCase() || 'info',
  read: alert.readStatus === 'READ',
  timestamp: new Date(alert.createdAt || Date.now()),
  workerId: alert.worker?.id,
  workerName: alert.worker?.name,
  type: alert.riskEvent?.riskType?.toLowerCase() || 'system',
});

export const AlertProvider = ({ children }) => {
  const { subscribe } = useRealtime();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    const result = await alertAPI.getAll();
    if (result.success) {
      setAlerts((result.data || []).map(normalizeAlert));
      setError(null);
    } else setError(result.error || '알림을 불러오지 못했습니다.');
    setLoading(false);
    return result;
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);
  useEffect(() => subscribe('alert', (alert) => {
    setAlerts((prev) => [normalizeAlert(alert), ...prev.filter((item) => item.id !== alert.id)]);
  }), [subscribe]);

  const unreadCount = useMemo(() => alerts.filter((alert) => !alert.read).length, [alerts]);
  const addAlert = useCallback((alert) => {
    const normalized = normalizeAlert({ id: Date.now(), ...alert });
    setAlerts((prev) => [normalized, ...prev]);
    return normalized;
  }, []);
  const markAsRead = useCallback(async (id) => {
    const result = await alertAPI.markAsRead(id);
    if (result.success) setAlerts((prev) => prev.map((alert) => alert.id === id ? normalizeAlert(result.data) : alert));
    return result;
  }, []);
  const markAllAsRead = useCallback(async () => {
    const result = await alertAPI.markAllAsRead();
    if (result.success) setAlerts((prev) => prev.map((alert) => ({ ...alert, read: true, readStatus: 'READ' })));
    return result;
  }, []);
  const removeAlert = useCallback((id) => setAlerts((prev) => prev.filter((alert) => alert.id !== id)), []);
  const getAlertsByType = useCallback((type) => alerts.filter((alert) => alert.type === type), [alerts]);
  const getEmergencyAlerts = useCallback(() => alerts.filter((alert) => alert.severity === 'emergency'), [alerts]);

  return <AlertContext.Provider value={{ alerts, unreadCount, loading, error, fetchAlerts, addAlert, markAsRead, markAllAsRead, removeAlert, getAlertsByType, getEmergencyAlerts }}>{children}</AlertContext.Provider>;
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) throw new Error('useAlert must be used within AlertProvider');
  return context;
};

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { realtimeEventNames, subscribeToRealtime } from '../services/api';

const RealtimeContext = createContext(null);

export const RealtimeProvider = ({ children }) => {
  const listeners = useRef(new Map());
  const [status, setStatus] = useState('connecting');
  const [events, setEvents] = useState([]);

  const emit = useCallback((type, data) => {
    setEvents((current) => [
      { id: `${type}-${Date.now()}-${Math.random()}`, type, data, receivedAt: new Date() },
      ...current,
    ].slice(0, 100));
    (listeners.current.get(type) || new Set()).forEach((listener) => listener(data));
  }, []);

  useEffect(() => {
    const handlers = Object.fromEntries(
      realtimeEventNames.map((eventName) => [eventName, (data) => emit(eventName, data)])
    );
    handlers.connected = (data) => {
      setStatus('live');
      (Array.isArray(data) ? data : []).forEach((alert) => emit('alert', alert));
    };
    return subscribeToRealtime(handlers, (nextStatus) => setStatus(nextStatus));
  }, [emit]);

  const subscribe = useCallback((type, listener) => {
    const typeListeners = listeners.current.get(type) || new Set();
    typeListeners.add(listener);
    listeners.current.set(type, typeListeners);
    return () => {
      typeListeners.delete(listener);
      if (typeListeners.size === 0) listeners.current.delete(type);
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{ status, events, subscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error('useRealtime must be used within RealtimeProvider');
  return context;
};

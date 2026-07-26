import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { workerAPI, sensorAPI, equipmentAPI } from '../services/api';
import { useRealtime } from './RealtimeContext';
import {
  equipmentStatusKey,
  idsEqual,
  mergeWorkerEquipment,
  mergeWorkerSensor,
} from '../utils/realtimeState';

const WorkerContext = createContext(null);
const statusFromApi = { NORMAL: 'normal', WARNING: 'warning', DANGER: 'danger', INACTIVE: 'off-duty' };
const statusToApi = { normal: 'NORMAL', warning: 'WARNING', danger: 'DANGER', 'off-duty': 'INACTIVE' };

const normalizeWorker = (worker, sensorData, equipmentStatus) => ({
  ...worker,
  workerId: String(worker.id),
  phone: worker.phoneNumber,
  status: statusFromApi[worker.status] || worker.status?.toLowerCase() || 'off-duty',
  location: worker.currentLatitude != null && worker.currentLongitude != null
    ? { lat: worker.currentLatitude, lng: worker.currentLongitude }
    : null,
  sensorData: {
    ...(worker.sensorData || {}),
    ...(sensorData || {}),
    heartRate: sensorData?.bpm ?? worker.sensorData?.heartRate,
    temperature: sensorData?.bodyTemperature ?? worker.sensorData?.temperature,
    equipmentStatus: sensorData?.equipmentStatus ?? equipmentStatus ?? worker.sensorData?.equipmentStatus,
  },
  lastUpdate: new Date(sensorData?.measuredAt || worker.updatedAt || worker.createdAt || Date.now()),
});

const toRequest = (data) => ({
  name: data.name,
  department: data.department,
  phoneNumber: data.phoneNumber ?? data.phone,
  status: statusToApi[data.status] || data.status,
  currentLatitude: data.currentLatitude ?? data.location?.lat,
  currentLongitude: data.currentLongitude ?? data.location?.lng,
});

export const WorkerProvider = ({ children }) => {
  const { status: realtimeStatus, subscribe } = useRealtime();
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const fetched = useRef(false);
  const inFlight = useRef(false);

  useEffect(() => {
    const unsubscribeWorker = subscribe('worker', (worker) => {
      setWorkers((current) => {
        const existing = current.find((item) => idsEqual(item.id, worker.id));
        const normalized = normalizeWorker(
          { ...(existing || {}), ...worker },
          existing?.sensorData,
          existing?.sensorData?.equipmentStatus
        );
        return existing
          ? current.map((item) => idsEqual(item.id, worker.id) ? normalized : item)
          : [normalized, ...current];
      });
    });
    const unsubscribeWorkerDeleted = subscribe('worker-deleted', ({ id }) => {
      setWorkers((current) => current.filter((worker) => !idsEqual(worker.id, id)));
      setSelectedWorker((current) => idsEqual(current?.id, id) ? null : current);
    });
    const unsubscribeEquipment = subscribe('equipment', (equipment) => {
      setWorkers((current) => mergeWorkerEquipment(current, equipment));
      setSelectedWorker((current) => current
        ? mergeWorkerEquipment([current], equipment)[0]
        : current);
    });
    const unsubscribeSensor = subscribe('sensor', (sensor) => {
      setWorkers((current) => mergeWorkerSensor(current, sensor));
      setSelectedWorker((current) => current
        ? mergeWorkerSensor([current], sensor)[0]
        : current);
    });
    return () => {
      unsubscribeWorker();
      unsubscribeWorkerDeleted();
      unsubscribeEquipment();
      unsubscribeSensor();
    };
  }, [subscribe]);

  const fetchWorkers = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    fetched.current ? setRefreshing(true) : setLoading(true);
    const [result, equipmentResult] = await Promise.all([
      workerAPI.getAll(),
      equipmentAPI.getAll(),
    ]);
    if (result.success) {
      const equipmentByWorker = (equipmentResult.success ? equipmentResult.data : []).reduce((acc, item) => {
        const workerId = item.worker?.id;
        if (!workerId) return acc;
        const key = equipmentStatusKey(item.type);
        if (!key) return acc;
        acc[workerId] = {
          helmet: false,
          safeSuit: false,
          safeShoes: false,
          ...(acc[workerId] || {}),
          [key]: item.wearStatus === 'WORN',
        };
        return acc;
      }, {});
      setWorkers((result.data || []).map((worker) =>
        normalizeWorker(worker, null, equipmentByWorker[worker.id] || {
          helmet: false,
          safeSuit: false,
          safeShoes: false,
        })
      ));
      setError(null);
      setLastFetchedAt(new Date());
      fetched.current = true;
    } else {
      setError(result.error || '작업자 정보를 불러오지 못했습니다.');
    }
    setLoading(false);
    setRefreshing(false);
    inFlight.current = false;
    return result;
  }, []);

  useEffect(() => {
    if (realtimeStatus !== 'live') return;
    fetchWorkers();
  }, [fetchWorkers, realtimeStatus]);

  const getWorkerDetail = useCallback(async (workerId) => {
    const cached = workers.find((worker) => worker.id === workerId);
    if (cached) setSelectedWorker(cached);
    const [workerResult, sensorResult] = await Promise.all([
      workerAPI.getById(workerId),
      sensorAPI.getLatest(workerId),
    ]);
    if (workerResult.success) {
      const worker = normalizeWorker(workerResult.data, sensorResult.success ? sensorResult.data : null);
      setSelectedWorker(worker);
      setWorkers((prev) => prev.map((item) => item.id === worker.id ? worker : item));
      return worker;
    }
    return cached || null;
  }, [workers]);

  const addWorker = useCallback(async (data) => {
    const result = await workerAPI.create(toRequest(data));
    if (result.success) setWorkers((prev) => [...prev, normalizeWorker(result.data)]);
    return result;
  }, []);

  const updateWorker = useCallback(async (workerId, data) => {
    const result = await workerAPI.update(workerId, toRequest(data));
    if (result.success) {
      const worker = normalizeWorker(result.data);
      setWorkers((prev) => prev.map((item) => item.id === workerId ? worker : item));
      setSelectedWorker((prev) => prev?.id === workerId ? worker : prev);
    }
    return result;
  }, []);

  const deleteWorker = useCallback(async (workerId) => {
    const result = await workerAPI.delete(workerId);
    if (result.success) {
      setWorkers((prev) => prev.filter((worker) => worker.id !== workerId));
      setSelectedWorker((prev) => prev?.id === workerId ? null : prev);
    }
    return result;
  }, []);

  const updateWorkerStatus = useCallback((workerId, status) => {
    setWorkers((prev) => prev.map((worker) => worker.id === workerId ? { ...worker, status } : worker));
  }, []);
  const updateSensorData = useCallback((workerId, sensorData) => {
    setWorkers((prev) => prev.map((worker) => worker.id === workerId
      ? normalizeWorker(worker, sensorData)
      : worker));
  }, []);

  return <WorkerContext.Provider value={{
    workers, selectedWorker, loading, refreshing, error, lastFetchedAt,
    fetchWorkers, getWorkerDetail, addWorker, updateWorker, deleteWorker,
    updateWorkerStatus, updateSensorData,
  }}>{children}</WorkerContext.Provider>;
};

export const useWorker = () => {
  const context = useContext(WorkerContext);
  if (!context) throw new Error('useWorker must be used within WorkerProvider');
  return context;
};

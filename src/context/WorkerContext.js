import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { workerAPI, sensorAPI } from '../services/api';

const WorkerContext = createContext(null);
const statusFromApi = { NORMAL: 'normal', WARNING: 'warning', DANGER: 'danger', INACTIVE: 'off-duty' };
const statusToApi = { normal: 'NORMAL', warning: 'WARNING', danger: 'DANGER', 'off-duty': 'INACTIVE' };

const normalizeWorker = (worker, sensorData) => ({
  ...worker,
  workerId: String(worker.id),
  phone: worker.phoneNumber,
  rfid: worker.rfidTag,
  status: statusFromApi[worker.status] || worker.status?.toLowerCase() || 'off-duty',
  location: worker.currentLatitude != null && worker.currentLongitude != null
    ? { lat: worker.currentLatitude, lng: worker.currentLongitude }
    : null,
  sensorData: sensorData ? {
    ...sensorData,
    heartRate: sensorData.bpm,
    temperature: sensorData.bodyTemperature,
  } : worker.sensorData,
  lastUpdate: new Date(sensorData?.measuredAt || worker.updatedAt || worker.createdAt || Date.now()),
});

const toRequest = (data) => ({
  name: data.name,
  department: data.department,
  phoneNumber: data.phoneNumber ?? data.phone,
  rfidTag: data.rfidTag ?? data.rfid,
  status: statusToApi[data.status] || data.status,
  currentLatitude: data.currentLatitude ?? data.location?.lat,
  currentLongitude: data.currentLongitude ?? data.location?.lng,
});

export const WorkerProvider = ({ children }) => {
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const fetched = useRef(false);
  const inFlight = useRef(false);

  const fetchWorkers = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    fetched.current ? setRefreshing(true) : setLoading(true);
    const result = await workerAPI.getAll();
    if (result.success) {
      setWorkers((result.data || []).map((worker) => normalizeWorker(worker)));
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

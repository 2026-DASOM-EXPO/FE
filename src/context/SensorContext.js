import React, { createContext, useContext, useState, useCallback } from 'react';
import { sensorAPI } from '../services/api';

/**
 * SensorContext - 센서 데이터 (ESP32) 관리
 * 역할: 웨어러블 센서 실시간 데이터 수집 및 처리
 */
const SensorContext = createContext();

/**
 * SensorProvider 컴포넌트
 * 작업자별 최신 센서값, 최근 히스토리, 연결 상태를 전역에서 공유합니다.
 */
export const SensorProvider = ({ children }) => {
  const [sensorData, setSensorData] = useState({});
  const [dataHistory, setDataHistory] = useState({}); // 센서 데이터 히스토리 (분석용)
  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 센서 데이터 업데이트 (실시간 수신)
  // 최신값 맵과 분석용 히스토리를 동시에 갱신해 대시보드/통계 화면이 같은 데이터를 사용하게 합니다.
  const updateSensorData = useCallback((workerId, data) => {
    setSensorData((prevData) => ({
      ...prevData,
      [workerId]: {
        ...prevData[workerId],
        ...data,
        timestamp: new Date(),
      },
    }));

    // 히스토리에 추가 (최근 100개까지 유지)
    // 오래된 센서값을 무한히 보관하지 않도록 화면 분석에 필요한 범위만 남깁니다.
    setDataHistory((prevHistory) => {
      const workerHistory = prevHistory[workerId] || [];
      const updatedHistory = [
        {
          ...data,
          timestamp: new Date(),
        },
        ...workerHistory,
      ].slice(0, 100);

      return {
        ...prevHistory,
        [workerId]: updatedHistory,
      };
    });

    setLastSyncTime(new Date());
  }, []);

  // 특정 작업자의 센서 데이터 조회
  // 컴포넌트가 sensorData 객체 구조를 직접 알 필요 없도록 접근 함수를 제공합니다.
  const getSensorData = useCallback(
    (workerId) => sensorData[workerId] || null,
    [sensorData]
  );

  // 특정 작업자의 센서 데이터 히스토리 조회
  // limit을 받아 차트/상세 화면에서 필요한 개수만 사용할 수 있게 합니다.
  const getSensorHistory = useCallback(
    (workerId, limit = 50) => {
      const history = dataHistory[workerId] || [];
      return history.slice(0, limit);
    },
    [dataHistory]
  );

  // 센서 연결 상태 업데이트
  // WebSocket 또는 실제 장비 연결 상태가 바뀔 때 호출됩니다.
  const setConnectionStatus = useCallback((status) => {
    setIsConnected(status);
  }, []);

  const fetchLatest = useCallback(async (workerId) => {
    setLoading(true);
    const result = await sensorAPI.getLatest(workerId);
    if (result.success && result.data) {
      updateSensorData(workerId, result.data);
      setIsConnected(true);
      setError(null);
    } else {
      setIsConnected(false);
      setError(result.error || '최신 센서 데이터를 불러오지 못했습니다.');
    }
    setLoading(false);
    return result;
  }, [updateSensorData]);

  const fetchHistory = useCallback(async (workerId) => {
    setLoading(true);
    const result = await sensorAPI.getHistory(workerId);
    if (result.success) {
      const history = result.data || [];
      setDataHistory((prev) => ({ ...prev, [workerId]: history }));
      if (history[0]) setSensorData((prev) => ({ ...prev, [workerId]: history[0] }));
      setError(null);
    } else setError(result.error || '센서 이력을 불러오지 못했습니다.');
    setLoading(false);
    return result;
  }, []);

  // 센서 데이터 통계 (평균, 최대, 최소)
  // 특정 센서 타입의 최근 히스토리를 요약해 설정/모니터링 화면에서 재사용합니다.
  const getSensorStatistics = useCallback(
    (workerId, sensorType) => {
      const history = dataHistory[workerId] || [];
      if (history.length === 0) return null;

      const values = history
        .map((data) => data[sensorType])
        .filter((v) => v !== undefined);

      if (values.length === 0) return null;

      return {
        average: values.reduce((a, b) => a + b, 0) / values.length,
        max: Math.max(...values),
        min: Math.min(...values),
      };
    },
    [dataHistory]
  );

  const value = {
    sensorData,
    dataHistory,
    isConnected,
    lastSyncTime,
    loading,
    error,
    updateSensorData,
    getSensorData,
    getSensorHistory,
    setConnectionStatus,
    getSensorStatistics,
    fetchLatest,
    fetchHistory,
  };

  return (
    <SensorContext.Provider value={value}>{children}</SensorContext.Provider>
  );
};

export const useSensor = () => {
  const context = useContext(SensorContext);
  if (!context) {
    throw new Error('useSensor must be used within SensorProvider');
  }
  return context;
};

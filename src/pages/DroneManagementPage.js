import React, { useEffect, useMemo, useRef, useState } from 'react';
import { droneAPI } from '../services/api';
import './DroneManagementPage.css';

const DroneManagementPage = () => {
  const [drones, setDrones] = useState([]);
  const [jetsonIp, setJetsonIp] = useState('');
  const [streamPath, setStreamPath] = useState('drone');
  const [streamFailed, setStreamFailed] = useState(false);
  const [streamLoading, setStreamLoading] = useState(false);
  const streamFailTimerRef = useRef(null);

  useEffect(() => {
    const loadDrones = async () => {
      const result = await droneAPI.getAll();
      if (result.success) setDrones(result.data || []);
    };
    loadDrones();
    const intervalId = window.setInterval(loadDrones, 5000);
    return () => window.clearInterval(intervalId);
  }, []);

  const averageBattery = drones.length
    ? Math.round(drones.reduce((sum, drone) => sum + (drone.batteryPercent || 0), 0) / drones.length)
    : null;

  const mediaMtxStreamUrl = useMemo(() => {
    const trimmedIp = jetsonIp.trim();
    const normalizedPath = streamPath.trim().replace(/^\/+/, '');
    if (!trimmedIp || !normalizedPath) return '';
    return `http://${trimmedIp}:8889/${normalizedPath}?autoplay=true&muted=true&controls=false&playsInline=true`;
  }, [jetsonIp, streamPath]);

  useEffect(() => {
    if (streamFailTimerRef.current) {
      window.clearTimeout(streamFailTimerRef.current);
      streamFailTimerRef.current = null;
    }

    if (!mediaMtxStreamUrl) {
      setStreamLoading(false);
      setStreamFailed(false);
      return undefined;
    }

    setStreamLoading(true);
    setStreamFailed(false);

    streamFailTimerRef.current = window.setTimeout(() => {
      setStreamLoading(false);
      setStreamFailed(true);
    }, 8000);

    return () => {
      if (streamFailTimerRef.current) {
        window.clearTimeout(streamFailTimerRef.current);
        streamFailTimerRef.current = null;
      }
    };
  }, [mediaMtxStreamUrl]);

  return (
    <div className="drone-management-page drone-management-page--simple">
      <section className="drone-stream-panel drone-stream-panel--full">
        <div className="drone-management-detail__header">
          <div>
            <span>실시간 드론 영상</span>
            <h2>MediaMTX WebRTC</h2>
          </div>
          <div className="drone-battery-card">
            <span>배터리</span>
            <strong>{averageBattery == null ? '-' : `${averageBattery}%`}</strong>
          </div>
        </div>
        <div className="stream-config">
          <label>
            Jetson IP
            <input
              type="text"
              value={jetsonIp}
              placeholder="192.168.0.20"
              inputMode="decimal"
              onChange={(event) => setJetsonIp(event.target.value)}
            />
          </label>
          <label>
            Stream Path
            <input
              type="text"
              value={streamPath}
              placeholder="drone"
              onChange={(event) => setStreamPath(event.target.value)}
            />
          </label>
          {mediaMtxStreamUrl && (
            <span className={`stream-state ${streamFailed ? 'failed' : 'live'}`}>
              {streamFailed ? '연결 실패' : streamLoading ? '연결 중' : 'LIVE'}
            </span>
          )}
        </div>
        <div className="stream-frame-wrap">
          {mediaMtxStreamUrl ? (
            <>
              <iframe
                key={mediaMtxStreamUrl}
                title="MediaMTX 실시간 드론 영상"
                src={mediaMtxStreamUrl}
                allow="autoplay"
                scrolling="no"
                onLoad={() => {
                  if (streamFailTimerRef.current) {
                    window.clearTimeout(streamFailTimerRef.current);
                    streamFailTimerRef.current = null;
                  }
                  setStreamLoading(false);
                  setStreamFailed(false);
                }}
                onError={() => {
                  if (streamFailTimerRef.current) {
                    window.clearTimeout(streamFailTimerRef.current);
                    streamFailTimerRef.current = null;
                  }
                  setStreamLoading(false);
                  setStreamFailed(true);
                }}
              />
              {streamFailed && <div className="stream-fallback">실시간 영상을 불러올 수 없습니다.</div>}
            </>
          ) : (
            <div className="stream-empty">Jetson IP를 입력하면 실시간 영상이 표시됩니다.</div>
          )}
        </div>
      </section>
    </div>
  );
};

export default DroneManagementPage;

import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useAlert } from '../context/AlertContext';
import { useWorker } from '../context/WorkerContext';
import WorkerDetailModal from '../components/worker/WorkerDetailModal';
import { droneAPI } from '../services/api';
import { WORKER_STATUS } from '../utils/constants';
import { getRelativeTime } from '../utils/helpers';
import './DashboardPage.css';

const statusLabel = {
  [WORKER_STATUS.NORMAL]: '정상',
  [WORKER_STATUS.WARNING]: '주의',
  [WORKER_STATUS.DANGER]: '위험',
  [WORKER_STATUS.OFF_DUTY]: '근무 외',
};

const DEFAULT_LOCATION = { lat: 37.500768, lng: 126.867716, label: '현재 위치' };
const DRONE_LOCATION = { lat: 37.500768, lng: 126.8679, label: '드론 위치' };

const isDisplayableCoordinate = (lat, lng) => {
  const nextLat = Number(lat);
  const nextLng = Number(lng);
  return Number.isFinite(nextLat)
    && Number.isFinite(nextLng)
    && !(Math.abs(nextLat) < 1 && Math.abs(nextLng) < 1);
};

const mapPositionForWorker = (worker) => {
  const lat = Number(worker.location?.lat);
  const lng = Number(worker.location?.lng);
  return isDisplayableCoordinate(lat, lng)
    ? [lat, lng]
    : [DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng];
};

const markerIcon = (status) => L.divIcon({
  className: `worker-leaflet-marker worker-leaflet-marker--${status || 'normal'}`,
  html: '<span></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const MapAutoFit = ({ workers }) => {
  const map = useMap();

  useEffect(() => {
    const points = workers
      .filter((worker) => worker.location?.lat != null && worker.location?.lng != null)
      .map((worker) => mapPositionForWorker(worker));
    const nextPoints = [...points, [DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng]];
    map.fitBounds(nextPoints, { padding: [36, 36], maxZoom: 17 });
  }, [map, workers]);

  return null;
};

const DashboardPage = () => {
  const { workers } = useWorker();
  const { alerts, unreadCount } = useAlert();
  const [drones, setDrones] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [jetsonIp, setJetsonIp] = useState('');
  const [streamPath, setStreamPath] = useState('drone');
  const [streamFailed, setStreamFailed] = useState(false);
  const [streamLoading, setStreamLoading] = useState(false);
  const streamFailTimerRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      const droneResult = await droneAPI.getAll();
      if (droneResult.success) setDrones(droneResult.data || []);
    };
    load();
    const intervalId = window.setInterval(load, 5000);
    return () => window.clearInterval(intervalId);
  }, []);

  const locatedWorkers = useMemo(() => workers.filter((worker) =>
    worker.location?.lat != null && worker.location?.lng != null
  ), [workers]);

  const mapCenter = useMemo(() => {
    if (locatedWorkers.length === 0) return [DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng];
    const positions = locatedWorkers.map((worker) => mapPositionForWorker(worker));
    const lat = positions.reduce((sum, position) => sum + position[0], 0) / positions.length;
    const lng = positions.reduce((sum, position) => sum + position[1], 0) / positions.length;
    return [lat, lng];
  }, [locatedWorkers]);

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
    <div className="dashboard-page dashboard-page--unified">
      <section className="recent-alerts-section">
        <div className="section-heading">
          <h2>최근 알림</h2>
          <span>미확인 {unreadCount}건</span>
        </div>
        <div className="alerts-list">
          {alerts.slice(0, 5).map((alert) => (
            <div key={alert.id} className={`alert-item ${alert.severity || 'info'}`}>
              <span className="alert-badge">{alert.severity || 'info'}</span>
              <div className="alert-copy">
                <strong>{alert.title}</strong>
                <span className="alert-message">{alert.message}</span>
              </div>
              <time>{getRelativeTime(alert.timestamp)}</time>
            </div>
          ))}
          {alerts.length === 0 && <div className="empty-state">최근 알림이 없습니다.</div>}
        </div>
      </section>

      <section className="dashboard-worker-panel">
        <div className="section-heading">
          <h2>작업자 상태</h2>
          <span>{workers.length}명</span>
        </div>
        <div className="dashboard-worker-list">
          {workers.map((worker) => (
            <button
              key={worker.id}
              type="button"
              className={`dashboard-worker-row dashboard-worker-row--${worker.status}`}
              onClick={() => setSelectedWorker(worker)}
            >
              <div>
                <strong>{worker.name}</strong>
                <span>{statusLabel[worker.status] || worker.status}</span>
              </div>
              <div>
                <span>{worker.sensorData?.heartRate ?? '-'} bpm</span>
                <span>{worker.location?.lat != null ? `${worker.location.lat}, ${worker.location.lng}` : 'GPS 대기'}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="dashboard-map-panel">
        <div className="section-heading">
          <div>
            <h2>작업자/드론 위치</h2>
            <span>실시간 GPS 지도</span>
          </div>
          <span className="map-count">{locatedWorkers.length}명 표시</span>
        </div>
        <div className="leaflet-map-wrap">
          <MapContainer center={mapCenter} zoom={15} scrollWheelZoom className="worker-map">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapAutoFit workers={locatedWorkers} />
            {locatedWorkers.map((worker) => {
              const position = mapPositionForWorker(worker);
              return (
                <Marker
                  key={worker.id}
                  position={position}
                  icon={markerIcon('worker')}
                >
                  <Popup>
                    <strong>{worker.name}</strong>
                    <br />
                    {statusLabel[worker.status] || worker.status}
                    <br />
                    {position[0]}, {position[1]}
                  </Popup>
                </Marker>
              );
            })}
            <Marker
              position={[DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng]}
              icon={markerIcon('current')}
            >
              <Popup>
                <strong>{DEFAULT_LOCATION.label}</strong>
                <br />
                {DEFAULT_LOCATION.lat}, {DEFAULT_LOCATION.lng}
              </Popup>
            </Marker>
            <Marker
              position={[DRONE_LOCATION.lat, DRONE_LOCATION.lng]}
              icon={markerIcon('drone')}
            >
              <Popup>
                <strong>{DRONE_LOCATION.label}</strong>
                <br />
                {DRONE_LOCATION.lat}, {DRONE_LOCATION.lng}
              </Popup>
            </Marker>
          </MapContainer>
        </div>
      </section>

      <section className="dashboard-stream-panel">
        <div className="section-heading">
          <div>
            <h2>실시간 드론 영상</h2>
            <span>MediaMTX WebRTC</span>
          </div>
          <div className="dashboard-battery">
            <span>배터리</span>
            <strong>{averageBattery == null ? '-' : `${averageBattery}%`}</strong>
          </div>
        </div>
        <div className="stream-config">
          <label>Jetson IP<input value={jetsonIp} placeholder="192.168.0.20" onChange={(event) => setJetsonIp(event.target.value)} /></label>
          <label>Stream Path<input value={streamPath} placeholder="drone" onChange={(event) => setStreamPath(event.target.value)} /></label>
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
              />
              {(streamFailed || streamLoading) && (
                <div className={streamFailed ? 'stream-fallback' : 'stream-loading'}>
                  {streamFailed ? '실시간 영상을 불러올 수 없습니다.' : '연결 중'}
                </div>
              )}
            </>
          ) : (
            <div className="stream-empty">Jetson IP를 입력하면 실시간 영상이 표시됩니다.</div>
          )}
        </div>
      </section>

      <WorkerDetailModal
        worker={selectedWorker ? workers.find((worker) => worker.id === selectedWorker.id) || selectedWorker : null}
        onClose={() => setSelectedWorker(null)}
      />
    </div>
  );
};

export default DashboardPage;

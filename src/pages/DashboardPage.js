import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useAlert } from '../context/AlertContext';
import { useWorker } from '../context/WorkerContext';
import WorkerDetailModal from '../components/worker/WorkerDetailModal';
import { droneAPI } from '../services/api';
import { useRealtime } from '../context/RealtimeContext';
import { MOCK_GPS, WORKER_STATUS } from '../utils/constants';
import { getRelativeTime } from '../utils/helpers';
import './DashboardPage.css';

const statusLabel = {
  [WORKER_STATUS.NORMAL]: '정상',
  [WORKER_STATUS.WARNING]: '주의',
  [WORKER_STATUS.DANGER]: '위험',
  [WORKER_STATUS.OFF_DUTY]: '근무 외',
};

const alertLevel = (severity) => {
  if (severity === 'warning') return { className: 'warning', label: '주의' };
  if (severity === 'danger' || severity === 'emergency') return { className: 'danger', label: '위험' };
  return { className: 'info', label: '정보' };
};

const DEFAULT_LOCATION = { ...MOCK_GPS.worker, label: '현재 위치' };
const DRONE_LOCATION = { ...MOCK_GPS.drone, label: '드론' };

const normalizeDrone = (drone) => ({
  ...drone,
  // 실시간 드론 GPS API 값은 현장 연동 전까지 주석 처리하고 목데이터로 고정합니다.
  // location: drone.currentLatitude != null && drone.currentLongitude != null
  //   ? { lat: Number(drone.currentLatitude), lng: Number(drone.currentLongitude) }
  //   : null,
  location: MOCK_GPS.drone,
});

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

const MapAutoFit = ({ workers, drones }) => {
  const map = useMap();

  useEffect(() => {
    const points = workers
      .filter((worker) => worker.location?.lat != null && worker.location?.lng != null)
      .map((worker) => mapPositionForWorker(worker));
    const dronePoints = drones
      .filter((drone) => isDisplayableCoordinate(drone.location?.lat, drone.location?.lng))
      .map((drone) => [drone.location.lat, drone.location.lng]);
    const nextPoints = [...points, ...dronePoints, [DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng]];
    map.fitBounds(nextPoints, { padding: [36, 36], maxZoom: 17 });
  }, [drones, map, workers]);

  return null;
};

const DashboardPage = () => {
  const { workers } = useWorker();
  const { alerts, unreadCount } = useAlert();
  const { subscribe } = useRealtime();
  const [drones, setDrones] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [jetsonIp, setJetsonIp] = useState('172.20.10.2:8889');
  const [streamPath, setStreamPath] = useState('yolo_out/');
  const [streamLoading, setStreamLoading] = useState(false);
  const [alertFilter, setAlertFilter] = useState('all');
  const streamFailTimerRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      const droneResult = await droneAPI.getAll();
      if (droneResult.success) setDrones((droneResult.data || []).map(normalizeDrone));
    };
    load();
    const intervalId = window.setInterval(load, 5000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const unsubscribeDrone = subscribe('drone', (drone) => {
      setDrones((current) => {
        const normalized = normalizeDrone(drone);
        const existing = current.find((item) => String(item.id) === String(normalized.id));
        return existing
          ? current.map((item) => String(item.id) === String(normalized.id) ? normalized : item)
          : [normalized, ...current];
      });
    });
    const unsubscribeDroneDeleted = subscribe('drone-deleted', ({ id }) => {
      setDrones((current) => current.filter((drone) => String(drone.id) !== String(id)));
    });
    return () => {
      unsubscribeDrone();
      unsubscribeDroneDeleted();
    };
  }, [subscribe]);

  useEffect(() => {
    const focusWorker = (event) => {
      const workerId = event.detail?.workerId;
      const worker = workers.find((item) => String(item.id) === String(workerId));
      if (worker) setSelectedWorker(worker);
    };
    window.addEventListener('worksafe:focus-worker', focusWorker);
    return () => window.removeEventListener('worksafe:focus-worker', focusWorker);
  }, [workers]);

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

  const locatedDrones = useMemo(() => drones.filter((drone) =>
    isDisplayableCoordinate(drone.location?.lat, drone.location?.lng)
  ), [drones]);

  const displayedDrones = useMemo(() => locatedDrones.length > 0
    ? locatedDrones
    : [{
      id: 'default-drone',
      name: DRONE_LOCATION.label,
      location: { lat: DRONE_LOCATION.lat, lng: DRONE_LOCATION.lng },
    }], [locatedDrones]);

  const filteredAlerts = useMemo(() => {
    if (alertFilter === 'all') return alerts;
    return alerts.filter((alert) => {
      const level = alertLevel(alert.severity).className;
      return level === alertFilter;
    });
  }, [alertFilter, alerts]);

  const mediaMtxStreamUrl = useMemo(() => {
    const trimmedIp = jetsonIp.trim();
    const normalizedPath = streamPath.trim().replace(/^\/+/, '');
    if (!trimmedIp || !normalizedPath) return '';
    return `http://${trimmedIp}/${normalizedPath}?autoplay=true&muted=true&controls=false&playsInline=true`;
  }, [jetsonIp, streamPath]);

  useEffect(() => {
    if (streamFailTimerRef.current) {
      window.clearTimeout(streamFailTimerRef.current);
      streamFailTimerRef.current = null;
    }

    if (!mediaMtxStreamUrl) {
      setStreamLoading(false);
      return undefined;
    }

    setStreamLoading(true);
    streamFailTimerRef.current = window.setTimeout(() => {
      setStreamLoading(false);
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
          <div className="alert-heading-meta">
            <div className="alert-level-filters" aria-label="알림 단계 필터">
              <button
                type="button"
                className={alertFilter === 'warning' ? 'is-active is-warning' : 'is-warning'}
                onClick={() => setAlertFilter('warning')}
              >
                주의
              </button>
              <button
                type="button"
                className={alertFilter === 'danger' ? 'is-active is-danger' : 'is-danger'}
                onClick={() => setAlertFilter('danger')}
              >
                위험
              </button>
              <button
                type="button"
                className={alertFilter === 'all' ? 'is-active is-all' : 'is-all'}
                onClick={() => setAlertFilter('all')}
              >
                전체
              </button>
            </div>
            <span>미확인 {unreadCount}건</span>
          </div>
        </div>
        <div className="alerts-list">
          {filteredAlerts.map((alert) => {
            const level = alertLevel(alert.severity);
            return (
              <div key={alert.id} className={`alert-item ${level.className}`}>
                <div className="alert-copy">
                  <strong>{alert.workerName || '작업자'}</strong>
                </div>
                <time>{getRelativeTime(alert.timestamp)}</time>
              </div>
            );
          })}
          {filteredAlerts.length === 0 && <div className="empty-state">해당 알림이 없습니다.</div>}
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
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="dashboard-map-panel">
        <div className="section-heading">
          <div>
            <h2>작업자/드론 위치</h2>
          </div>
          <span className="map-count">{locatedWorkers.length}명 표시</span>
        </div>
        <div className="leaflet-map-wrap">
          <MapContainer center={mapCenter} zoom={15} scrollWheelZoom className="worker-map">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapAutoFit workers={locatedWorkers} drones={locatedDrones} />
            {locatedWorkers.map((worker) => {
              const position = mapPositionForWorker(worker);
              return (
                <Marker
                  key={worker.id}
                  position={position}
                  icon={markerIcon('danger')}
                >
                  <Popup>
                    <strong>{worker.name}</strong>
                    <br />
                    {statusLabel[worker.status] || worker.status}
                    <br />
                    GPS: {position[0]}, {position[1]}
                  </Popup>
                </Marker>
              );
            })}
            {locatedDrones.length > 0 ? locatedDrones.map((drone) => (
              <Marker
                key={drone.id}
                position={[drone.location.lat, drone.location.lng]}
                icon={markerIcon('drone')}
              >
                <Popup>
                    <strong>드론</strong>
                  <br />
                  {drone.location.lat}, {drone.location.lng}
                </Popup>
              </Marker>
            )) : (
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
            )}
          </MapContainer>
          <aside className="map-gps-overlay" aria-label="작업자 및 드론 실시간 GPS">
            <div className="map-gps-overlay__list">
              {workers.map((worker) => (
                <div className="map-gps-overlay__item" key={worker.id}>
                  <span className="map-gps-overlay__worker">
                    <i
                      className="is-danger"
                      aria-hidden="true"
                    />
                    {worker.name}
                  </span>
                  <span>
                    {worker.location?.lat != null && worker.location?.lng != null
                      ? `${worker.location.lat}, ${worker.location.lng}`
                      : 'GPS 대기'}
                  </span>
                </div>
              ))}
              {displayedDrones.map((drone) => (
                <div className="map-gps-overlay__item" key={`gps-drone-${drone.id}`}>
                  <span className="map-gps-overlay__worker">
                    <i className="is-drone" aria-hidden="true" />
                    드론
                  </span>
                  <span>{drone.location.lat}, {drone.location.lng}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="dashboard-stream-panel">
        <div className="section-heading">
          <div>
            <h2>실시간 드론 영상</h2>
          </div>
        </div>
        <div className="stream-config">
          <label>Jetson IP<input value={jetsonIp} placeholder="172.20.10.2:8889" onChange={(event) => setJetsonIp(event.target.value)} /></label>
          <label>Stream Path<input value={streamPath} placeholder="yolo_out/" onChange={(event) => setStreamPath(event.target.value)} /></label>
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
                }}
              />
              {streamLoading && <div className="stream-loading">연결 중</div>}
            </>
          ) : (
            <div className="stream-empty">Jetson IP를 입력하면 실시간 영상이 표시됩니다.</div>
          )}
        </div>
      </section>

      <WorkerDetailModal
        worker={selectedWorker ? workers.find((worker) => worker.id === selectedWorker.id) || selectedWorker : null}
        showGps={false}
        onClose={() => setSelectedWorker(null)}
      />
    </div>
  );
};

export default DashboardPage;

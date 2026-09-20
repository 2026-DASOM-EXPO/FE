import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useWorker } from '../context/WorkerContext';
import { equipmentAPI, sensorAPI } from '../services/api';
import WorkerCard from '../components/worker/WorkerCard';
import WorkerDetailModal from '../components/worker/WorkerDetailModal';
import { idsEqual, mergeEquipmentSensor, sensorEquipmentId } from '../utils/realtimeState';
import { useRealtime } from '../context/RealtimeContext';
import './EquipmentPage.css';

const typeLabel = {
  HELMET: '안전모',
  VEST: '안전조끼',
  SHOES: '안전화',
  SOS_BUTTON: 'SOS 버튼',
  BELT: '안전벨트',
  SENSOR_DEVICE: '센서 장치',
  GPS_MODULE: 'GPS 모듈',
};
const statusLabel = { AVAILABLE: '사용 가능', ASSIGNED: '배정됨', LOST: '분실', BROKEN: '고장', DISCARDED: '폐기' };
const wearLabel = { WORN: '착용', NOT_WORN: '미착용', UNKNOWN: '미확인' };
const statusTone = { AVAILABLE: 'info', ASSIGNED: 'success', LOST: 'danger', BROKEN: 'warning', DISCARDED: 'danger' };

const EquipmentPage = () => {
  const { workers, fetchWorkers } = useWorker();
  const { subscribe } = useRealtime();
  const [equipment, setEquipment] = useState([]);
  const [sensorByEquipment, setSensorByEquipment] = useState({});
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('장비 정보를 불러오는 중입니다.');

  const upsertEquipment = useCallback((incoming) => {
    setEquipment((current) => {
      const exists = current.some((item) => idsEqual(item.id, incoming.id));
      return exists
        ? current.map((item) => idsEqual(item.id, incoming.id) ? { ...item, ...incoming } : item)
        : [incoming, ...current];
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await equipmentAPI.getAll();
    if (result.success) {
      const list = result.data || [];
      setEquipment(list);
      setMessage(`장비 ${list.length}개를 동기화했습니다.`);
      const sensorResults = await Promise.all(list.map(async (item) => ({
        equipmentId: item.id,
        result: await sensorAPI.getByEquipment(item.id),
      })));
      setSensorByEquipment(Object.fromEntries(sensorResults.flatMap(({ equipmentId, result: sensorResult }) => {
        const latest = sensorResult.success ? sensorResult.data?.[0] : null;
        return latest ? [[equipmentId, latest]] : [];
      })));
    } else {
      setMessage(result.error || '장비 정보를 불러오지 못했습니다.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); fetchWorkers(); }, [fetchWorkers, load]);

  useEffect(() => {
    const stopEquipment = subscribe('equipment', upsertEquipment);
    const stopDeleted = subscribe('equipment-deleted', ({ id }) => {
      setEquipment((current) => current.filter((item) => !idsEqual(item.id, id)));
    });
    const stopSensor = subscribe('sensor', (sensor) => {
      const equipmentId = sensorEquipmentId(sensor);
      if (equipmentId == null) return;
      setSensorByEquipment((current) => ({ ...current, [equipmentId]: sensor }));
      setEquipment((current) => mergeEquipmentSensor(current, sensor));
    });
    return () => {
      stopEquipment();
      stopDeleted();
      stopSensor();
    };
  }, [subscribe, upsertEquipment]);

  const selectedWorkerLatest = useMemo(() => {
    if (!selectedWorker) return null;
    return workers.find((worker) => idsEqual(worker.id, selectedWorker.id)) || selectedWorker;
  }, [selectedWorker, workers]);

  return (
    <div className="equipment-page equipment-page--simple">
      <section className="workers-section">
        <div className="section-heading">
          <div><h2>작업자 상태 모니터링</h2><span>{workers.length}명</span></div>
        </div>
        <div className="workers-grid">
          {workers.map((worker) => (
            <WorkerCard key={worker.id} worker={worker} onClick={() => setSelectedWorker(worker)} />
          ))}
          {workers.length === 0 && <div className="equipment-empty">등록된 작업자가 없습니다.</div>}
        </div>
      </section>

      <section className="equipment-detail equipment-list-only">
        <div className="equipment-detail__header">
          <div><span>장비 목록</span><h2>등록 장비 현황</h2><p>{message}</p></div>
        </div>
        <div className="equipment-list-panel">
          {loading && <div className="equipment-empty">불러오는 중...</div>}
          {!loading && equipment.length === 0 && <div className="equipment-empty">등록된 장비가 없습니다.</div>}
          {equipment.map((item) => {
            const sensor = sensorByEquipment[item.id];
            return (
              <div key={item.id} className="equipment-row equipment-row--static">
                <div>
                  <strong><em className="equipment-id">ID #{item.id}</em>{item.name}</strong>
                  <span>{item.serialNumber} · {typeLabel[item.type] || item.type}</span>
                </div>
                <span>{wearLabel[sensor?.wearStatus || item.wearStatus] || item.wearStatus}</span>
                <span className={`equipment-status equipment-status--${statusTone[item.status] || 'info'}`}>{statusLabel[item.status] || item.status}</span>
              </div>
            );
          })}
        </div>
      </section>

      <WorkerDetailModal
        worker={selectedWorkerLatest}
        onClose={() => setSelectedWorker(null)}
      />
    </div>
  );
};

export default EquipmentPage;

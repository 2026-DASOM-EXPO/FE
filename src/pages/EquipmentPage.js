import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useWorker } from '../context/WorkerContext';
import { useRealtime } from '../context/RealtimeContext';
import { equipmentAPI, sensorAPI, wearableCommandAPI } from '../services/api';
import EntityModal from '../components/common/EntityModal';
import { idsEqual, mergeEquipmentSensor, sensorEquipmentId } from '../utils/realtimeState';
import './EquipmentPage.css';

const typeLabel = {
  HELMET: '안전모(FSR)',
  VEST: '안전조끼',
  SHOES: '안전화(FSR)',
  SOS_BUTTON: '안전조끼 SOS 버튼',
  BELT: '안전벨트',
  SENSOR_DEVICE: '센서 장치',
  GPS_MODULE: 'GPS 모듈',
};
const statusLabel = { AVAILABLE: '사용 가능', ASSIGNED: '배정됨', LOST: '분실', BROKEN: '고장', DISCARDED: '폐기' };
const wearLabel = { WORN: '착용', NOT_WORN: '미착용', UNKNOWN: '미확인' };
const statusTone = { AVAILABLE: 'info', ASSIGNED: 'success', LOST: 'danger', BROKEN: 'warning', DISCARDED: 'danger' };
const commandLabel = { BUZZER_ON: '부저 켜기', BUZZER_OFF: '부저 끄기', TIMER_START: '타이머 시작', TIMER_STOP: '타이머 종료' };
const emptyForm = { serialNumber: '', name: '', type: 'HELMET' };
const realtimeFilters = [
  { id: 'all', label: '전체' },
  { id: 'sensor', label: '센서' },
  { id: 'equipment', label: '장비' },
  { id: 'drone', label: '드론' },
  { id: 'alert', label: 'SOS·알림' },
];
const realtimeGroup = (type) => {
  if (type === 'sensor') return 'sensor';
  if (type.startsWith('equipment')) return 'equipment';
  if (['drone', 'drone-deleted', 'dispatch', 'video'].includes(type)) return 'drone';
  return 'alert';
};
const realtimeLabel = (type) => ({
  sensor: '센서 값 변경',
  equipment: '장비 상태 변경',
  'equipment-deleted': '장비 삭제',
  worker: '작업자 상태 변경',
  'worker-deleted': '작업자 삭제',
  drone: '드론 상태 변경',
  'drone-deleted': '드론 삭제',
  dispatch: '드론 출동 상태',
  video: '영상 스트리밍 상태',
  risk: '위험 이벤트 상태',
  alert: 'SOS·관리자 알림',
}[type] || type);
const realtimeIdentity = (data = {}) => {
  const id = data.equipment?.id ?? data.drone?.id ?? data.worker?.id
    ?? data.equipmentId ?? data.droneId ?? data.workerId ?? data.dispatchId ?? data.id;
  return id == null ? '-' : `#${id}`;
};
const realtimeDescription = (type, data = {}) => {
  if (type === 'sensor') {
    const value = data.pressureValue ?? (data.sosPressed == null ? '-' : Number(data.sosPressed));
    return `${data.equipment?.type || data.sensorType || '센서'} · 값 ${value} · ${data.wearStatus || data.riskLevel || '-'}`;
  }
  if (type === 'equipment') return `${data.name || data.serialNumber || '안전장비'} · ${data.wearStatus || data.status || '-'}`;
  if (type === 'drone') return `${data.name || data.serialNumber || '드론'} · ${data.status || '-'} · 배터리 ${data.batteryPercent ?? '-'}%`;
  if (type === 'dispatch') return `${data.drone?.name || '드론'} · ${data.status || '-'} · ${data.commandMessage || ''}`;
  if (type === 'video') return `${data.streamStatus || (data.active ? 'STREAMING' : 'STOPPED')} · ${data.streamUrl || ''}`;
  return data.message || data.title || `${data.riskType || data.alertType || '이벤트'} · ${data.status || data.riskLevel || '-'}`;
};
const formatTime = (value) => value
  ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value))
  : '-';

const EquipmentPage = () => {
  const { workers, fetchWorkers } = useWorker();
  const { status: realtimeStatus, events, subscribe } = useRealtime();
  const [equipment, setEquipment] = useState([]);
  const [commands, setCommands] = useState([]);
  const [sensorByEquipment, setSensorByEquipment] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('장비 정보를 불러오는 중입니다.');
  const [modalMode, setModalMode] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [command, setCommand] = useState({ workerId: '', equipmentId: '', commandType: 'BUZZER_ON', reason: '' });
  const [realtimeFilter, setRealtimeFilter] = useState('all');

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
    const [equipmentResult, commandResult] = await Promise.all([
      equipmentAPI.getAll(),
      wearableCommandAPI.getPending(),
    ]);
    if (equipmentResult.success) {
      const list = equipmentResult.data || [];
      setEquipment(list);
      setSelectedId((current) => current && list.some((item) => item.id === current) ? current : list[0]?.id ?? null);
      setMessage(`장비 ${list.length}개를 동기화했습니다.`);
      const sensorEquipment = list.filter((item) => ['HELMET', 'SHOES', 'VEST', 'SOS_BUTTON'].includes(item.type));
      const sensorResults = await Promise.all(sensorEquipment.map(async (item) => ({
        equipmentId: item.id,
        result: await sensorAPI.getByEquipment(item.id),
      })));
      setSensorByEquipment(Object.fromEntries(sensorResults.flatMap(({ equipmentId, result }) => {
        const latest = result.success ? result.data?.[0] : null;
        return latest ? [[equipmentId, latest]] : [];
      })));
    } else {
      setMessage(equipmentResult.error || '장비 정보를 불러오지 못했습니다.');
    }
    if (commandResult.success) setCommands(commandResult.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); fetchWorkers(); }, [fetchWorkers, load]);
  useEffect(() => {
    if (realtimeStatus !== 'live') return;
    load();
  }, [load, realtimeStatus]);
  useEffect(() => {
    const stopEquipment = subscribe('equipment', upsertEquipment);
    const stopDeleted = subscribe('equipment-deleted', ({ id }) => {
      setEquipment((current) => current.filter((item) => item.id !== id));
      setSelectedId((current) => current === id ? null : current);
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

  const selected = useMemo(() => equipment.find((item) => item.id === selectedId) || null, [equipment, selectedId]);
  const selectedSensor = selected ? sensorByEquipment[selected.id] : null;
  const isSosEquipment = selected && ['VEST', 'SOS_BUTTON'].includes(selected.type);
  const totalWorn = equipment.filter((item) => item.wearStatus === 'WORN').length;
  const abnormal = equipment.filter((item) => ['LOST', 'BROKEN'].includes(item.status)).length;
  const visibleEvents = useMemo(
    () => events.filter((item) => realtimeFilter === 'all' || realtimeGroup(item.type) === realtimeFilter).slice(0, 30),
    [events, realtimeFilter]
  );

  const run = async (request, successMessage) => {
    setMessage('서버 요청을 처리하는 중입니다.');
    const result = await request();
    setMessage(result.success ? successMessage : result.error || '요청을 처리하지 못했습니다.');
    if (result.success && result.data?.id) upsertEquipment(result.data);
    return result;
  };

  const openCreate = () => {
    setForm(emptyForm);
    setModalMode('create');
  };

  const openEdit = () => {
    if (!selected) return;
    setForm({ serialNumber: selected.serialNumber, name: selected.name, type: selected.type });
    setModalMode('edit');
  };

  const saveEquipment = async (event) => {
    event.preventDefault();
    setBusy(true);
    const result = modalMode === 'create'
      ? await run(
        () => equipmentAPI.create({ ...form, status: 'AVAILABLE', wearStatus: 'UNKNOWN' }),
        '신규 장비를 등록했습니다.'
      )
      : await run(() => equipmentAPI.update(selected.id, form), '장비 정보를 수정했습니다.');
    setBusy(false);
    if (result.success) setModalMode(null);
  };

  const deleteEquipment = async () => {
    if (!selected || !window.confirm(`#${selected.id} ${selected.name} 장비를 삭제할까요?`)) return;
    const result = await run(() => equipmentAPI.delete(selected.id), '장비를 삭제했습니다.');
    if (result.success) {
      setEquipment((current) => current.filter((item) => item.id !== selected.id));
      setSelectedId(null);
    }
  };

  const submitCommand = async (event) => {
    event.preventDefault();
    const result = await wearableCommandAPI.create({
      ...command,
      workerId: Number(command.workerId),
      equipmentId: Number(command.equipmentId),
    });
    setMessage(result.success ? '웨어러블 명령을 전송했습니다.' : result.error);
    if (result.success) {
      const pending = await wearableCommandAPI.getPending();
      if (pending.success) setCommands(pending.data || []);
    }
  };

  const acknowledge = async (id) => {
    const result = await wearableCommandAPI.acknowledge(id);
    setMessage(result.success ? '명령 확인 처리를 완료했습니다.' : result.error);
    if (result.success) setCommands((current) => current.filter((item) => item.id !== id));
  };

  return (
    <div className="equipment-page">
      <section className="equipment-hero">
        <div>
          <span>WORKSAFE+ EQUIPMENT CONTROL</span>
          <h1>안전장비 관리</h1>
          <p>장비 자산, FSR 센서, SOS 장치와 웨어러블 명령을 한 화면에서 관리합니다.</p>
        </div>
        <div className="equipment-server-card">
          <span>SSE 상태</span>
          <strong className={`realtime-state realtime-state--${realtimeStatus}`}>{realtimeStatus === 'live' ? 'LIVE 연결됨' : '연결 중'}</strong>
          <button type="button" className="btn-primary" onClick={openCreate}>장비 등록</button>
        </div>
      </section>

      <section className="equipment-summary-grid">
        <div><span>전체 장비</span><strong>{equipment.length}개</strong></div>
        <div><span>착용 중</span><strong>{totalWorn}개</strong></div>
        <div><span>미착용</span><strong>{equipment.filter((item) => item.wearStatus === 'NOT_WORN').length}개</strong></div>
        <div><span>분실·고장</span><strong>{abnormal}개</strong></div>
      </section>

      <div className="equipment-workspace equipment-workspace--unified">
        <section className="equipment-detail">
          <div className="equipment-detail__header">
            <div><span>장비 목록</span><h2>등록 장비 현황</h2><p>{message}</p></div>
          </div>
          <div className="equipment-list-panel">
            {loading && <div className="equipment-empty">불러오는 중...</div>}
            {!loading && equipment.length === 0 && <div className="equipment-empty">등록된 장비가 없습니다.</div>}
            {equipment.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`equipment-row ${selectedId === item.id ? 'is-active' : ''}`}
                onClick={() => setSelectedId(item.id)}
              >
                <div>
                  <strong><em className="equipment-id">ID #{item.id}</em>{item.name}</strong>
                  <span>{item.serialNumber} · {typeLabel[item.type] || item.type}</span>
                </div>
                <span>{wearLabel[item.wearStatus] || item.wearStatus}</span>
                <span className={`equipment-status equipment-status--${statusTone[item.status] || 'info'}`}>{statusLabel[item.status] || item.status}</span>
              </button>
            ))}
          </div>

          {selected && (
            <>
              <div className="equipment-info-grid">
                <div><span>장비 ID</span><strong>#{selected.id}</strong></div>
                <div><span>배정 작업자</span><strong>{selected.worker?.name || '미배정'}</strong></div>
                <div>
                  <span>{isSosEquipment ? '실시간 SOS 값' : '실시간 ADC'}</span>
                  <strong>{isSosEquipment ? (selectedSensor ? Number(selectedSensor.sosPressed) : '-') : `${selectedSensor?.pressureValue ?? '-'} / 4095`}</strong>
                </div>
                <div>
                  <span>센서 판정</span>
                  <strong>{isSosEquipment ? (selectedSensor?.sosPressed ? 'SOS 발생' : '정상') : (wearLabel[selectedSensor?.wearStatus || selected.wearStatus] || '미확인')}</strong>
                </div>
                <div><span>최근 센서 수신</span><strong>{formatTime(selectedSensor?.measuredAt || selected.lastDetectedAt)}</strong></div>
                <div><span>부저</span><strong>{selected.buzzerEnabled ? 'ON' : 'OFF'}</strong></div>
              </div>
              <div className="equipment-code-panel">
                <span>장비 제어</span>
                <select
                  value={selected.worker?.id || ''}
                  onChange={(event) => event.target.value && run(
                    () => equipmentAPI.assign(selected.id, Number(event.target.value)),
                    '작업자를 배정했습니다.'
                  )}
                >
                  <option value="">작업자 배정</option>
                  {workers.map((worker) => <option key={worker.id} value={worker.id}>#{worker.id} {worker.name}</option>)}
                </select>
                <button type="button" onClick={openEdit}>수정</button>
                <button type="button" onClick={deleteEquipment}>삭제</button>
              </div>
            </>
          )}
        </section>

        <section className="equipment-command-panel">
          <div className="equipment-detail__header">
            <div><span>웨어러블 명령</span><h2>명령 전송</h2><p>부저와 작업 타이머 명령을 장비에 전송합니다.</p></div>
          </div>
          <form className="equipment-command-form" onSubmit={submitCommand}>
            <label>작업자<select required value={command.workerId} onChange={(e) => setCommand((p) => ({ ...p, workerId: e.target.value }))}><option value="">선택</option>{workers.map((item) => <option key={item.id} value={item.id}>#{item.id} {item.name}</option>)}</select></label>
            <label>장비<select required value={command.equipmentId} onChange={(e) => setCommand((p) => ({ ...p, equipmentId: e.target.value }))}><option value="">선택</option>{equipment.map((item) => <option key={item.id} value={item.id}>ID #{item.id} · {item.name}</option>)}</select></label>
            <label>명령<select value={command.commandType} onChange={(e) => setCommand((p) => ({ ...p, commandType: e.target.value }))}>{Object.entries(commandLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>사유<input value={command.reason} onChange={(e) => setCommand((p) => ({ ...p, reason: e.target.value }))} maxLength="500" /></label>
            <button className="btn-primary" type="submit">명령 전송</button>
          </form>
          <div className="equipment-command-list">
            <h3>대기 명령 {commands.length}건</h3>
            {commands.map((item) => (
              <div key={item.id} className="equipment-command-row">
                <div><strong>{commandLabel[item.commandType] || item.commandType}</strong><span>ID #{item.equipment?.id} · {item.worker?.name}</span></div>
                <button type="button" onClick={() => acknowledge(item.id)}>확인 처리</button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="equipment-realtime-panel">
        <div className="equipment-realtime-header">
          <div>
            <span>통합 실시간 모니터링</span>
            <h2>센서·장비·드론·SOS 이벤트</h2>
            <p>별도 화면 이동이나 새로고침 없이 SSE 변경 내역이 최신순으로 표시됩니다.</p>
          </div>
          <div className="equipment-realtime-tabs" role="tablist" aria-label="실시간 이벤트 필터">
            {realtimeFilters.map((item) => (
              <button
                key={item.id}
                type="button"
                className={realtimeFilter === item.id ? 'is-active' : ''}
                onClick={() => setRealtimeFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="equipment-realtime-list" aria-live="polite">
          {visibleEvents.length === 0 ? (
            <div className="equipment-empty">
              선택한 유형의 이벤트가 아직 없습니다. 실제 센서 입력이나 상태 변경이 발생하면 자동 표시됩니다.
            </div>
          ) : visibleEvents.map((item) => (
            <article key={item.id} className={`equipment-realtime-row equipment-realtime-row--${realtimeGroup(item.type)}`}>
              <div>
                <span>{realtimeLabel(item.type)}</span>
                <strong>ID {realtimeIdentity(item.data)}</strong>
              </div>
              <div>
                <strong>{realtimeDescription(item.type, item.data)}</strong>
                <time>{new Date(item.receivedAt).toLocaleString('ko-KR')}</time>
              </div>
            </article>
          ))}
        </div>
      </section>

      {modalMode && (
        <EntityModal
          title={modalMode === 'create' ? '안전장비 등록' : `장비 ID #${selected.id} 수정`}
          description="등록·수정 후 목록과 센서 상태는 SSE로 자동 갱신됩니다."
          onClose={() => setModalMode(null)}
          onSubmit={saveEquipment}
          submitLabel={modalMode === 'create' ? '등록' : '수정'}
          busy={busy}
        >
          <label>장비명<input required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></label>
          <label>시리얼 번호<input required value={form.serialNumber} onChange={(e) => setForm((p) => ({ ...p, serialNumber: e.target.value }))} /></label>
          <label className="entity-modal__full">장비 종류<select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>{Object.entries(typeLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </EntityModal>
      )}
    </div>
  );
};

export default EquipmentPage;

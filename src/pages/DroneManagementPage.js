import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { droneAPI, riskEventAPI } from '../services/api';
import { useRealtime } from '../context/RealtimeContext';
import EntityModal from '../components/common/EntityModal';
import { DroneVideoPlayer } from '../components/dashboard/EmergencyAlertModal';
import './DroneManagementPage.css';

const labels = { READY: '대기', FLYING: '비행 중', RETURNING: '복귀 중', CHARGING: '충전 중', MAINTENANCE: '정비 중', DISABLED: '비활성' };
const tones = { READY: 'success', FLYING: 'info', RETURNING: 'info', CHARGING: 'warning', MAINTENANCE: 'warning', DISABLED: 'danger' };
const emptyForm = { name: '', serialNumber: '', modelName: 'SIYI A8 Mini', maxFlightMinutes: 30, payloadMounted: false, status: 'READY', batteryPercent: 100 };
const activeStatuses = new Set(['REQUESTED', 'DISPATCHED', 'ARRIVED', 'KIT_DROPPED']);

const DroneManagementPage = () => {
  const { status: realtimeStatus, subscribe } = useRealtime();
  const [drones, setDrones] = useState([]);
  const [risks, setRisks] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [videos, setVideos] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState('드론 관제 데이터를 불러오는 중입니다.');
  const [entityModal, setEntityModal] = useState(null);
  const [dispatchModal, setDispatchModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [dispatchForm, setDispatchForm] = useState({ droneId: '', riskEventId: '', commandMessage: '관리자 수동 출동' });
  const [busy, setBusy] = useState(false);

  const upsert = (setter, incoming) => setter((current) => {
    const exists = current.some((item) => item.id === incoming.id);
    return exists ? current.map((item) => item.id === incoming.id ? incoming : item) : [incoming, ...current];
  });

  const load = useCallback(async () => {
    const [droneResult, riskResult, dispatchResult, reportResult] = await Promise.all([
      droneAPI.getAll(),
      riskEventAPI.getAll(),
      droneAPI.getDispatches(),
      riskEventAPI.getReports({}),
    ]);
    if (droneResult.success) {
      const list = droneResult.data || [];
      setDrones(list);
      setSelectedId((current) => current && list.some((item) => item.id === current) ? current : list[0]?.id ?? null);
    }
    if (riskResult.success) setRisks((riskResult.data || []).filter((item) => item.status !== 'RESOLVED'));
    if (dispatchResult.success) setDispatches(dispatchResult.data || []);
    if (reportResult.success) setVideos((reportResult.data || []).map((item) => item.droneVideo).filter(Boolean));
    setMessage(droneResult.success ? '드론 관제 데이터를 동기화했습니다.' : droneResult.error);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const stops = [
      subscribe('drone', (data) => upsert(setDrones, data)),
      subscribe('drone-deleted', ({ id }) => setDrones((current) => current.filter((item) => item.id !== id))),
      subscribe('dispatch', (data) => upsert(setDispatches, data)),
      subscribe('video', (data) => upsert(setVideos, data)),
      subscribe('risk', (data) => upsert(setRisks, data)),
    ];
    return () => stops.forEach((stop) => stop());
  }, [subscribe]);

  useEffect(() => {
    if (!dispatchForm.droneId) {
      const ready = drones.find((item) => item.status === 'READY');
      if (ready) setDispatchForm((current) => ({ ...current, droneId: String(ready.id) }));
    }
    if (!dispatchForm.riskEventId && risks[0]) {
      setDispatchForm((current) => ({ ...current, riskEventId: String(risks[0].id) }));
    }
  }, [dispatchForm.droneId, dispatchForm.riskEventId, drones, risks]);

  const selected = useMemo(() => drones.find((item) => item.id === selectedId) || null, [drones, selectedId]);
  const activeDispatch = useMemo(() => dispatches.find((item) => activeStatuses.has(item.status)) || null, [dispatches]);
  const activeVideo = useMemo(() => {
    if (!activeDispatch) return videos.find((item) => item.active) || null;
    return videos.find((item) => item.dispatchId === activeDispatch.id) || null;
  }, [activeDispatch, videos]);
  const averageBattery = drones.length
    ? Math.round(drones.reduce((sum, item) => sum + (item.batteryPercent || 0), 0) / drones.length)
    : 0;

  const openCreate = () => {
    setForm(emptyForm);
    setEntityModal('create');
  };

  const openEdit = () => {
    if (!selected) return;
    setForm({
      name: selected.name,
      serialNumber: selected.serialNumber,
      modelName: selected.modelName,
      maxFlightMinutes: selected.maxFlightMinutes,
      payloadMounted: selected.payloadMounted,
      status: selected.status,
      batteryPercent: selected.batteryPercent,
    });
    setEntityModal('edit');
  };

  const saveDrone = async (event) => {
    event.preventDefault();
    setBusy(true);
    const payload = {
      ...form,
      maxFlightMinutes: Number(form.maxFlightMinutes),
      batteryPercent: Number(form.batteryPercent),
    };
    const result = entityModal === 'create'
      ? await droneAPI.create(payload)
      : await droneAPI.update(selected.id, payload);
    setBusy(false);
    setMessage(result.success ? `드론을 ${entityModal === 'create' ? '등록' : '수정'}했습니다.` : result.error);
    if (result.success) {
      upsert(setDrones, result.data);
      setEntityModal(null);
    }
  };

  const confirmDispatch = async (event) => {
    event.preventDefault();
    setBusy(true);
    const risk = risks.find((item) => String(item.id) === dispatchForm.riskEventId);
    const result = await droneAPI.dispatch(Number(dispatchForm.droneId), {
      riskEventId: Number(dispatchForm.riskEventId),
      targetLatitude: risk?.latitude,
      targetLongitude: risk?.longitude,
      commandMessage: dispatchForm.commandMessage,
    });
    setBusy(false);
    setMessage(result.success ? '관리자 확인 후 드론 출동과 영상 스트리밍을 시작했습니다.' : result.error);
    if (result.success) {
      setDispatchModal(false);
      await load();
    }
  };

  const returnDrone = async () => {
    if (!activeDispatch) return;
    const result = await droneAPI.updateDispatchStatus(activeDispatch.id, 'RETURNED');
    setMessage(result.success ? '드론 복귀 명령을 전송했습니다.' : result.error);
  };

  const deleteDrone = async () => {
    if (!selected || !window.confirm(`#${selected.id} ${selected.name} 드론을 삭제할까요?`)) return;
    const result = await droneAPI.delete(selected.id);
    setMessage(result.success ? '드론을 삭제했습니다.' : result.error);
    if (result.success) {
      setDrones((current) => current.filter((item) => item.id !== selected.id));
      setSelectedId(null);
    }
  };

  return (
    <div className="drone-management-page">
      <section className="drone-management-hero">
        <div>
          <span>WORKSAFE+ DRONE CONTROL</span>
          <h1>드론 관제</h1>
          <p>드론 자산, 배터리, 관리자 수동 출동·복귀와 현장 영상을 통합 관리합니다.</p>
        </div>
        <div className="drone-management-server">
          <span>SSE 상태</span>
          <strong>{realtimeStatus === 'live' ? 'LIVE 연결됨' : '연결 중'}</strong>
          <button type="button" className="btn-primary" onClick={openCreate}>드론 등록</button>
        </div>
      </section>

      <section className="drone-management-summary">
        <div><span>전체 드론</span><strong>{drones.length}대</strong></div>
        <div><span>대기</span><strong>{drones.filter((item) => item.status === 'READY').length}대</strong></div>
        <div><span>활성 출동</span><strong>{dispatches.filter((item) => activeStatuses.has(item.status)).length}건</strong></div>
        <div><span>평균 배터리</span><strong>{averageBattery}%</strong></div>
      </section>

      <div className="drone-control-toolbar">
        <div><strong>{message}</strong><span>드론 출동은 반드시 관리자 확인 후 실행됩니다.</span></div>
        <div>
          <button type="button" className="btn-primary" onClick={() => setDispatchModal(true)}>출동 명령</button>
          <button type="button" onClick={returnDrone} disabled={!activeDispatch}>복귀</button>
        </div>
      </div>

      <div className="drone-management-workspace drone-management-workspace--unified">
        <section className="drone-management-detail">
          <div className="drone-management-detail__header"><div><span>드론 목록</span><h2>등록 드론 현황</h2><p>클릭하면 상태와 제어 정보를 확인합니다.</p></div></div>
          <div className="drone-management-list">
            {drones.map((item) => (
              <button key={item.id} type="button" className={`drone-management-row ${selectedId === item.id ? 'is-active' : ''}`} onClick={() => setSelectedId(item.id)}>
                <div><strong>ID #{item.id} · {item.name}</strong><span>{item.serialNumber}</span></div>
                <span>{item.modelName}</span>
                <span>{item.batteryPercent ?? '-'}%</span>
                <span className={`drone-management-status drone-management-status--${tones[item.status] || 'info'}`}>{labels[item.status] || item.status}</span>
              </button>
            ))}
          </div>
          {selected && (
            <>
              <div className="drone-management-info">
                <div><span>드론 ID</span><strong>#{selected.id}</strong></div>
                <div><span>배터리</span><strong>{selected.batteryPercent ?? '-'}%</strong></div>
                <div><span>비행 상태</span><strong>{labels[selected.status] || selected.status}</strong></div>
                <div><span>최대 비행</span><strong>{selected.maxFlightMinutes ?? '-'}분</strong></div>
              </div>
              <div className="drone-management-code">
                <button type="button" onClick={openEdit}>수정</button>
                <button type="button" onClick={deleteDrone}>삭제</button>
              </div>
            </>
          )}
        </section>

        <section className="drone-stream-panel">
          <div className="drone-management-detail__header">
            <div>
              <span>활성 출동</span>
              <h2>{activeDispatch ? `출동 #${activeDispatch.id}` : '대기 중'}</h2>
              <p>{activeDispatch?.commandMessage || 'SOS 경고 모달 또는 출동 명령에서 관리자가 승인하면 영상이 시작됩니다.'}</p>
            </div>
          </div>
          {activeDispatch && (
            <div className="drone-dispatch-summary">
              <div><span>드론</span><strong>{activeDispatch.drone?.name}</strong></div>
              <div><span>상태</span><strong>{activeDispatch.status}</strong></div>
              <div><span>119 요청</span><strong>요청하지 않음</strong></div>
            </div>
          )}
          {activeVideo?.active ? <DroneVideoPlayer video={activeVideo} /> : <div className="drone-stream-empty">현재 송출 중인 영상이 없습니다.</div>}
        </section>
      </div>

      {entityModal && (
        <EntityModal
          title={entityModal === 'create' ? '드론 등록' : `드론 #${selected.id} 수정`}
          description="등록과 수정은 관제 화면을 벗어나지 않고 처리됩니다."
          onClose={() => setEntityModal(null)}
          onSubmit={saveDrone}
          submitLabel={entityModal === 'create' ? '등록' : '수정'}
          busy={busy}
        >
          <label>드론명<input required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></label>
          <label>시리얼 번호<input required value={form.serialNumber} onChange={(e) => setForm((p) => ({ ...p, serialNumber: e.target.value }))} /></label>
          <label>모델명<input required value={form.modelName} onChange={(e) => setForm((p) => ({ ...p, modelName: e.target.value }))} /></label>
          <label>배터리(%)<input type="number" min="0" max="100" value={form.batteryPercent} onChange={(e) => setForm((p) => ({ ...p, batteryPercent: e.target.value }))} /></label>
          <label>최대 비행(분)<input type="number" min="1" value={form.maxFlightMinutes} onChange={(e) => setForm((p) => ({ ...p, maxFlightMinutes: e.target.value }))} /></label>
          <label>상태<select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </EntityModal>
      )}

      {dispatchModal && (
        <EntityModal
          title="드론 출동 명령 확인"
          description="확인을 누르면 실제 출동 명령이 생성되고 영상 스트리밍이 시작됩니다."
          onClose={() => setDispatchModal(false)}
          onSubmit={confirmDispatch}
          submitLabel="확인 후 출동"
          busy={busy}
        >
          <label>대기 드론<select required value={dispatchForm.droneId} onChange={(e) => setDispatchForm((p) => ({ ...p, droneId: e.target.value }))}><option value="">선택</option>{drones.filter((item) => item.status === 'READY').map((item) => <option key={item.id} value={item.id}>ID #{item.id} · {item.name}</option>)}</select></label>
          <label>위험 이벤트<select required value={dispatchForm.riskEventId} onChange={(e) => setDispatchForm((p) => ({ ...p, riskEventId: e.target.value }))}><option value="">선택</option>{risks.map((item) => <option key={item.id} value={item.id}>#{item.id} {item.riskType} / {item.riskLevel}</option>)}</select></label>
          <label className="entity-modal__full">명령 메시지<input required value={dispatchForm.commandMessage} onChange={(e) => setDispatchForm((p) => ({ ...p, commandMessage: e.target.value }))} /></label>
        </EntityModal>
      )}
    </div>
  );
};

export default DroneManagementPage;

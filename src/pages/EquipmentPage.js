import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useWorker } from '../context/WorkerContext';
import { equipmentAPI } from '../services/api';
import './EquipmentPage.css';

const typeLabel = { HELMET: '안전모', BELT: '안전벨트', SHOES: '안전화', SENSOR_DEVICE: '센서 장치', SOS_BUTTON: 'SOS 버튼', GPS_MODULE: 'GPS 모듈' };
const statusLabel = { AVAILABLE: '사용 가능', ASSIGNED: '배정됨', LOST: '분실', BROKEN: '고장', DISCARDED: '폐기' };
const wearLabel = { WORN: '착용', NOT_WORN: '미착용', UNKNOWN: '미확인' };
const statusTone = { AVAILABLE: 'info', ASSIGNED: 'success', LOST: 'danger', BROKEN: 'warning', DISCARDED: 'danger' };
const formatTime = (value) => value ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '-';

const EquipmentPage = () => {
  const { workers, fetchWorkers } = useWorker();
  const [equipment, setEquipment] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('장비 정보를 불러오는 중입니다.');
  const [form, setForm] = useState({ serialNumber: '', name: '', type: 'HELMET' });

  const loadEquipment = useCallback(async () => {
    setLoading(true);
    const result = await equipmentAPI.getAll();
    if (result.success) {
      const list = result.data || [];
      setEquipment(list);
      setSelectedId((current) => current && list.some((item) => item.id === current) ? current : list[0]?.id ?? null);
      setMessage(`장비 ${list.length}개를 동기화했습니다.`);
    } else setMessage(result.error || '장비 정보를 불러오지 못했습니다.');
    setLoading(false);
  }, []);

  useEffect(() => { loadEquipment(); fetchWorkers(); }, [fetchWorkers, loadEquipment]);
  const selected = useMemo(() => equipment.find((item) => item.id === selectedId) || null, [equipment, selectedId]);

  const run = async (request, successMessage) => {
    setMessage('서버 요청을 처리하는 중입니다.');
    const result = await request();
    setMessage(result.success ? successMessage : result.error || '요청을 처리하지 못했습니다.');
    if (result.success) await loadEquipment();
  };

  const createEquipment = async (event) => {
    event.preventDefault();
    await run(() => equipmentAPI.create({ ...form, status: 'AVAILABLE', wearStatus: 'UNKNOWN' }), '신규 장비를 등록했습니다.');
    setForm({ serialNumber: '', name: '', type: 'HELMET' });
  };

  const totalWorn = equipment.filter((item) => item.wearStatus === 'WORN').length;
  const abnormal = equipment.filter((item) => ['LOST', 'BROKEN'].includes(item.status)).length;

  return (
    <div className="equipment-page">
      <section className="equipment-hero">
        <div><span>WORKSAFE+ Equipment Registry</span><h1>안전장비 관리</h1><p>장비 등록, 작업자 배정, 착용 상태와 부저·작업 타이머를 실시간 관리합니다.</p></div>
        <div className="equipment-server-card"><span>서버 상태</span><strong>{message}</strong><button type="button" className="btn-primary" onClick={loadEquipment}>새로고침</button></div>
      </section>

      <section className="equipment-summary-grid">
        <div><span>전체 장비</span><strong>{equipment.length}개</strong></div>
        <div><span>착용 중</span><strong>{totalWorn}개</strong></div>
        <div><span>미착용</span><strong>{equipment.filter((item) => item.wearStatus === 'NOT_WORN').length}개</strong></div>
        <div><span>분실·고장</span><strong>{abnormal}개</strong></div>
      </section>

      <div className="equipment-workspace">
        <section className="equipment-action-list">
          <form className="equipment-action-card is-active" onSubmit={createEquipment}>
            <div><strong>신규 장비 등록</strong><span>POST</span></div>
            <label>장비명<input required value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} /></label>
            <label>시리얼 번호<input required value={form.serialNumber} onChange={(e) => setForm((prev) => ({ ...prev, serialNumber: e.target.value }))} /></label>
            <label>종류<select value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}>{Object.entries(typeLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <button className="btn-primary" type="submit">장비 등록</button>
          </form>
        </section>

        <section className="equipment-detail">
          <div className="equipment-detail__header"><div><span>장비 목록</span><h2>등록 장비 현황</h2><p>서버에 등록된 장비만 표시됩니다.</p></div></div>
          <div className="equipment-list-panel">
            {loading && <div className="equipment-empty">불러오는 중...</div>}
            {!loading && equipment.length === 0 && <div className="equipment-empty">등록된 장비가 없습니다.</div>}
            {equipment.map((item) => <button key={item.id} type="button" className={`equipment-row ${selectedId === item.id ? 'is-active' : ''}`} onClick={() => setSelectedId(item.id)}><div><strong>{item.name}</strong><span>{item.serialNumber} · {typeLabel[item.type] || item.type}</span></div><span>{wearLabel[item.wearStatus] || item.wearStatus}</span><span className={`equipment-status equipment-status--${statusTone[item.status] || 'info'}`}>{statusLabel[item.status] || item.status}</span></button>)}
          </div>

          {selected && <>
            <div className="equipment-info-grid">
              <div><span>배정 작업자</span><strong>{selected.worker?.name || '미배정'}</strong></div>
              <div><span>마지막 감지</span><strong>{formatTime(selected.lastDetectedAt)}</strong></div>
              <div><span>부저</span><strong>{selected.buzzerEnabled ? 'ON' : 'OFF'}</strong></div>
              <div><span>작업 타이머</span><strong>{selected.workTimerEnabled ? '동작 중' : '정지'}</strong></div>
            </div>
            <div className="equipment-code-panel">
              <span>장비 제어</span>
              <select defaultValue="" onChange={(e) => e.target.value && run(() => equipmentAPI.assign(selected.id, Number(e.target.value)), '작업자를 배정했습니다.')}><option value="">작업자 배정</option>{workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.name}</option>)}</select>
              <button type="button" onClick={() => run(() => equipmentAPI.setWearStatus(selected.id, selected.wearStatus === 'WORN' ? 'NOT_WORN' : 'WORN'), '착용 상태를 변경했습니다.')}>착용 상태 전환</button>
              <button type="button" onClick={() => run(() => equipmentAPI.setBuzzer(selected.id, { enabled: !selected.buzzerEnabled, reason: '관리자 수동 제어' }), '부저 상태를 변경했습니다.')}>부저 {selected.buzzerEnabled ? '끄기' : '켜기'}</button>
              <button type="button" onClick={() => run(() => selected.workTimerEnabled ? equipmentAPI.stopTimer(selected.id, '관리자 수동 제어') : equipmentAPI.startTimer(selected.id, '관리자 수동 제어'), '작업 타이머 상태를 변경했습니다.')}>타이머 {selected.workTimerEnabled ? '종료' : '시작'}</button>
            </div>
          </>}
        </section>
      </div>
    </div>
  );
};

export default EquipmentPage;

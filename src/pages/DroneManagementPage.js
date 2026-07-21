import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { droneAPI } from '../services/api';
import './DroneManagementPage.css';

const labels = { READY: '대기', FLYING: '비행 중', RETURNING: '복귀 중', CHARGING: '충전 중', MAINTENANCE: '정비 중', DISABLED: '비활성' };
const tones = { READY: 'success', FLYING: 'info', RETURNING: 'info', CHARGING: 'warning', MAINTENANCE: 'warning', DISABLED: 'danger' };
const formatTime = (value) => value ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '-';

const DroneManagementPage = () => {
  const [drones, setDrones] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('드론 정보를 불러오는 중입니다.');
  const [form, setForm] = useState({ name: '', serialNumber: '', modelName: '', maxFlightMinutes: 30, payloadMounted: false });

  const load = useCallback(async () => {
    setLoading(true);
    const result = await droneAPI.getAll();
    if (result.success) {
      const list = result.data || [];
      setDrones(list);
      setSelectedId((current) => current && list.some((item) => item.id === current) ? current : list[0]?.id ?? null);
      setMessage(`드론 ${list.length}대를 동기화했습니다.`);
    } else setMessage(result.error || '드론 정보를 불러오지 못했습니다.');
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const selected = useMemo(() => drones.find((item) => item.id === selectedId) || null, [drones, selectedId]);
  const run = async (request, successMessage) => {
    setMessage('서버 요청을 처리하는 중입니다.');
    const result = await request();
    setMessage(result.success ? successMessage : result.error || '요청에 실패했습니다.');
    if (result.success) await load();
  };
  const create = async (event) => {
    event.preventDefault();
    await run(() => droneAPI.create({ ...form, maxFlightMinutes: Number(form.maxFlightMinutes), status: 'READY', batteryPercent: 100 }), '드론을 등록했습니다.');
    setForm({ name: '', serialNumber: '', modelName: '', maxFlightMinutes: 30, payloadMounted: false });
  };

  const averageBattery = drones.length ? Math.round(drones.reduce((sum, item) => sum + (item.batteryPercent || 0), 0) / drones.length) : 0;
  return <div className="drone-management-page">
    <section className="drone-management-hero"><div><span>WORKSAFE+ Drone Registry</span><h1>드론 관리</h1><p>드론 자산과 비행 상태, 배터리 및 응급키트 장착 여부를 관리합니다.</p></div><div className="drone-management-server"><span>서버 상태</span><strong>{message}</strong><button type="button" className="btn-primary" onClick={load}>새로고침</button></div></section>
    <section className="drone-management-summary"><div><span>전체 드론</span><strong>{drones.length}대</strong></div><div><span>대기</span><strong>{drones.filter((item) => item.status === 'READY').length}대</strong></div><div><span>운항 중</span><strong>{drones.filter((item) => ['FLYING', 'RETURNING'].includes(item.status)).length}대</strong></div><div><span>평균 배터리</span><strong>{averageBattery}%</strong></div></section>
    <div className="drone-management-workspace">
      <section className="drone-management-actions"><form className="drone-management-action is-active" onSubmit={create}><div><strong>신규 드론 등록</strong><span>POST</span></div><label>드론명<input required value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} /></label><label>시리얼 번호<input required value={form.serialNumber} onChange={(e) => setForm((prev) => ({ ...prev, serialNumber: e.target.value }))} /></label><label>모델명<input required value={form.modelName} onChange={(e) => setForm((prev) => ({ ...prev, modelName: e.target.value }))} /></label><label>최대 비행(분)<input type="number" min="1" value={form.maxFlightMinutes} onChange={(e) => setForm((prev) => ({ ...prev, maxFlightMinutes: e.target.value }))} /></label><label><input type="checkbox" checked={form.payloadMounted} onChange={(e) => setForm((prev) => ({ ...prev, payloadMounted: e.target.checked }))} /> 응급키트 장착</label><button className="btn-primary" type="submit">드론 등록</button></form></section>
      <section className="drone-management-detail"><div className="drone-management-detail__header"><div><span>드론 목록</span><h2>등록 드론 현황</h2><p>서버에서 조회한 최신 상태입니다.</p></div></div>
        <div className="drone-management-list">{loading && <div className="drone-management-empty">불러오는 중...</div>}{!loading && drones.length === 0 && <div className="drone-management-empty">등록된 드론이 없습니다.</div>}{drones.map((item) => <button key={item.id} type="button" className={`drone-management-row ${selectedId === item.id ? 'is-active' : ''}`} onClick={() => setSelectedId(item.id)}><div><strong>{item.name}</strong><span>{item.serialNumber}</span></div><span>{item.modelName}</span><span className={`drone-management-status drone-management-status--${tones[item.status] || 'info'}`}>{labels[item.status] || item.status}</span></button>)}</div>
        {selected && <><div className="drone-management-info"><div><span>배터리</span><strong>{selected.batteryPercent ?? '-'}%</strong></div><div><span>최대 비행</span><strong>{selected.maxFlightMinutes ?? '-'}분</strong></div><div><span>응급키트</span><strong>{selected.payloadMounted ? '장착' : '미장착'}</strong></div><div><span>최근 갱신</span><strong>{formatTime(selected.updatedAt)}</strong></div></div><div className="drone-management-code"><span>상태 제어</span><select value={selected.status} onChange={(e) => run(() => droneAPI.update(selected.id, { status: e.target.value }), '드론 상태를 변경했습니다.')}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button type="button" onClick={() => run(() => droneAPI.update(selected.id, { payloadMounted: !selected.payloadMounted }), '응급키트 장착 상태를 변경했습니다.')}>응급키트 {selected.payloadMounted ? '해제' : '장착'}</button><button type="button" onClick={() => window.confirm(`${selected.name} 드론을 삭제할까요?`) && run(() => droneAPI.delete(selected.id), '드론을 삭제했습니다.')}>삭제</button></div></>}
      </section>
    </div>
  </div>;
};

export default DroneManagementPage;

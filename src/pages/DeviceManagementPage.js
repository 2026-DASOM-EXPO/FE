import React, { useCallback, useEffect, useState } from 'react';
import { useWorker } from '../context/WorkerContext';
import { equipmentAPI, wearableCommandAPI } from '../services/api';
import './DeviceManagementPage.css';

const commandLabel = { BUZZER_ON: '부저 켜기', BUZZER_OFF: '부저 끄기', TIMER_START: '타이머 시작', TIMER_STOP: '타이머 종료' };

const DeviceManagementPage = () => {
  const { workers, fetchWorkers } = useWorker();
  const [equipment, setEquipment] = useState([]);
  const [commands, setCommands] = useState([]);
  const [message, setMessage] = useState('웨어러블 명령을 불러오는 중입니다.');
  const [form, setForm] = useState({ workerId: '', equipmentId: '', commandType: 'BUZZER_ON', reason: '' });

  const load = useCallback(async () => {
    const [equipmentResult, commandResult] = await Promise.all([equipmentAPI.getAll(), wearableCommandAPI.getPending()]);
    if (equipmentResult.success) setEquipment(equipmentResult.data || []);
    if (commandResult.success) setCommands(commandResult.data || []);
    setMessage(commandResult.success ? `대기 명령 ${commandResult.data?.length || 0}건` : commandResult.error || '명령을 불러오지 못했습니다.');
  }, []);
  useEffect(() => { fetchWorkers(); load(); }, [fetchWorkers, load]);

  const submit = async (event) => {
    event.preventDefault();
    const result = await wearableCommandAPI.create({ ...form, workerId: Number(form.workerId), equipmentId: Number(form.equipmentId) });
    setMessage(result.success ? '웨어러블 명령을 등록했습니다.' : result.error);
    if (result.success) load();
  };
  const ack = async (id) => {
    const result = await wearableCommandAPI.acknowledge(id);
    setMessage(result.success ? '명령 확인 처리를 완료했습니다.' : result.error);
    if (result.success) load();
  };

  return <div className="device-page">
    <section className="device-hero"><div><span>WORKSAFE+ Wearable Commands</span><h1>웨어러블 명령 관리</h1><p>작업자 장비의 부저와 작업 타이머 명령을 등록하고 확인 상태를 관리합니다.</p></div><div className="device-server-card"><span>서버 상태</span><strong>{message}</strong><button className="btn-primary" type="button" onClick={load}>새로고침</button></div></section>
    <section className="device-summary-grid"><div><span>대기 명령</span><strong>{commands.length}건</strong></div><div><span>등록 작업자</span><strong>{workers.length}명</strong></div><div><span>등록 장비</span><strong>{equipment.length}개</strong></div></section>
    <div className="device-workspace"><section className="device-action-list"><form className="device-action-card is-active" onSubmit={submit}><div><strong>명령 등록</strong><span>POST</span></div><label>작업자<select required value={form.workerId} onChange={(e) => setForm((p) => ({ ...p, workerId: e.target.value }))}><option value="">선택</option>{workers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>장비<select required value={form.equipmentId} onChange={(e) => setForm((p) => ({ ...p, equipmentId: e.target.value }))}><option value="">선택</option>{equipment.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>명령<select value={form.commandType} onChange={(e) => setForm((p) => ({ ...p, commandType: e.target.value }))}>{Object.entries(commandLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>사유<input value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} maxLength="500" /></label><button className="btn-primary" type="submit">명령 전송</button></form></section>
      <section className="device-detail"><div className="device-detail__header"><div><span>GET /api/wearable-commands/pending</span><h2>대기 중 명령</h2></div></div><div className="device-list-panel">{commands.length === 0 && <div className="device-empty">대기 중인 명령이 없습니다.</div>}{commands.map((item) => <div key={item.id} className="device-row"><div><strong>{commandLabel[item.commandType] || item.commandType}</strong><span>{item.worker?.name} · {item.equipment?.name}</span></div><span>{item.commandStatus}</span><button type="button" onClick={() => ack(item.id)}>확인 처리</button></div>)}</div></section>
    </div>
  </div>;
};
export default DeviceManagementPage;

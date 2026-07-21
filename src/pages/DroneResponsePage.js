import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { droneAPI, droneResponseAPI, riskEventAPI } from '../services/api';
import './DroneResponsePage.css';

const DroneResponsePage = () => {
  const [drones, setDrones] = useState([]);
  const [risks, setRisks] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [droneId, setDroneId] = useState('');
  const [riskId, setRiskId] = useState('');
  const [message, setMessage] = useState('출동 가능한 드론과 위험 이벤트를 조회합니다.');
  const [commandMessage, setCommandMessage] = useState('현장 긴급 대응 출동');

  const load = useCallback(async () => {
    const [droneResult, riskResult, dispatchResult] = await Promise.all([droneAPI.getAll(), riskEventAPI.getAll(), droneAPI.getDispatches()]);
    if (droneResult.success) setDrones(droneResult.data || []);
    if (riskResult.success) setRisks((riskResult.data || []).filter((item) => item.status !== 'RESOLVED'));
    if (dispatchResult.success) setDispatches(dispatchResult.data || []);
    setMessage(droneResult.success && riskResult.success ? '대응 데이터를 동기화했습니다.' : '일부 대응 데이터를 불러오지 못했습니다.');
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!droneId && drones[0]) setDroneId(String(drones.find((item) => item.status === 'READY')?.id || drones[0].id)); }, [droneId, drones]);
  useEffect(() => { if (!riskId && risks[0]) setRiskId(String(risks[0].id)); }, [riskId, risks]);

  const risk = risks.find((item) => String(item.id) === riskId);
  const drone = drones.find((item) => String(item.id) === droneId);
  const activeDispatch = useMemo(() => dispatches.find((item) => !['RETURNED', 'FAILED', 'CANCELED'].includes(item.status)) || null, [dispatches]);

  const dispatch = async () => {
    if (!drone || !risk) { setMessage('드론과 위험 이벤트를 선택하세요.'); return; }
    const result = await droneResponseAPI.dispatchDrone(drone.id, { riskEventId: risk.id, targetLatitude: risk.latitude, targetLongitude: risk.longitude, commandMessage });
    setMessage(result.success ? '드론 출동 명령을 생성했습니다.' : result.error);
    if (result.success) load();
  };
  const drop = async () => {
    if (!activeDispatch) { setMessage('활성 출동이 없습니다.'); return; }
    const result = await droneResponseAPI.dropEmergencyKit(activeDispatch.id, { dropMethod: 'MANUAL', targetLatitude: activeDispatch.targetLatitude, targetLongitude: activeDispatch.targetLongitude, dropStatus: 'READY' });
    setMessage(result.success ? '응급키트 투하 로그를 생성했습니다.' : result.error);
  };
  const video = async () => {
    if (!activeDispatch?.drone?.id) { setMessage('활성 출동 드론이 없습니다.'); return; }
    const result = await droneResponseAPI.getActiveVideo(activeDispatch.drone.id);
    if (!result.success) { setMessage(result.error); return; }
    const startResult = await droneResponseAPI.startVideo(result.data.id);
    setMessage(startResult.success ? `영상 스트림을 시작했습니다: ${startResult.data.streamUrl}` : startResult.error);
  };

  return <div className="drone-page"><section className="drone-hero"><div><span>WORKSAFE+ Drone Response</span><h1>드론 대응 시스템</h1><p>위험 이벤트를 기준으로 드론 출동, 응급키트 투하와 영상 스트림을 제어합니다.</p></div><div className="drone-command-card"><span>서버 상태</span><strong>{message}</strong><button type="button" className="btn-primary" onClick={load}>새로고침</button></div></section>
    <section className="drone-summary-grid"><div><span>대기 드론</span><strong>{drones.filter((item) => item.status === 'READY').length}대</strong></div><div><span>미해결 위험</span><strong>{risks.length}건</strong></div><div><span>활성 출동</span><strong>{dispatches.filter((item) => !['RETURNED', 'FAILED', 'CANCELED'].includes(item.status)).length}건</strong></div><div><span>키트 투하</span><strong>{dispatches.filter((item) => item.emergencyKitDropped).length}건</strong></div></section>
    <div className="drone-workspace"><section className="drone-feature-list"><div className="drone-feature-card is-active"><div><strong>드론 출동 명령</strong><span>POST</span></div><label>드론<select value={droneId} onChange={(e) => setDroneId(e.target.value)}>{drones.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.status})</option>)}</select></label><label>위험 이벤트<select value={riskId} onChange={(e) => setRiskId(e.target.value)}>{risks.map((item) => <option key={item.id} value={item.id}>#{item.id} {item.riskType} / {item.riskLevel}</option>)}</select></label><label>명령 메시지<input value={commandMessage} onChange={(e) => setCommandMessage(e.target.value)} /></label><button className="btn-primary" type="button" onClick={dispatch}>출동 명령</button></div></section>
      <section className="drone-detail"><div className="drone-detail__header"><div><span>활성 출동</span><h2>{activeDispatch ? `출동 #${activeDispatch.id}` : '활성 출동 없음'}</h2><p>{activeDispatch?.commandMessage || '드론 출동 명령을 생성하면 상세 제어가 활성화됩니다.'}</p></div></div>{activeDispatch && <><div className="drone-info-grid"><div><span>드론</span><strong>{activeDispatch.drone?.name}</strong></div><div><span>상태</span><strong>{activeDispatch.status}</strong></div><div><span>응급키트</span><strong>{activeDispatch.emergencyKitDropped ? '투하 완료' : '대기'}</strong></div><div><span>119 요청</span><strong>{activeDispatch.emergencyCallStatus}</strong></div></div><div className="drone-actions"><button className="btn-primary" type="button" onClick={drop}>키트 투하 준비</button><button className="drone-secondary-button" type="button" onClick={video}>영상 스트림 시작</button></div></>}</section>
    </div>
  </div>;
};
export default DroneResponsePage;

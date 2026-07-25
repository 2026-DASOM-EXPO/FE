import React, { useEffect, useMemo, useState } from 'react';
import { useWorker } from '../context/WorkerContext';
import { equipmentAPI, iotIntegrationAPI } from '../services/api';
import './IoTIntegrationPage.css';

const features = [
  { id: 'rfid-attendance', name: 'RFID 출입 인증', endpoint: '/api/iot/attendance', description: 'RFID 태그로 출근·퇴근 상태를 기록합니다.' },
  { id: 'biometric-realtime', name: '생체 데이터 수집', endpoint: '/api/iot/biometrics', description: '심박수, 산소포화도, 체온을 수집합니다.' },
  { id: 'motion-impact', name: 'IMU 데이터 수집', endpoint: '/api/iot/imu', description: '가속도, 자이로, 기울기와 충격량을 수집합니다.' },
  { id: 'gps-location', name: 'GPS 위치 수집', endpoint: '/api/iot/gps', description: '작업자 위치와 이동 속도를 기록합니다.' },
  { id: 'equipment-status', name: '장비 착용 상태', endpoint: '/api/iot/equipment-status', description: '작업자의 장비 착용 상태를 전송합니다.' },
  { id: 'sos-report', name: 'SOS 긴급 신고', endpoint: '/api/iot/sos', description: 'SOS 요청과 현재 위치를 위험 이벤트로 전달합니다.' },
];

const IoTIntegrationPage = () => {
  const { workers, fetchWorkers } = useWorker();
  const [equipment, setEquipment] = useState([]);
  const [featureId, setFeatureId] = useState(features[0].id);
  const [workerId, setWorkerId] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [pressureValue, setPressureValue] = useState(2000);
  const [buttonValue, setButtonValue] = useState(1);
  const [message, setMessage] = useState('전송할 IoT 유형을 선택하세요.');
  const [logs, setLogs] = useState([]);
  const feature = useMemo(() => features.find((item) => item.id === featureId), [featureId]);
  const worker = workers.find((item) => String(item.id) === workerId);
  const compatibleEquipment = useMemo(() => {
    if (featureId === 'equipment-status') {
      return equipment.filter((item) => ['HELMET', 'SHOES'].includes(item.type));
    }
    if (featureId === 'sos-report') {
      return equipment.filter((item) => ['VEST', 'SOS_BUTTON'].includes(item.type));
    }
    return equipment;
  }, [equipment, featureId]);

  useEffect(() => { fetchWorkers(); equipmentAPI.getAll().then((result) => result.success && setEquipment(result.data || [])); }, [fetchWorkers]);
  useEffect(() => { if (!workerId && workers[0]) setWorkerId(String(workers[0].id)); }, [workerId, workers]);
  useEffect(() => {
    if (equipmentId && !compatibleEquipment.some((item) => String(item.id) === equipmentId)) {
      setEquipmentId('');
    }
  }, [compatibleEquipment, equipmentId]);

  const payload = useMemo(() => {
    const measuredAt = new Date().toISOString();
    const id = Number(workerId);
    if (featureId === 'rfid-attendance') return { rfidTag: worker?.rfid, attendanceType: 'CHECK_IN', measuredAt };
    if (featureId === 'biometric-realtime') return { workerId: id, equipmentId: equipmentId ? Number(equipmentId) : undefined, bpm: 78, spo2: 98.2, bodyTemperature: 36.6, measuredAt };
    if (featureId === 'motion-impact') return { workerId: id, equipmentId: equipmentId ? Number(equipmentId) : undefined, accelerationX: 0.1, accelerationY: 0.2, accelerationZ: 9.8, impactAmount: 0.3, measuredAt };
    if (featureId === 'gps-location') return { workerId: id, equipmentId: equipmentId ? Number(equipmentId) : undefined, latitude: worker?.location?.lat ?? 37.4979, longitude: worker?.location?.lng ?? 127.0276, speed: 0, measuredAt };
    if (featureId === 'equipment-status') return { workerId: id, equipmentId: Number(equipmentId), pressureValue: Number(pressureValue), measuredAt };
    return { workerId: id, equipmentId: equipmentId ? Number(equipmentId) : undefined, buttonValue: Number(buttonValue), latitude: worker?.location?.lat, longitude: worker?.location?.lng, message: '작업자 SOS 긴급 요청', measuredAt };
  }, [buttonValue, equipmentId, featureId, pressureValue, worker, workerId]);

  const send = async () => {
    if (!worker || (featureId === 'equipment-status' && !equipmentId)) { setMessage('필수 작업자와 장비를 선택하세요.'); return; }
    setMessage('IoT 데이터를 전송하는 중입니다.');
    const result = await iotIntegrationAPI.syncFeature(featureId, payload);
    setMessage(result.success ? result.message || '데이터 수집을 완료했습니다.' : result.error);
    setLogs((prev) => [{ id: Date.now(), feature: feature.name, success: result.success, time: new Date() }, ...prev].slice(0, 8));
  };

  return <div className="iot-page"><div className="iot-page__header"><div><h1>IoT 데이터 수집</h1><p>백엔드 수집 DTO와 동일한 형식으로 센서 데이터를 전송합니다.</p></div><div className="iot-server-card"><span>전송 상태</span><strong>{message}</strong></div></div>
    <section className="iot-summary-grid"><div className="iot-summary"><span>수집 API</span><strong>{features.length}개</strong></div><div className="iot-summary"><span>작업자</span><strong>{workers.length}명</strong></div><div className="iot-summary"><span>장비</span><strong>{equipment.length}개</strong></div><div className="iot-summary"><span>전송 기록</span><strong>{logs.length}건</strong></div></section>
    <div className="iot-workspace"><section className="iot-feature-list">{features.map((item) => <button key={item.id} type="button" className={`iot-feature-card ${featureId === item.id ? 'is-active' : ''}`} onClick={() => setFeatureId(item.id)}><div className="iot-feature-card__top"><strong>{item.name}</strong><span className="iot-status iot-status--muted">POST</span></div><p>{item.description}</p><div className="iot-feature-card__meta"><span>{item.endpoint}</span></div></button>)}</section>
      <section className="iot-detail"><div className="iot-detail__header"><div><span>선택 API</span><h2>{feature.name}</h2><p>{feature.description}</p></div></div><div className="iot-detail-grid"><label>작업자<select value={workerId} onChange={(e) => setWorkerId(e.target.value)}>{workers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>장비(선택)<select value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)}><option value="">없음</option>{compatibleEquipment.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{featureId === 'equipment-status' && <label>ESP32 ADC (0~4095)<input type="number" min="0" max="4095" value={pressureValue} onChange={(e) => setPressureValue(e.target.value)} /></label>}{featureId === 'sos-report' && <label>SOS 버튼 값<select value={buttonValue} onChange={(e) => setButtonValue(e.target.value)}><option value={0}>0 - 해제</option><option value={1}>1 - 누름</option></select></label>}</div><div className="iot-action-row"><button className="btn-primary" type="button" onClick={send}>데이터 전송</button></div><div className="iot-code-panel"><div><span>연동 엔드포인트</span><code>{feature.endpoint}</code></div><pre>{JSON.stringify(payload, null, 2)}</pre></div></section></div>
  </div>;
};
export default IoTIntegrationPage;

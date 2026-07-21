import React, { useMemo, useState } from 'react';
import { useAlert } from '../context/AlertContext';
import { monitoringAPI } from '../services/api';
import './MonitoringPage.css';

const features = [
  { id: 'alert-stream', name: '실시간 알림', endpoint: '/api/alerts/stream', description: 'SSE로 수신한 알림과 전체 알림 이력을 확인합니다.' },
  { id: 'equipment-overview', name: '장비 불출·반납 현황', endpoint: '/api/equipment/status', description: '장비 착용 상태와 불출·반납 시각을 조회합니다.' },
  { id: 'equipment-history', name: '장비 착용 이력', endpoint: '/api/equipment/logs', description: '작업자 및 장비별 착용 이력을 조회합니다.' },
  { id: 'incident-report', name: '위험 이벤트 리포트', endpoint: '/api/events/risk', description: '위험 이벤트와 연계된 드론 출동·영상 정보를 조회합니다.' },
];
const displayName = (row) => row.title || row.riskEvent?.description || row.equipment?.name || row.worker?.name || `#${row.id || '-'}`;
const displayDetail = (row) => row.message || row.riskEvent?.riskLevel || row.wearStatus || row.status || row.readStatus || '-';

const MonitoringPage = () => {
  const { alerts } = useAlert();
  const [featureId, setFeatureId] = useState(features[0].id);
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState('조회할 관제 항목을 선택하세요.');
  const [loading, setLoading] = useState(false);
  const feature = useMemo(() => features.find((item) => item.id === featureId), [featureId]);

  const query = async () => {
    setLoading(true);
    const result = await monitoringAPI.queryFeature(featureId, {});
    if (result.success) { setRows(result.data || []); setMessage(`${result.data?.length || 0}건을 조회했습니다.`); }
    else setMessage(result.error || '조회에 실패했습니다.');
    setLoading(false);
  };
  const visibleRows = featureId === 'alert-stream' && rows.length === 0 ? alerts : rows;

  return <div className="monitoring-page"><div className="monitoring-page__header"><div><h1>관리자 관제 및 모니터링</h1><p>명세에 정의된 알림, 장비, 위험 이벤트 데이터를 통합 조회합니다.</p></div><div className="monitoring-server"><span>조회 상태</span><strong>{message}</strong></div></div>
    <section className="monitoring-summary-grid"><div><span>관제 항목</span><strong>{features.length}개</strong></div><div><span>SSE 수신 알림</span><strong>{alerts.length}건</strong></div><div><span>조회 결과</span><strong>{visibleRows.length}건</strong></div></section>
    <div className="monitoring-workspace"><section className="monitoring-feature-list">{features.map((item) => <button key={item.id} type="button" className={`monitoring-feature ${featureId === item.id ? 'is-active' : ''}`} onClick={() => { setFeatureId(item.id); setRows([]); }}><strong>{item.name}</strong><p>{item.description}</p><div><span>{item.endpoint}</span></div></button>)}</section>
      <section className="monitoring-detail"><div className="monitoring-detail__header"><div><span>선택 항목</span><h2>{feature.name}</h2><p>{feature.description}</p></div>{featureId === 'alert-stream' && <span className="monitoring-live is-on">SSE LIVE</span>}</div><div className="monitoring-actions"><button type="button" className="btn-primary" onClick={query} disabled={loading}>{loading ? '조회 중...' : '서버 조회'}</button></div><div className="monitoring-endpoint"><span>연동 엔드포인트</span><code>{feature.endpoint}</code></div><div className="monitoring-query-panel"><div className="monitoring-panel-heading"><h3>조회 결과</h3><span>{visibleRows.length}건</span></div>{visibleRows.length === 0 ? <div className="monitoring-empty">조회된 데이터가 없습니다.</div> : visibleRows.map((row, index) => <div key={row.id || index} className="monitoring-query-row"><div><strong>{displayName(row)}</strong><span>{displayDetail(row)}</span></div></div>)}</div></section>
    </div>
  </div>;
};
export default MonitoringPage;

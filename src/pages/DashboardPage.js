import React, { useEffect, useMemo, useState } from 'react';
import { useWorker } from '../context/WorkerContext';
import { useAlert } from '../context/AlertContext';
import WorkerCard from '../components/worker/WorkerCard';
import WorkerDetailModal from '../components/worker/WorkerDetailModal';
import EmergencyAlertModal from '../components/dashboard/EmergencyAlertModal';
import { WORKER_STATUS } from '../utils/constants';
import { getRelativeTime } from '../utils/helpers';
import { dashboardAPI, riskEventAPI } from '../services/api';
import './DashboardPage.css';

/**
 * Dashboard 페이지
 * 전체 작업자 상태, 위험 작업자, 최근 알림을 한 화면에서 관제하는 첫 화면입니다.
 */
const DashboardPage = () => {
  const { workers, fetchWorkers, loading, refreshing, error, lastFetchedAt } = useWorker();
  const { alerts, unreadCount, markAsRead } = useAlert();
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [summary, setSummary] = useState(null);
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [emergencyVideo, setEmergencyVideo] = useState(null);
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const [emergencyError, setEmergencyError] = useState('');

  useEffect(() => {
    fetchWorkers();

    const fetchSummary = async () => {
      const result = await dashboardAPI.getSummary();
      if (result.success) setSummary(result.data);
    };
    fetchSummary();

    // 서버 부하를 줄이면서 현장 상태를 주기적으로 갱신합니다.
    const interval = setInterval(() => {
      fetchWorkers();
      fetchSummary();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchWorkers]);

  useEffect(() => {
    const latestSos = alerts.find((alert) => alert.type === 'sos_request' && !alert.read);
    if (latestSos && activeEmergency?.id !== latestSos.id) {
      setActiveEmergency(latestSos);
      setEmergencyVideo(null);
      setEmergencyError('');
    }
  }, [activeEmergency?.id, alerts]);

  const confirmEmergency = async () => {
    const riskEventId = activeEmergency?.riskEvent?.id;
    if (!riskEventId) {
      setEmergencyError('연결된 SOS 위험 이벤트를 찾을 수 없습니다.');
      return;
    }

    setEmergencyLoading(true);
    setEmergencyError('');
    const confirmed = await riskEventAPI.updateStatus(riskEventId, 'PROCESSING');
    if (!confirmed.success) {
      setEmergencyError(confirmed.error || 'SOS 확인 처리에 실패했습니다.');
      setEmergencyLoading(false);
      return;
    }

    const reports = await riskEventAPI.getReports({ workerId: activeEmergency.workerId });
    const report = reports.success
      ? (reports.data || []).find((item) => item.riskEvent?.id === riskEventId)
      : null;

    if (!report?.droneVideo) {
      setEmergencyError(reports.error || '드론 영상 스트림이 아직 준비되지 않았습니다.');
      setEmergencyLoading(false);
      return;
    }

    setEmergencyVideo(report.droneVideo);
    await markAsRead(activeEmergency.id);
    setEmergencyLoading(false);
  };

  // 작업자 상태별 통계는 workers가 바뀔 때만 다시 계산해 불필요한 반복 연산을 줄입니다.
  const stats = useMemo(() => ({
    total: summary?.totalWorkers ?? workers.length,
    normal: summary?.normalWorkers ?? workers.filter((w) => w.status === WORKER_STATUS.NORMAL).length,
    warning: summary?.warningWorkers ?? workers.filter((w) => w.status === WORKER_STATUS.WARNING).length,
    danger: summary?.dangerWorkers ?? workers.filter((w) => w.status === WORKER_STATUS.DANGER).length,
    offDuty: workers.filter((w) => w.status === WORKER_STATUS.OFF_DUTY).length,
  }), [summary, workers]);

  // 위험/주의 작업자는 대응 우선순위가 높으므로 요약 영역과 목록 정렬에 재사용합니다.
  const priorityWorkers = useMemo(
    () => workers.filter((worker) =>
      [WORKER_STATUS.DANGER, WORKER_STATUS.WARNING].includes(worker.status)
    ),
    [workers]
  );

  // 카드 목록은 위험 -> 주의 -> 정상 -> 근무 외 순서로 보여 현장 대응 흐름을 돕습니다.
  const sortedWorkers = useMemo(() => {
    const order = {
      [WORKER_STATUS.DANGER]: 0,
      [WORKER_STATUS.WARNING]: 1,
      [WORKER_STATUS.NORMAL]: 2,
      [WORKER_STATUS.OFF_DUTY]: 3,
    };

    return [...workers].sort((a, b) => (order[a.status] ?? 4) - (order[b.status] ?? 4));
  }, [workers]);

  return (
    <div className="dashboard-page">
      {/* 운영자가 화면 진입 직후 확인해야 하는 핵심 상태를 문장형 요약으로 제공합니다. */}
      <section className="dashboard-summary">
        <div>
          <span className="summary-kicker">실시간 현장 관제</span>
          <h2>
            위험 {stats.danger}명 · 주의 {stats.warning}명 · 미확인 알림 {summary?.unreadAlerts ?? unreadCount}건
          </h2>
          <p>
            {priorityWorkers.length > 0
              ? `${priorityWorkers[0].name} 작업자부터 우선 확인이 필요합니다.`
              : '현재 즉시 대응이 필요한 작업자는 없습니다.'}
          </p>
        </div>
        <div className="summary-meta">
          <span className={`refresh-state ${refreshing ? 'refreshing' : ''}`}>
            {refreshing ? '갱신 중' : '자동 갱신'}
          </span>
          <span>
            마지막 갱신: {lastFetchedAt ? getRelativeTime(lastFetchedAt) : '-'}
          </span>
        </div>
      </section>

      {/* 상태별 작업자 수를 한눈에 비교하는 통계 영역입니다. */}
      <section className="stats-section">
        <div className="stat-card">
          <h4>전체 작업자</h4>
          <p className="stat-number">{stats.total}</p>
        </div>
        <div className="stat-card normal">
          <h4>정상</h4>
          <p className="stat-number">{stats.normal}</p>
        </div>
        <div className="stat-card warning">
          <h4>주의</h4>
          <p className="stat-number">{stats.warning}</p>
        </div>
        <div className="stat-card danger">
          <h4>위험</h4>
          <p className="stat-number">{stats.danger}</p>
        </div>
        <div className="stat-card off-duty">
          <h4>장비 착용</h4>
          <p className="stat-number">{summary?.wornEquipment ?? '-'}</p>
        </div>
        <div className="stat-card alert">
          <h4>출동 중 드론</h4>
          <p className="stat-number">{summary?.activeDroneDispatches ?? '-'}</p>
        </div>
      </section>

      {/* 오류 메시지 */}
      {error && <div className="error-message">{error}</div>}

      {/* 최초 진입 시에는 전체 로딩, 이후 주기 갱신은 요약 배지로만 표시합니다. */}
      {loading && <div className="loading">데이터 로딩 중...</div>}

      {/* 위험/주의 작업자는 별도 영역으로 한 번 더 노출해 놓치지 않도록 합니다. */}
      {priorityWorkers.length > 0 && (
        <section className="priority-section">
          <div className="section-heading">
            <h2>우선 확인 작업자</h2>
            <span>{priorityWorkers.length}명</span>
          </div>
          <div className="priority-list">
            {priorityWorkers.map((worker) => (
              <button
                key={worker.id}
                className={`priority-item ${worker.status}`}
                type="button"
                onClick={() => setSelectedWorker(worker)}
              >
                <strong>{worker.name}</strong>
                <span>{worker.workerId}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 작업자 카드 목록입니다. 카드를 클릭하면 상세 모달을 열어 대응 정보를 확인합니다. */}
      <section className="workers-section">
        <div className="section-heading">
          <h2>작업자 상태 모니터링</h2>
          <span>{workers.length}명</span>
        </div>
        <div className="workers-grid">
          {sortedWorkers.map((worker) => (
            <WorkerCard
              key={worker.id}
              worker={worker}
              onClick={() => setSelectedWorker(worker)}
            />
          ))}
        </div>
      </section>

      {/* 최근 알림에는 심각도와 발생 시간을 함께 노출합니다. */}
      <section className="recent-alerts-section">
        <div className="section-heading">
          <h2>최근 알림</h2>
          <span>최근 5건</span>
        </div>
        <div className="alerts-list">
          {alerts.slice(0, 5).map((alert) => (
            <div key={alert.id} className={`alert-item ${alert.severity || 'info'}`}>
              <span className="alert-badge">{alert.severity || 'info'}</span>
              <div className="alert-copy">
                <strong>{alert.title}</strong>
                <span className="alert-message">{alert.message}</span>
              </div>
              <time>{getRelativeTime(alert.timestamp)}</time>
            </div>
          ))}
          {alerts.length === 0 && (
            <div className="empty-state">최근 알림이 없습니다.</div>
          )}
        </div>
      </section>

      <WorkerDetailModal
        worker={selectedWorker}
        onClose={() => setSelectedWorker(null)}
      />
      <EmergencyAlertModal
        alert={activeEmergency}
        video={emergencyVideo}
        loading={emergencyLoading}
        error={emergencyError}
        onConfirm={confirmEmergency}
        onClose={() => {
          setActiveEmergency(null);
          setEmergencyVideo(null);
        }}
      />
    </div>
  );
};

export default DashboardPage;

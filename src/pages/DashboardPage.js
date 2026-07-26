import React, { useEffect, useMemo, useState } from 'react';
import { useWorker } from '../context/WorkerContext';
import { useAlert } from '../context/AlertContext';
import WorkerCard from '../components/worker/WorkerCard';
import WorkerDetailModal from '../components/worker/WorkerDetailModal';
import EntityModal from '../components/common/EntityModal';
import { useRealtime } from '../context/RealtimeContext';
import { WORKER_STATUS } from '../utils/constants';
import { getRelativeTime } from '../utils/helpers';
import { dashboardAPI } from '../services/api';
import './DashboardPage.css';

/**
 * Dashboard 페이지
 * 전체 작업자 상태, 위험 작업자, 최근 알림을 한 화면에서 관제하는 첫 화면입니다.
 */
const DashboardPage = () => {
  const {
    workers,
    fetchWorkers,
    loading,
    error,
    lastFetchedAt,
    addWorker,
    updateWorker,
    deleteWorker,
  } = useWorker();
  const { alerts, unreadCount } = useAlert();
  const { status: realtimeStatus } = useRealtime();
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [summary, setSummary] = useState(null);
  const [workerModalMode, setWorkerModalMode] = useState(null);
  const [workerForm, setWorkerForm] = useState({ name: '', department: '', phone: '', status: 'normal' });
  const [workerBusy, setWorkerBusy] = useState(false);

  useEffect(() => {
    fetchWorkers();

    const fetchSummary = async () => {
      const result = await dashboardAPI.getSummary();
      if (result.success) setSummary(result.data);
    };
    fetchSummary();

  }, [fetchWorkers]);

  useEffect(() => {
    if (!selectedWorker) return;
    const latest = workers.find((worker) => worker.id === selectedWorker.id);
    if (latest) setSelectedWorker(latest);
  }, [selectedWorker, workers]);

  const openWorkerCreate = () => {
    setWorkerForm({ name: '', department: '', phone: '', status: 'normal' });
    setWorkerModalMode('create');
  };

  const openWorkerEdit = () => {
    if (!selectedWorker) return;
    setWorkerForm({
      name: selectedWorker.name,
      department: selectedWorker.department,
      phone: selectedWorker.phone,
      status: selectedWorker.status,
    });
    setWorkerModalMode('edit');
  };

  const saveWorker = async (event) => {
    event.preventDefault();
    setWorkerBusy(true);
    const result = workerModalMode === 'create'
      ? await addWorker(workerForm)
      : await updateWorker(selectedWorker.id, workerForm);
    setWorkerBusy(false);
    if (result.success) {
      setWorkerModalMode(null);
      if (workerModalMode === 'edit') setSelectedWorker(result.data);
    }
  };

  const removeWorker = async () => {
    if (!selectedWorker || !window.confirm(`#${selectedWorker.id} ${selectedWorker.name} 작업자를 삭제할까요?`)) return;
    const result = await deleteWorker(selectedWorker.id);
    if (result.success) setSelectedWorker(null);
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
          <span className={`refresh-state ${realtimeStatus === 'live' ? '' : 'refreshing'}`}>
            {realtimeStatus === 'live' ? 'SSE LIVE' : 'SSE 연결 중'}
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
          <div><h2>작업자 상태 모니터링</h2><span>{workers.length}명</span></div>
          <button type="button" className="btn-primary" onClick={openWorkerCreate}>작업자 등록</button>
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
        onEdit={openWorkerEdit}
        onDelete={removeWorker}
      />
      {workerModalMode && (
        <EntityModal
          title={workerModalMode === 'create' ? '작업자 등록' : `작업자 #${selectedWorker.id} 수정`}
          description="목록 화면을 유지한 채 작업자 정보를 관리합니다."
          onClose={() => setWorkerModalMode(null)}
          onSubmit={saveWorker}
          submitLabel={workerModalMode === 'create' ? '등록' : '수정'}
          busy={workerBusy}
        >
          <label>이름<input required value={workerForm.name} onChange={(e) => setWorkerForm((p) => ({ ...p, name: e.target.value }))} /></label>
          <label>소속 부서<input required value={workerForm.department} onChange={(e) => setWorkerForm((p) => ({ ...p, department: e.target.value }))} /></label>
          <label>연락처<input required value={workerForm.phone} onChange={(e) => setWorkerForm((p) => ({ ...p, phone: e.target.value }))} /></label>
          <label>상태<select value={workerForm.status} onChange={(e) => setWorkerForm((p) => ({ ...p, status: e.target.value }))}><option value="normal">정상</option><option value="warning">주의</option><option value="danger">위험</option><option value="off-duty">퇴근</option></select></label>
        </EntityModal>
      )}
    </div>
  );
};

export default DashboardPage;

import React, { useEffect, useMemo, useState } from 'react';
import { useWorker } from '../context/WorkerContext';
import './WorkersPage.css';

// 작업자 관리 명세서의 CRUD 항목입니다.
// 이 배열을 기준으로 좌측 액션 카드, endpoint, 관련 DB 태그를 렌더링합니다.
const workerActions = [
  {
    id: 'create',
    name: '작업자 등록 (Create)',
    description: '신규 근로자의 이름, 소속 부서, 연락처, RFID 정보를 시스템에 등록합니다.',
    method: 'POST',
    endpoint: '/api/workers',
    relatedDb: ['Worker'],
  },
  {
    id: 'read-list',
    name: '작업자 목록 (Read)',
    description: '전체 근로자 목록을 조회합니다.',
    method: 'GET',
    endpoint: '/api/workers',
    relatedDb: ['Worker'],
  },
  {
    id: 'read-detail',
    name: '작업자 상세 조회 (Read)',
    description: '특정 근로자의 상세 정보 및 현재 상태(정상/주의 등)를 조회합니다.',
    method: 'GET',
    endpoint: '/api/workers/:workerId',
    relatedDb: ['Worker'],
  },
  {
    id: 'update',
    name: '작업자 정보 수정 (Update)',
    description: '소속 부서 변경, 연락처 변경 등 근로자의 기본 정보를 수정합니다.',
    method: 'PUT',
    endpoint: '/api/workers/:workerId',
    relatedDb: ['Worker'],
  },
  {
    id: 'delete',
    name: '작업자 삭제 (Delete)',
    description: '퇴사 또는 현장 철수한 근로자의 데이터를 시스템에서 비활성화하거나 삭제합니다.',
    method: 'DELETE',
    endpoint: '/api/workers/:workerId',
    relatedDb: ['Worker'],
  },
];

const statusLabel = {
  normal: '정상',
  warning: '주의',
  danger: '위험',
  'off-duty': '퇴근',
};

const statusTone = {
  normal: 'success',
  warning: 'warning',
  danger: 'danger',
  'off-duty': 'muted',
};

// 활동 로그에 표시할 시간을 한국어 시각 형식으로 통일합니다.
const formatTime = (date) =>
  new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(date));

// 선택된 액션/작업자/폼 입력값을 실제 API 전송 모양과 같은 payload로 조립합니다.
const buildWorkerPayload = (action, worker, formData) => ({
  actionId: action.id,
  method: action.method,
  workerId: worker?.workerId || formData.workerId || 'W000',
  name: formData.name || worker?.name || '신규 작업자',
  department: formData.department || worker?.department || '안전관리팀',
  phone: formData.phone || worker?.phone || '010-0000-0000',
  rfid: formData.rfid || worker?.rfid || `RFID-${worker?.workerId || 'NEW'}`,
  status: formData.status || worker?.status || 'normal',
  requestedAt: new Date().toISOString(),
  endpoint: action.endpoint,
});

/**
 * WorkersPage 컴포넌트
 * 작업자 CRUD 명세를 액션 카드와 상세 패널로 보여주고 실제 API 요청으로 실행합니다.
 */
const WorkersPage = () => {
  const {
    workers,
    fetchWorkers,
    selectedWorker,
    getWorkerDetail,
    loading,
    addWorker,
    updateWorker,
    deleteWorker,
  } = useWorker();
  const [selectedActionId, setSelectedActionId] = useState(workerActions[0].id);
  const [serverStatus, setServerStatus] = useState('작업자 관리 준비');
  const [activityLog, setActivityLog] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    workerId: '',
    department: '안전관리팀',
    phone: '010-0000-0000',
    rfid: '',
    status: 'normal',
  });

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  useEffect(() => {
    if (!selectedWorker) return;

    setFormData({
      name: selectedWorker.name || '',
      workerId: selectedWorker.workerId || '',
      department: selectedWorker.department || '안전관리팀',
      phone: selectedWorker.phone || '010-0000-0000',
      rfid: selectedWorker.rfid || `RFID-${selectedWorker.workerId}`,
      status: selectedWorker.status || 'normal',
    });
  }, [selectedWorker]);

  const selectedAction = useMemo(
    () => workerActions.find((action) => action.id === selectedActionId) || workerActions[0],
    [selectedActionId]
  );

  const activeWorkers = workers.filter((worker) => worker.status !== 'off-duty');
  const riskWorkers = workers.filter((worker) => worker.status === 'warning' || worker.status === 'danger');
  const payloadPreview = buildWorkerPayload(selectedAction, selectedWorker, formData);

  const addActivityLog = (action, worker, result) => {
    setActivityLog((prev) => [
      {
        id: Date.now(),
        action: action.name,
        workerId: worker?.workerId || formData.workerId || 'NEW',
        result,
        time: new Date(),
      },
      ...prev,
    ].slice(0, 7));
  };

  const handleWorkerSelect = (workerId) => {
    getWorkerDetail(workerId);
    setSelectedActionId('read-detail');
  };

  const handleRunAction = async () => {
    setServerStatus(`${selectedAction.name} 요청 중`);
    const payload = buildWorkerPayload(selectedAction, selectedWorker, formData);

    // 서버가 없는 개발 단계에서도 화면 흐름을 확인할 수 있도록 API 호출 후 로컬 Context를 함께 갱신합니다.
    let result = { success: false };
    if (selectedAction.id === 'create') {
      result = await addWorker(payload);
    }

    if (selectedAction.id === 'read-list') {
      result = await fetchWorkers();
    }

    if (selectedAction.id === 'read-detail' && selectedWorker) {
      const worker = await getWorkerDetail(selectedWorker.id);
      result = { success: Boolean(worker), data: worker };
    }

    if (selectedAction.id === 'update' && selectedWorker) {
      result = await updateWorker(selectedWorker.id, payload);
    }

    if (selectedAction.id === 'delete' && selectedWorker) {
      result = await deleteWorker(selectedWorker.id);
    }

    setServerStatus(result.success ? '서버 처리 완료' : '서버 연결 대기');
    addActivityLog(selectedAction, selectedWorker, result.success ? '성공' : '대기');
  };

  return (
    <div className="workers-page">
      <section className="worker-hero">
        <div>
          <span>WORKSAFE+ Worker Registry</span>
          <h1>작업자 관리</h1>
          <p>신규 작업자 등록, 목록 조회, 상세 상태 확인, 정보 수정, 삭제 처리를 관리합니다.</p>
        </div>
        <div className="worker-server-card">
          <span>서버 상태</span>
          <strong>{serverStatus}</strong>
          <button type="button" className="btn-primary" onClick={handleRunAction}>
            {selectedAction.method} 실행
          </button>
        </div>
      </section>

      <section className="worker-summary-grid">
        <div>
          <span>전체 작업자</span>
          <strong>{workers.length}명</strong>
        </div>
        <div>
          <span>근무 중</span>
          <strong>{activeWorkers.length}명</strong>
        </div>
        <div>
          <span>주의/위험</span>
          <strong>{riskWorkers.length}명</strong>
        </div>
        <div>
          <span>퇴근</span>
          <strong>{workers.filter((worker) => worker.status === 'off-duty').length}명</strong>
        </div>
      </section>

      <div className="worker-workspace">
        <section className="worker-action-list">
          {workerActions.map((action) => (
            <button
              key={action.id}
              type="button"
              className={`worker-action-card ${selectedAction.id === action.id ? 'is-active' : ''}`}
              onClick={() => setSelectedActionId(action.id)}
            >
              <div>
                <strong>{action.name}</strong>
                <span>{action.method}</span>
              </div>
              <p>{action.description}</p>
              <div className="worker-db-tags">
                {action.relatedDb.map((db) => (
                  <em key={db}>{db}</em>
                ))}
              </div>
            </button>
          ))}
        </section>

        <section className="worker-detail-panel">
          <div className="worker-detail-panel__header">
            <div>
              <span>선택 액션</span>
              <h2>{selectedAction.name}</h2>
              <p>{selectedAction.description}</p>
            </div>
            <span className={`worker-method worker-method--${selectedAction.method.toLowerCase()}`}>
              {selectedAction.method}
            </span>
          </div>

          <div className="worker-form-grid">
            <label>
              이름
              <input
                value={formData.name}
                onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="작업자 이름"
              />
            </label>
            <label>
              작업자 ID
              <input
                value={formData.workerId}
                onChange={(event) => setFormData((prev) => ({ ...prev, workerId: event.target.value }))}
                placeholder="W001"
              />
            </label>
            <label>
              소속 부서
              <input
                value={formData.department}
                onChange={(event) => setFormData((prev) => ({ ...prev, department: event.target.value }))}
              />
            </label>
            <label>
              연락처
              <input
                value={formData.phone}
                onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
              />
            </label>
            <label>
              RFID
              <input
                value={formData.rfid}
                onChange={(event) => setFormData((prev) => ({ ...prev, rfid: event.target.value }))}
                placeholder="RFID-W001"
              />
            </label>
            <label>
              상태
              <select
                value={formData.status}
                onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="normal">정상</option>
                <option value="warning">주의</option>
                <option value="danger">위험</option>
                <option value="off-duty">퇴근</option>
              </select>
            </label>
          </div>

          <div className="worker-list-panel">
            {loading ? (
              <div className="worker-empty">작업자 목록을 불러오는 중입니다.</div>
            ) : (
              workers.map((worker) => (
                <button
                  key={worker.id}
                  type="button"
                  className={`worker-row-card ${selectedWorker?.id === worker.id ? 'is-active' : ''}`}
                  onClick={() => handleWorkerSelect(worker.id)}
                >
                  <div>
                    <strong>{worker.name}</strong>
                    <span>{worker.workerId} · {worker.department}</span>
                  </div>
                  <span>{worker.phone}</span>
                  <span className={`worker-status worker-status--${statusTone[worker.status]}`}>
                    {statusLabel[worker.status] || worker.status}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="worker-info-grid">
            <div>
              <span>선택 작업자</span>
              <strong>{selectedWorker?.workerId || '미선택'}</strong>
            </div>
            <div>
              <span>심박수</span>
              <strong>{selectedWorker?.sensorData?.heartRate || '-'} BPM</strong>
            </div>
            <div>
              <span>체온</span>
              <strong>{selectedWorker?.sensorData?.temperature || '-'}°C</strong>
            </div>
            <div>
              <span>최근 갱신</span>
              <strong>{selectedWorker ? formatTime(selectedWorker.lastUpdate) : '-'}</strong>
            </div>
          </div>

          <div className="worker-code-panel">
            <span>연동 엔드포인트</span>
            <code>{selectedAction.endpoint}</code>
            <pre>{JSON.stringify(payloadPreview, null, 2)}</pre>
          </div>
        </section>
      </div>

      <section className="worker-log-section">
        <div className="worker-log-heading">
          <h2>작업자 처리 로그</h2>
          <span>최근 요청 {activityLog.length}건</span>
        </div>
        {activityLog.length === 0 ? (
          <div className="worker-empty">아직 실행된 작업자 관리 요청이 없습니다.</div>
        ) : (
          <div className="worker-log-list">
            {activityLog.map((log) => (
              <div key={log.id} className="worker-log-row">
                <span>{log.action}</span>
                <strong>{log.workerId}</strong>
                <em>{log.result}</em>
                <time>{formatTime(log.time)}</time>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default WorkersPage;

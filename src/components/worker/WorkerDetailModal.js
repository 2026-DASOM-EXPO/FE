import React from 'react';
import { EQUIPMENT_LABELS, WORKER_STATUS, WORKER_STATUS_META } from '../../utils/constants';
import { getRelativeTime } from '../../utils/helpers';
import './WorkerDetailModal.css';

/**
 * WorkerDetailModal 컴포넌트
 * 대시보드의 작업자 카드를 눌렀을 때 작업자의 센서/장비/위치 정보를 한 번에 확인합니다.
 *
 * @param {object|null} worker - 상세로 표시할 작업자 객체입니다. null이면 렌더링하지 않습니다.
 * @param {Function} onClose - 닫기 버튼 또는 배경 클릭 시 실행할 콜백입니다.
 */
const WorkerDetailModal = ({ worker, onClose }) => {
  // 선택된 작업자가 없을 때는 모달 DOM 자체를 만들지 않아 포커스/스크린리더 혼선을 줄입니다.
  if (!worker) {
    return null;
  }

  const statusMeta =
    WORKER_STATUS_META[worker.status] || WORKER_STATUS_META[WORKER_STATUS.UNKNOWN];
  const sensorData = worker.sensorData || {};
  const equipmentStatus = sensorData.equipmentStatus || {};
  const missingEquipment = Object.entries(EQUIPMENT_LABELS)
    .filter(([key]) => !equipmentStatus[key])
    .map(([, label]) => label);

  return (
    <div className="worker-modal" role="dialog" aria-modal="true">
      {/* 배경 영역을 버튼으로 만들어 키보드/보조기기 사용자도 닫기 동작을 예측할 수 있게 합니다. */}
      <button
        className="worker-modal-backdrop"
        type="button"
        aria-label="작업자 상세 닫기"
        onClick={onClose}
      />

      <section className="worker-modal-panel">
        <header className="worker-modal-header">
          <div>
            <span className={`detail-status ${statusMeta.tone}`}>
              {statusMeta.label}
            </span>
            <h2>{worker.name}</h2>
            <p>{worker.workerId} · {worker.department}</p>
          </div>
          <button className="modal-close-button" type="button" onClick={onClose}>
            닫기
          </button>
        </header>

        {/* 현장 대응 시 가장 먼저 보는 생체 신호를 상단에 크게 배치합니다. */}
        <div className="detail-metrics">
          <div>
            <span>심박수</span>
            <strong>{sensorData.heartRate ?? '-'} bpm</strong>
          </div>
          <div>
            <span>체온</span>
            <strong>{sensorData.temperature ?? '-'}°C</strong>
          </div>
          <div>
            <span>최근 갱신</span>
            <strong>{getRelativeTime(worker.lastUpdate)}</strong>
          </div>
        </div>

        {/* 안전장비 착용 여부를 개별 칩으로 노출해 누락 항목을 빠르게 찾게 합니다. */}
        <div className="detail-section">
          <h3>안전장비 착용 상태</h3>
          <div className="equipment-checklist">
            {Object.entries(EQUIPMENT_LABELS).map(([key, label]) => (
              <span
                key={key}
                className={`equipment-chip ${equipmentStatus[key] ? 'equipped' : 'missing'}`}
              >
                {label} {equipmentStatus[key] ? '착용' : '미착용'}
              </span>
            ))}
          </div>
          <p className="detail-note">
            {missingEquipment.length > 0
              ? `즉시 확인 필요: ${missingEquipment.join(', ')}`
              : '필수 안전장비가 모두 정상 착용 상태입니다.'}
          </p>
        </div>

        {/* 실제 지도 연동 전에도 좌표와 연락처를 제공해 대응 정보를 놓치지 않게 합니다. */}
        <div className="detail-section detail-grid">
          <div>
            <h3>연락처</h3>
            <p>{worker.phone}</p>
          </div>
          <div>
            <h3>현재 위치</h3>
            <p>
              {worker.location?.lat}, {worker.location?.lng}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default WorkerDetailModal;

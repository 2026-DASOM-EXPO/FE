import React from 'react';
import { EQUIPMENT_LABELS, WORKER_STATUS, WORKER_STATUS_META } from '../../utils/constants';
import { getRelativeTime } from '../../utils/helpers';
import './WorkerCard.css';

/**
 * WorkerCard 컴포넌트
 * 작업자 정보 카드 - 상태, 생체 신호, 위치 표시
 *
 * @param {object} worker - 카드에 표시할 작업자 데이터입니다.
 * @param {Function} onClick - 카드 선택 시 상세 모달을 여는 콜백입니다.
 */
const WorkerCard = ({ worker, onClick }) => {
  const statusMeta =
    WORKER_STATUS_META[worker.status] || WORKER_STATUS_META[WORKER_STATUS.UNKNOWN];
  const sensorData = worker.sensorData || {};
  const equipmentStatus = sensorData.equipmentStatus || {};
  const missingEquipmentCount = Object.keys(EQUIPMENT_LABELS).filter(
    (key) => !equipmentStatus[key]
  ).length;

  return (
    <button
      className={`worker-card ${statusMeta.tone}`}
      onClick={onClick}
      style={{ borderLeftColor: statusMeta.color }}
      type="button"
      aria-label={`${worker.name} 작업자 상세 보기`}
    >
      <div className="worker-header">
        <h3>{worker.name}</h3>
        <span className="worker-id">{worker.workerId}</span>
      </div>

      {/* 카드 상단에서 현장 대응 우선순위를 바로 판단하도록 상태 배지를 배치합니다. */}
      <div className="worker-status">
        <span
          className="status-badge"
          style={{ backgroundColor: statusMeta.color }}
        >
          {statusMeta.label}
        </span>
        {missingEquipmentCount > 0 && (
          <span className="equipment-alert">
            장비 {missingEquipmentCount}개 미착용
          </span>
        )}
      </div>

      {/* 센서값이 아직 없을 수 있으므로 '-' 대체값을 두어 카드 레이아웃을 안정화합니다. */}
      <div className="worker-vitals">
        <div className="vital">
          <span className="vital-label">심박수</span>
          <span className="vital-value">{sensorData.heartRate ?? '-'} bpm</span>
        </div>
        <div className="vital">
          <span className="vital-label">체온</span>
          <span className="vital-value">{sensorData.temperature ?? '-'}°C</span>
        </div>
      </div>

      {/* 필수 장비 목록은 constants의 라벨을 사용해 상세 모달과 같은 기준으로 표시합니다. */}
      <div className="worker-equipment">
        {Object.entries(EQUIPMENT_LABELS).map(([key, label]) => (
          <span
            key={key}
            className={`equipment-item ${equipmentStatus[key] ? 'equipped' : 'missing'}`}
          >
            {equipmentStatus[key] ? '착용' : '미착용'} {label}
          </span>
        ))}
      </div>

      <div className="worker-footer">
        <small>마지막 업데이트: {getRelativeTime(worker.lastUpdate)}</small>
      </div>
    </button>
  );
};

export default WorkerCard;

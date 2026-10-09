/**
 * 상수 정의
 */

// 작업자 상태
export const WORKER_STATUS = {
  NORMAL: 'normal',
  WARNING: 'warning',
  DANGER: 'danger',
  OFF_DUTY: 'off-duty',
  UNKNOWN: 'unknown',
};

// 작업자 상태별 화면 표시 정보
export const WORKER_STATUS_META = {
  [WORKER_STATUS.NORMAL]: {
    label: '정상',
    tone: 'normal',
    color: '#16a34a',
  },
  [WORKER_STATUS.WARNING]: {
    label: '주의',
    tone: 'warning',
    color: '#d97706',
  },
  [WORKER_STATUS.DANGER]: {
    label: '위험',
    tone: 'danger',
    color: '#dc2626',
  },
  [WORKER_STATUS.OFF_DUTY]: {
    label: '근무 외',
    tone: 'off-duty',
    color: '#64748b',
  },
  [WORKER_STATUS.UNKNOWN]: {
    label: '알 수 없음',
    tone: 'unknown',
    color: '#64748b',
  },
};

// 센서 화면에서 영문 key를 사람이 읽을 수 있는 장비명으로 변환합니다.
export const EQUIPMENT_LABELS = {
  helmet: '안전모',
  safeSuit: '안전조끼',
};

// 알림 심각도
export const ALERT_SEVERITY = {
  EMERGENCY: 'emergency',
  WARNING: 'warning',
  INFO: 'info',
};

// 알림 타입
export const ALERT_TYPE = {
  EMERGENCY: 'emergency',
  BIOMETRIC_ABNORMAL: 'biometric_abnormal',
  EQUIPMENT_MISSING: 'equipment_missing',
  SYSTEM: 'system',
};

// 안전장비 목록
export const EQUIPMENT_TYPES = {
  HELMET: 'helmet',
  SAFE_SUIT: 'safeSuit',
};

// GPS 실시간 연동은 현장 테스트 전까지 주석 처리하고 아래 목데이터를 사용합니다.
export const MOCK_GPS = {
  worker: { lat: 37.500768, lng: 126.867716 },
  drone: { lat: 37.500768, lng: 126.8679 },
};

// 정상 범위 (생체 신호)
export const BIOMETRIC_RANGES = {
  HEART_RATE: {
    MIN: 50,
    MAX: 100,
    WARNING_MAX: 120,
  },
  TEMPERATURE: {
    MIN: 36.0,
    MAX: 37.5,
    WARNING_MIN: 35.5,
    WARNING_MAX: 38.5,
  },
};

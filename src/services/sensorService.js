/**
 * 센서 데이터 처리 서비스
 * 센서 데이터의 유효성 검사, 분석, 위험도 판정 등을 처리
 */

import { useAlert } from '../context/AlertContext';

/**
 * 생체 신호 위험도 판정
 * @param {number} heartRate - 심박수
 * @param {number} temperature - 체온
 * @returns {string} 'normal' | 'warning' | 'danger'
 */
export const assessBiometricRisk = (heartRate, temperature) => {
  // 심박수 정상 범위: 60-100 bpm
  // 체온 정상 범위: 36.0-37.5°C
  const isHeartRateAbnormal = heartRate < 50 || heartRate > 120;
  const isTemperatureAbnormal = temperature < 35.5 || temperature > 38.5;

  if (isHeartRateAbnormal || isTemperatureAbnormal) {
    return 'danger';
  }

  if (heartRate > 100 || temperature > 37.5) {
    return 'warning';
  }

  return 'normal';
};

/**
 * 안전장비 착용 상태 확인
 * @param {object} equipmentStatus - { helmet, safeSuit, safeShoes }
 * @returns {object} { allEquipped: boolean, missingEquipment: array }
 */
export const checkEquipmentCompliance = (equipmentStatus) => {
  const requiredEquipment = ['helmet', 'safeSuit', 'safeShoes'];
  const missingEquipment = requiredEquipment.filter(
    (eq) => !equipmentStatus[eq]
  );

  return {
    allEquipped: missingEquipment.length === 0,
    missingEquipment,
  };
};

/**
 * 작업자 상태 종합 판정
 * @param {object} sensorData - 센서 데이터
 * @returns {object} { status, severity, issues }
 */
export const assessWorkerStatus = (sensorData) => {
  if (!sensorData) {
    return {
      status: 'unknown',
      severity: 'low',
      issues: ['센서 데이터 없음'],
    };
  }

  const issues = [];
  let maxSeverity = 'low';

  // 1. 생체 신호 확인
  const biometricRisk = assessBiometricRisk(
    sensorData.heartRate,
    sensorData.temperature
  );
  if (biometricRisk === 'danger') {
    issues.push('심박수/체온 이상 감지');
    maxSeverity = 'high';
  } else if (biometricRisk === 'warning') {
    issues.push('심박수/체온 주의');
    if (maxSeverity !== 'high') maxSeverity = 'medium';
  }

  // 2. 안전장비 확인
  const equipmentCheck = checkEquipmentCompliance(
    sensorData.equipmentStatus || {}
  );
  if (!equipmentCheck.allEquipped) {
    issues.push(`안전장비 미착용: ${equipmentCheck.missingEquipment.join(', ')}`);
    if (maxSeverity !== 'high') maxSeverity = 'medium';
  }

  // 3. 상태 결정
  let status = 'normal';
  if (maxSeverity === 'high') {
    status = 'danger';
  } else if (maxSeverity === 'medium') {
    status = 'warning';
  }

  return {
    status,
    severity: maxSeverity,
    issues,
  };
};

/**
 * 센서 데이터 유효성 검사
 * @param {object} data - 센서 데이터
 * @returns {boolean} 유효한지 여부
 */
export const isValidSensorData = (data) => {
  return (
    data &&
    typeof data.heartRate === 'number' &&
    typeof data.temperature === 'number' &&
    data.heartRate >= 0 &&
    data.heartRate <= 220 &&
    data.temperature >= 30 &&
    data.temperature <= 45
  );
};

/**
 * 센서 데이터 스무딩 (노이즈 제거)
 * 최근 3개 데이터의 평균값 계산
 * @param {array} dataHistory - 센서 데이터 히스토리
 * @returns {object} 스무딩된 데이터
 */
export const smoothSensorData = (dataHistory) => {
  if (!dataHistory || dataHistory.length === 0) return null;

  const recentData = dataHistory.slice(0, 3);
  const heartRates = recentData.map((d) => d.heartRate).filter((h) => h);
  const temperatures = recentData.map((d) => d.temperature).filter((t) => t);

  if (heartRates.length === 0 || temperatures.length === 0) return null;

  return {
    heartRate: heartRates.reduce((a, b) => a + b, 0) / heartRates.length,
    temperature:
      temperatures.reduce((a, b) => a + b, 0) / temperatures.length,
  };
};

/**
 * 데이터 분석: 시간대별 변화 추세
 * @param {array} dataHistory - 센서 데이터 히스토리
 * @returns {object} { trend: 'increasing' | 'decreasing' | 'stable', change: number }
 */
export const analyzeTrend = (dataHistory) => {
  if (dataHistory.length < 2) return { trend: 'stable', change: 0 };

  const recent = dataHistory[0].heartRate;
  const previous = dataHistory[Math.min(10, dataHistory.length - 1)].heartRate;
  const change = recent - previous;

  let trend = 'stable';
  if (change > 5) trend = 'increasing';
  else if (change < -5) trend = 'decreasing';

  return { trend, change };
};

/**
 * 응급 상황 판정 및 알림 생성
 * @param {object} workerStatus - 작업자 상태 평가 결과
 * @param {object} worker - 작업자 정보
 * @returns {object} 생성할 알림 정보
 */
export const createAlertIfNeeded = (workerStatus, worker) => {
  if (workerStatus.status === 'danger' || workerStatus.severity === 'high') {
    return {
      type: 'emergency',
      severity: 'emergency',
      title: `[긴급] ${worker.name} 작업자 위험 상황 발생`,
      message: workerStatus.issues.join(' / '),
      workerId: worker.id,
      workerName: worker.name,
      location: worker.location,
    };
  }

  if (workerStatus.status === 'warning' || workerStatus.severity === 'medium') {
    return {
      type: 'warning',
      severity: 'warning',
      title: `[경고] ${worker.name} 작업자 주의 필요`,
      message: workerStatus.issues.join(' / '),
      workerId: worker.id,
      workerName: worker.name,
    };
  }

  return null;
};

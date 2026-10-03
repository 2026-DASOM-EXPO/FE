const EQUIPMENT_STATUS_DEFAULTS = {
  helmet: false,
  safeSuit: false,
  safeShoes: false,
};

export const idsEqual = (left, right) => (
  left != null && right != null && String(left) === String(right)
);

export const equipmentStatusKey = (type) => ({
  HELMET: 'helmet',
  VEST: 'safeSuit',
  SOS_BUTTON: 'safeSuit',
  SHOES: 'safeShoes',
}[type]);

export const sensorEquipmentId = (sensor = {}) => (
  sensor.equipment?.id ?? sensor.equipmentId
);

export const sensorWorkerId = (sensor = {}) => (
  sensor.worker?.id ?? sensor.workerId ?? sensor.equipment?.worker?.id
);

const detectedWearStatus = (sensor = {}) => {
  const wearStatus = sensor.wearStatus ?? sensor.equipment?.wearStatus;
  return ['WORN', 'NOT_WORN', 'UNKNOWN'].includes(wearStatus) ? wearStatus : null;
};

// 백엔드는 센서 종류별 로그를 따로 보내며, SOS가 아닌 로그도 sosPressed: false를 기본값으로 담습니다.
// SOS 로그의 값만 반영해야 착용/생체 로그가 SOS 상태를 덮어쓰지 않습니다.
const sensorSosPressed = (sensor = {}, previous) => {
  if (sensor.sensorType) return sensor.sensorType === 'SOS' ? sensor.sosPressed ?? previous : previous;
  return sensor.sosPressed ?? previous;
};

const sensorTime = (sensor = {}) => {
  const time = new Date(sensor.measuredAt || sensor.createdAt).getTime();
  return Number.isFinite(time) ? time : 0;
};

// 이력 API는 최신순으로 내려오므로, 오래된 로그부터 병합해 최신 값이 마지막에 남게 합니다.
export const sortSensorRowsByTime = (rows = []) => (
  [...rows].sort((left, right) => sensorTime(left) - sensorTime(right))
);

const latestDate = (...values) => {
  const timestamps = values
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));
  if (timestamps.length === 0) return new Date();
  return new Date(Math.max(...timestamps));
};

export const mergeEquipmentSensor = (equipmentList, sensor) => {
  const equipmentId = sensorEquipmentId(sensor);
  if (equipmentId == null) return equipmentList;

  const wearStatus = detectedWearStatus(sensor);
  return equipmentList.map((equipment) => {
    if (!idsEqual(equipment.id, equipmentId)) return equipment;

    return {
      ...equipment,
      ...(sensor.equipment || {}),
      wearStatus: wearStatus ?? equipment.wearStatus,
      lastDetectedAt: sensor.measuredAt
        ?? sensor.equipment?.lastDetectedAt
        ?? equipment.lastDetectedAt,
    };
  });
};

export const mergeWorkerEquipment = (workers, equipment) => {
  const workerId = equipment?.worker?.id ?? equipment?.workerId;
  const key = equipmentStatusKey(equipment?.type);
  if (workerId == null || !key) return workers;

  return workers.map((worker) => {
    if (!idsEqual(worker.id, workerId)) return worker;

    return {
      ...worker,
      sensorData: {
        ...(worker.sensorData || {}),
        equipmentStatus: {
          ...EQUIPMENT_STATUS_DEFAULTS,
          ...(worker.sensorData?.equipmentStatus || {}),
          [key]: equipment.wearStatus === 'WORN',
        },
      },
      lastUpdate: new Date(equipment.lastDetectedAt || Date.now()),
    };
  });
};

export const mergeWorkerSensor = (workers, sensor) => {
  const wearStatus = detectedWearStatus(sensor);
  const type = sensor.equipment?.type ?? sensor.equipmentType;
  const key = equipmentStatusKey(type);
  const workerId = sensorWorkerId(sensor);
  if (workerId == null) return workers;

  return workers.map((worker) => {
    if (!idsEqual(worker.id, workerId)) return worker;

    const sensorData = {
      ...(worker.sensorData || {}),
      heartRate: sensor.bpm ?? worker.sensorData?.heartRate,
      latitude: sensor.latitude ?? worker.sensorData?.latitude,
      longitude: sensor.longitude ?? worker.sensorData?.longitude,
      accelX: sensor.accelX ?? worker.sensorData?.accelX,
      accelY: sensor.accelY ?? worker.sensorData?.accelY,
      accelZ: sensor.accelZ ?? worker.sensorData?.accelZ,
      gyroX: sensor.gyroX ?? worker.sensorData?.gyroX,
      gyroY: sensor.gyroY ?? worker.sensorData?.gyroY,
      gyroZ: sensor.gyroZ ?? worker.sensorData?.gyroZ,
      sosPressed: sensorSosPressed(sensor, worker.sensorData?.sosPressed),
      equipmentStatus: {
        ...EQUIPMENT_STATUS_DEFAULTS,
        ...(worker.sensorData?.equipmentStatus || {}),
      },
    };

    if (key && wearStatus != null) {
      sensorData.equipmentStatus[key] = wearStatus === 'WORN';
    }

    return {
      ...worker,
      location: sensor.latitude != null && sensor.longitude != null
        ? { lat: sensor.latitude, lng: sensor.longitude }
        : worker.location,
      sensorData,
      lastUpdate: latestDate(sensor.measuredAt, worker.lastUpdate),
    };
  });
};

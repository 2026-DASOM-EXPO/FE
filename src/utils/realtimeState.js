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
      temperature: sensor.bodyTemperature ?? worker.sensorData?.temperature,
      latitude: sensor.latitude ?? worker.sensorData?.latitude,
      longitude: sensor.longitude ?? worker.sensorData?.longitude,
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

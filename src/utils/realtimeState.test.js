import {
  mergeEquipmentSensor,
  mergeWorkerEquipment,
  mergeWorkerSensor,
  sortSensorRowsByTime,
} from './realtimeState';

describe('realtime sensor state synchronization', () => {
  test('updates an equipment card from NOT_WORN to WORN with a sensor event', () => {
    const equipment = [{
      id: 11,
      type: 'HELMET',
      wearStatus: 'NOT_WORN',
      lastDetectedAt: null,
    }];
    const sensor = {
      equipmentId: '11',
      equipment: { id: 11, type: 'HELMET' },
      wearStatus: 'WORN',
      measuredAt: '2026-07-26T21:00:00',
    };

    expect(mergeEquipmentSensor(equipment, sensor)[0]).toMatchObject({
      id: 11,
      wearStatus: 'WORN',
      lastDetectedAt: '2026-07-26T21:00:00',
    });
  });

  test('updates the matching worker card directly from a sensor event', () => {
    const workers = [{
      id: 1,
      sensorData: {
        equipmentStatus: {
          helmet: false,
          safeSuit: true,
        },
      },
    }];
    const sensor = {
      workerId: '1',
      equipment: { id: 11, type: 'HELMET' },
      wearStatus: 'WORN',
      measuredAt: '2026-07-26T21:00:00',
    };

    expect(mergeWorkerSensor(workers, sensor)[0].sensorData.equipmentStatus).toEqual({
      helmet: true,
      safeSuit: true,
    });
  });

  test('ignores removed safety shoe equipment events', () => {
    const workers = [{
      id: 1,
      sensorData: {
        equipmentStatus: {
          helmet: true,
          safeSuit: true,
        },
      },
    }];

    const updated = mergeWorkerEquipment(workers, {
      worker: { id: 1 },
      type: 'SHOES',
      wearStatus: 'NOT_WORN',
      lastDetectedAt: '2026-07-26T21:01:00',
    });

    expect(updated).toEqual(workers);
  });

  test('does not change wear cards for an SOS event without a wear status', () => {
    const workers = [{
      id: 1,
      sensorData: {
        equipmentStatus: {
          helmet: true,
          safeSuit: true,
        },
      },
    }];

    const updated = mergeWorkerSensor(workers, {
      worker: { id: 1 },
      equipment: { id: 12, type: 'VEST' },
      sensorType: 'SOS',
      sosPressed: true,
    });

    expect(updated).toBe(workers);
  });

  test('keeps SOS pressed when a non-SOS sensor log carries sosPressed false', () => {
    const workers = [{ id: 1, sensorData: { sosPressed: true } }];

    const updated = mergeWorkerSensor(workers, {
      worker: { id: 1 },
      equipment: { id: 11, type: 'HELMET' },
      sensorType: 'WEAR_STATUS',
      wearStatus: 'WORN',
      sosPressed: false,
    });

    expect(updated[0].sensorData.sosPressed).toBe(true);
  });

  test('treats buttonValue 0 as SOS pressed and 1 as safe', () => {
    const workers = [{ id: 1, sensorData: {} }];

    const idle = mergeWorkerSensor(workers, {
      worker: { id: 1 },
      sensorType: 'SOS',
      sosPressed: true,
      rawPayload: '{"buttonValue":1}',
    });
    expect(idle[0].sensorData.sosPressed).toBe(false);

    const pressed = mergeWorkerSensor(idle, {
      worker: { id: 1 },
      sensorType: 'SOS',
      sosPressed: false,
      rawPayload: '{"buttonValue":0}',
    });
    expect(pressed[0].sensorData.sosPressed).toBe(true);
  });

  test('applies the latest SOS log after sorting history rows by time', () => {
    const history = [
      { workerId: 1, sensorType: 'WEAR_STATUS', sosPressed: false, measuredAt: '2026-10-03T08:31:54' },
      { workerId: 1, sensorType: 'MOTION', sosPressed: false, measuredAt: '2026-10-03T08:20:26' },
      { workerId: 1, sensorType: 'SOS', sosPressed: true, measuredAt: '2026-10-03T06:15:02' },
    ];

    const sorted = sortSensorRowsByTime(history);
    expect(sorted.map((row) => row.sensorType)).toEqual(['SOS', 'MOTION', 'WEAR_STATUS']);

    const updated = sorted.reduce(
      (current, sensor) => mergeWorkerSensor(current, sensor),
      [{ id: 1, sensorData: {} }]
    );
    expect(updated[0].sensorData.sosPressed).toBe(true);
  });
});

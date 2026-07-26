import {
  mergeEquipmentSensor,
  mergeWorkerEquipment,
  mergeWorkerSensor,
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
      pressureValue: 2200,
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
          safeShoes: true,
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
      safeShoes: true,
    });
  });

  test('keeps compatibility with the separate equipment SSE event', () => {
    const workers = [{
      id: 1,
      sensorData: {
        equipmentStatus: {
          helmet: true,
          safeSuit: true,
          safeShoes: true,
        },
      },
    }];

    const updated = mergeWorkerEquipment(workers, {
      worker: { id: 1 },
      type: 'SHOES',
      wearStatus: 'NOT_WORN',
      lastDetectedAt: '2026-07-26T21:01:00',
    });

    expect(updated[0].sensorData.equipmentStatus.safeShoes).toBe(false);
  });

  test('does not change wear cards for an SOS event without a wear status', () => {
    const workers = [{
      id: 1,
      sensorData: {
        equipmentStatus: {
          helmet: true,
          safeSuit: true,
          safeShoes: true,
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
});

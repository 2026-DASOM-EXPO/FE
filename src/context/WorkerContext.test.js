import React, { useEffect } from 'react';
import { act, render, screen } from '@testing-library/react';
import { WorkerProvider, useWorker } from './WorkerContext';
import { equipmentAPI, workerAPI } from '../services/api';

const mockRealtimeHandlers = {};
const mockSubscribe = jest.fn((type, handler) => {
  mockRealtimeHandlers[type] = handler;
  return jest.fn();
});

jest.mock('./RealtimeContext', () => ({
  useRealtime: () => ({
    status: 'live',
    subscribe: mockSubscribe,
  }),
}));

jest.mock('../services/api', () => ({
  workerAPI: {
    getAll: jest.fn(),
  },
  equipmentAPI: {
    getAll: jest.fn(),
  },
  sensorAPI: {},
}));

const WorkerCardState = () => {
  const { workers, fetchWorkers } = useWorker();
  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  const helmetWorn = workers[0]?.sensorData?.equipmentStatus?.helmet;
  return <span>{helmetWorn ? '안전모 착용' : '안전모 미착용'}</span>;
};

describe('WorkerContext realtime equipment state', () => {
  beforeEach(() => {
    Object.keys(mockRealtimeHandlers).forEach((key) => delete mockRealtimeHandlers[key]);
    jest.clearAllMocks();
    mockSubscribe.mockImplementation((type, handler) => {
      mockRealtimeHandlers[type] = handler;
      return jest.fn();
    });
    workerAPI.getAll.mockResolvedValue({
      success: true,
      data: [{
        id: 1,
        name: '김민수',
        status: 'NORMAL',
        createdAt: '2026-07-26T20:00:00',
      }],
    });
    equipmentAPI.getAll.mockResolvedValue({
      success: true,
      data: [{
        id: 11,
        worker: { id: 1 },
        type: 'HELMET',
        wearStatus: 'NOT_WORN',
      }],
    });
  });

  test('updates worker cards without waiting for a separate equipment event', async () => {
    render(
      <WorkerProvider>
        <WorkerCardState />
      </WorkerProvider>
    );

    expect(await screen.findByText('안전모 미착용')).toBeInTheDocument();

    act(() => {
      mockRealtimeHandlers.sensor({
        worker: { id: 1 },
        equipment: { id: 11, type: 'HELMET' },
        wearStatus: 'WORN',
        pressureValue: 2200,
        measuredAt: '2026-07-26T21:00:00',
      });
    });

    expect(screen.getByText('안전모 착용')).toBeInTheDocument();
  });
});

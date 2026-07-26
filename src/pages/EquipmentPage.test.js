import React from 'react';
import { act, render, screen, within } from '@testing-library/react';
import EquipmentPage from './EquipmentPage';
import { equipmentAPI, sensorAPI, wearableCommandAPI } from '../services/api';

const mockRealtimeHandlers = {};
const mockFetchWorkers = jest.fn();
const mockSubscribe = jest.fn((type, handler) => {
  mockRealtimeHandlers[type] = handler;
  return jest.fn();
});

jest.mock('../context/WorkerContext', () => ({
  useWorker: () => ({ workers: [], fetchWorkers: mockFetchWorkers }),
}));

jest.mock('../context/RealtimeContext', () => ({
  useRealtime: () => ({
    status: 'live',
    events: [],
    subscribe: mockSubscribe,
  }),
}));

jest.mock('../services/api', () => ({
  equipmentAPI: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  sensorAPI: {
    getByEquipment: jest.fn(),
  },
  wearableCommandAPI: {
    getPending: jest.fn(),
    create: jest.fn(),
    acknowledge: jest.fn(),
  },
}));

describe('EquipmentPage realtime sensor cards', () => {
  beforeEach(() => {
    Object.keys(mockRealtimeHandlers).forEach((key) => delete mockRealtimeHandlers[key]);
    jest.clearAllMocks();
    mockSubscribe.mockImplementation((type, handler) => {
      mockRealtimeHandlers[type] = handler;
      return jest.fn();
    });
    equipmentAPI.getAll.mockResolvedValue({
      success: true,
      data: [{
        id: 11,
        worker: { id: 1, name: '김민수' },
        serialNumber: 'HELMET-001',
        name: 'RA18-DIY 안전모',
        type: 'HELMET',
        status: 'ASSIGNED',
        wearStatus: 'NOT_WORN',
      }],
    });
    wearableCommandAPI.getPending.mockResolvedValue({ success: true, data: [] });
    sensorAPI.getByEquipment.mockResolvedValue({ success: true, data: [] });
  });

  test('changes the list card and selected detail immediately on a sensor SSE event', async () => {
    render(<EquipmentPage />);

    const equipmentCard = await screen.findByRole('button', { name: /ID #11.*RA18-DIY 안전모/ });
    expect(within(equipmentCard).getByText('미착용')).toBeInTheDocument();

    act(() => {
      mockRealtimeHandlers.sensor({
        worker: { id: 1 },
        equipment: {
          id: 11,
          worker: { id: 1, name: '김민수' },
          type: 'HELMET',
        },
        sensorType: 'WEAR_STATUS',
        pressureValue: 2200,
        wearStatus: 'WORN',
        measuredAt: '2026-07-26T21:00:00',
      });
    });

    expect(within(equipmentCard).getByText('착용')).toBeInTheDocument();
    expect(screen.getByText('2200 / 4095')).toBeInTheDocument();
  });
});

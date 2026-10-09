import { iotAPI, riskEventAPI } from './api';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8080/api').replace(/\/$/, '');

const jsonResponse = (data, code = '200') => Promise.resolve({
  ok: true,
  status: Number(code),
  json: () => Promise.resolve({ code, message: '성공', data }),
});

describe('FE to BE MVP API contract', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn(() => jsonResponse({}));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('sends equipment wear status and SOS button values to the real BE paths', async () => {
    await iotAPI.equipmentStatus({
      workerId: 1,
      equipmentId: 101,
      wearStatus: 'WORN',
      lightValue: 300,
    });

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      `${API_BASE_URL}/iot/equipment-status`,
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          workerId: 1,
          equipmentId: 101,
          wearStatus: 'WORN',
          lightValue: 300,
        }),
      }),
    );

    await iotAPI.sos({
      workerId: 1,
      buttonValue: 1,
      equipmentId: 103,
      latitude: 37.5665,
      longitude: 126.978,
      message: 'SOS',
    });

    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      `${API_BASE_URL}/iot/sos`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ workerId: 1, buttonValue: 1 }),
      }),
    );
  });

  test('confirms the alert then requests the risk report containing the video', async () => {
    await riskEventAPI.updateStatus(7001, 'PROCESSING');
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      `${API_BASE_URL}/risk-events/7001/status`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'PROCESSING' }),
      }),
    );

    await riskEventAPI.getReports({ workerId: 1 });
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      `${API_BASE_URL}/events/risk?workerId=1`,
      expect.objectContaining({ method: 'GET' }),
    );
  });
});

import { iotAPI, riskEventAPI, tokenStorage } from './api';

const jsonResponse = (data, code = '200') => Promise.resolve({
  ok: true,
  status: Number(code),
  json: () => Promise.resolve({ code, message: '성공', data }),
});

describe('FE to BE MVP API contract', () => {
  beforeEach(() => {
    localStorage.clear();
    tokenStorage.setTokens({ accessToken: 'integration-token' });
    global.fetch = jest.fn(() => jsonResponse({}));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('sends ESP32 12-bit ADC and SOS button values to the real BE paths', async () => {
    await iotAPI.equipmentStatus({
      workerId: 1,
      equipmentId: 101,
      pressureValue: 4095,
      measuredAt: '2026-07-24T10:00:00',
    });

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      'http://localhost:8080/api/iot/equipment-status',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer integration-token',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          workerId: 1,
          equipmentId: 101,
          pressureValue: 4095,
          measuredAt: '2026-07-24T10:00:00',
        }),
      }),
    );

    await iotAPI.sos({
      workerId: 1,
      equipmentId: 103,
      buttonValue: 1,
      message: 'SOS',
      measuredAt: '2026-07-24T10:01:00',
    });

    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8080/api/iot/sos',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"buttonValue":1'),
      }),
    );
  });

  test('confirms the alert then requests the risk report containing the video', async () => {
    await riskEventAPI.updateStatus(7001, 'PROCESSING');
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      'http://localhost:8080/api/risk-events/7001/status',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'PROCESSING' }),
      }),
    );

    await riskEventAPI.getReports({ workerId: 1 });
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8080/api/events/risk?workerId=1',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});

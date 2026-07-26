import { fireEvent, render, screen } from '@testing-library/react';
import EmergencyAlertModal from './EmergencyAlertModal';

const mockHlsInstances = [];

jest.mock('hls.js', () => ({
  __esModule: true,
  default: class MockHls {
    static Events = { MANIFEST_PARSED: 'manifestParsed', ERROR: 'error' };
    static ErrorTypes = { NETWORK_ERROR: 'networkError', MEDIA_ERROR: 'mediaError' };
    static isSupported() { return true; }

    constructor() {
      this.handlers = {};
      this.loadSource = jest.fn();
      this.attachMedia = jest.fn();
      this.startLoad = jest.fn();
      this.recoverMediaError = jest.fn();
      this.destroy = jest.fn();
      mockHlsInstances.push(this);
    }

    on(event, handler) {
      this.handlers[event] = handler;
    }
  },
}));

const alert = {
  id: 11,
  workerName: '홍길동',
  message: 'SOS 버튼이 눌렸습니다.',
  riskEvent: { id: 7001 },
};

test('shows manager confirmation before exposing the video', () => {
  const onConfirm = jest.fn();
  render(
    <EmergencyAlertModal
      alert={alert}
      video={null}
      loading={false}
      error=""
      onConfirm={onConfirm}
      onClose={() => undefined}
    />,
  );

  expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  expect(screen.getByText('119 신고')).toBeInTheDocument();
  expect(screen.getByText('외부 신고 안 함')).toBeInTheDocument();
  expect(screen.queryByLabelText('드론 현장 영상')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '확인하고 현장 영상 보기' }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
});

test('renders the confirmed 720p video player', () => {
  render(
    <EmergencyAlertModal
      alert={alert}
      video={{
        streamUrl: 'http://localhost:8888/DRONE-1/index.m3u8',
        protocol: 'HLS',
        width: 1280,
        height: 720,
        frameRate: 30,
      }}
      loading={false}
      error=""
      onConfirm={() => undefined}
      onClose={() => undefined}
    />,
  );

  expect(screen.getByLabelText('드론 현장 영상')).toBeInTheDocument();
  expect(screen.getByText('1280×720 · 30fps · HLS')).toBeInTheDocument();
  expect(mockHlsInstances.at(-1).loadSource)
    .toHaveBeenCalledWith('http://localhost:8888/DRONE-1/index.m3u8');
});

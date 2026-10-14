import React, { useEffect, useMemo, useState } from 'react';
import { useAlert } from '../../context/AlertContext';
import { riskEventAPI } from '../../services/api';
import EmergencyAlertModal from './EmergencyAlertModal';

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const emptyDroneVideo = {
  streamUrl: '',
  protocol: 'HLS',
  width: 1280,
  height: 720,
  frameRate: 30,
};

const EmergencyDispatchController = () => {
  const { alerts, loading: alertsLoading, markAsRead } = useAlert();
  const [dismissedIds, setDismissedIds] = useState(() => new Set());
  // 앱을 켤 때 이미 쌓여 있던 미확인 알림은 팝업으로 띄우지 않고, 이후 새로 들어온 알림만 띄웁니다.
  const [initialAlertIds, setInitialAlertIds] = useState(null);
  const [activeAlertId, setActiveAlertId] = useState(null);
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialAlertIds || alertsLoading) return;
    setInitialAlertIds(new Set(alerts.map((alert) => alert.id)));
  }, [alerts, alertsLoading, initialAlertIds]);

  const latestDanger = useMemo(
    () => (initialAlertIds && alerts.find((alert) =>
      (alert.type === 'sos_request' || ['danger', 'emergency'].includes(alert.severity))
      && !alert.read
      && !initialAlertIds.has(alert.id)
      && !dismissedIds.has(alert.id)
    )) || null,
    [alerts, dismissedIds, initialAlertIds]
  );

  const activeAlert = useMemo(
    () => alerts.find((alert) => alert.id === activeAlertId) || latestDanger,
    [activeAlertId, alerts, latestDanger]
  );

  useEffect(() => {
    if (!activeAlertId && latestDanger) {
      setActiveAlertId(latestDanger.id);
      setVideo(null);
      setError('');
    }
  }, [activeAlertId, latestDanger]);

  const findVideo = async (workerId, riskEventId) => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const reports = await riskEventAPI.getReports({ workerId });
      const report = reports.success
        ? (reports.data || []).find((item) => item.riskEvent?.id === riskEventId)
        : null;
      if (report?.droneVideo?.streamStatus === 'FAILED') {
        return {
          success: false,
          error: '드론 출동은 완료됐지만 카메라 RTSP 영상 연결에 실패했습니다. 카메라 전원·네트워크·RTSP 주소를 확인한 뒤 다시 시도하세요.',
        };
      }
      if (report?.droneVideo?.active && report.droneVideo.streamStatus === 'STREAMING') {
        return { success: true, data: report.droneVideo };
      }
      if (attempt < 5) await wait(500);
    }
    return { success: false, error: '드론 영상 스트림이 아직 준비되지 않았습니다.' };
  };

  const confirmDispatch = async () => {
    const riskEventId = activeAlert?.riskEvent?.id;
    // 스트림 연결 여부와 관계없이 확인 즉시 전체 화면 영상 영역을 엽니다.
    setVideo(emptyDroneVideo);
    setLoading(true);
    setError('');

    if (!riskEventId) {
      setError('연결된 위험 이벤트를 찾을 수 없습니다.');
      setLoading(false);
      return;
    }

    const confirmed = await riskEventAPI.updateStatus(riskEventId, 'PROCESSING');
    if (!confirmed.success) {
      setError(confirmed.error || '드론 출동 승인에 실패했습니다.');
      setLoading(false);
      return;
    }

    const videoResult = await findVideo(activeAlert.workerId, riskEventId);
    if (!videoResult.success) {
      // 연결 실패 시에도 검은색 영상 대기 화면은 유지합니다.
      setError(videoResult.error);
      await markAsRead(activeAlert.id);
      setLoading(false);
      return;
    }

    setVideo(videoResult.data);
    await markAsRead(activeAlert.id);
    setLoading(false);
  };

  const close = () => {
    if (activeAlert?.id) {
      setDismissedIds((current) => new Set(current).add(activeAlert.id));
    }
    setActiveAlertId(null);
    setVideo(null);
    setError('');
  };

  return (
    <EmergencyAlertModal
      alert={activeAlert}
      video={video}
      loading={loading}
      error={error}
      onConfirm={confirmDispatch}
      onClose={close}
    />
  );
};

export default EmergencyDispatchController;

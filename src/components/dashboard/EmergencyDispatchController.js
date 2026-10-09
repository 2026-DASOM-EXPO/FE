import React, { useEffect, useMemo, useState } from 'react';
import { useAlert } from '../../context/AlertContext';
import { riskEventAPI } from '../../services/api';
import EmergencyAlertModal from './EmergencyAlertModal';
import RiskAlertToast from './RiskAlertToast';

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const EmergencyDispatchController = () => {
  const { alerts, markAsRead } = useAlert();
  const [dismissedIds, setDismissedIds] = useState(() => new Set());
  const [dismissedWarningIds, setDismissedWarningIds] = useState(() => new Set());
  const [activeAlertId, setActiveAlertId] = useState(null);
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const latestDanger = useMemo(
    () => alerts.find((alert) =>
      (alert.type === 'sos_request' || ['danger', 'emergency'].includes(alert.severity))
      && !alert.read
      && !dismissedIds.has(alert.id)
    ) || null,
    [alerts, dismissedIds]
  );

  const latestWarning = useMemo(
    () => alerts.find((alert) =>
      alert.severity === 'warning'
      && !alert.read
      && !dismissedWarningIds.has(alert.id)
    ) || null,
    [alerts, dismissedWarningIds]
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
    if (!riskEventId) {
      setError('연결된 위험 이벤트를 찾을 수 없습니다.');
      return;
    }

    setLoading(true);
    setError('');
    const confirmed = await riskEventAPI.updateStatus(riskEventId, 'PROCESSING');
    if (!confirmed.success) {
      setError(confirmed.error || '드론 출동 승인에 실패했습니다.');
      setLoading(false);
      return;
    }

    const videoResult = await findVideo(activeAlert.workerId, riskEventId);
    if (!videoResult.success) {
      setError(videoResult.error);
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

  const acknowledgeWarning = async () => {
    if (!latestWarning?.id) return;
    const visibleWarningIds = alerts
      .filter((alert) => alert.severity === 'warning' && !alert.read)
      .map((alert) => alert.id);
    window.dispatchEvent(new CustomEvent('worksafe:focus-worker', {
      detail: { workerId: latestWarning.workerId },
    }));
    setDismissedWarningIds((current) => new Set([
      ...current,
      ...visibleWarningIds,
    ]));
    await markAsRead(latestWarning.id);
  };

  return (
    <>
      <RiskAlertToast alert={latestWarning} onConfirm={acknowledgeWarning} />
      <EmergencyAlertModal
        alert={activeAlert}
        video={video}
        loading={loading}
        error={error}
        onConfirm={confirmDispatch}
        onClose={close}
      />
    </>
  );
};

export default EmergencyDispatchController;

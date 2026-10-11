import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import './EmergencyAlertModal.css';

export const DroneVideoPlayer = ({ video }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const element = videoRef.current;
    if (!element || !video?.streamUrl) return undefined;

    if (video.protocol === 'HLS' && Hls.isSupported()) {
      let recoveryAttempts = 0;
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 8,
        manifestLoadingMaxRetry: 4,
        levelLoadingMaxRetry: 4,
        fragLoadingMaxRetry: 6,
      });
      hls.loadSource(video.streamUrl);
      hls.attachMedia(element);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        recoveryAttempts = 0;
        element.play().catch(() => undefined);
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;

        recoveryAttempts += 1;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && recoveryAttempts <= 3) {
          hls.startLoad();
          return;
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && recoveryAttempts <= 3) {
          hls.recoverMediaError();
        }
      });
      return () => hls.destroy();
    }

    element.src = video.streamUrl;
    element.play().catch(() => undefined);
    return () => {
      element.pause();
      element.removeAttribute('src');
      element.load();
    };
  }, [video]);

  return (
    <div className="emergency-video">
      <div className="emergency-video__viewport">
        <video ref={videoRef} controls autoPlay muted playsInline aria-label="드론 영상" />
      </div>
    </div>
  );
};

const EmergencyAlertModal = ({
  alert,
  video,
  loading,
  error,
  onConfirm,
  onClose,
}) => {
  if (!alert) return null;

  const isSos = alert.type === 'sos_request';

  return (
    <div className={`emergency-modal-backdrop ${video ? 'emergency-modal-backdrop--video' : ''}`} role="presentation">
      <section className={`emergency-modal ${video ? 'emergency-modal--video' : ''}`} role="alertdialog" aria-modal="true" aria-labelledby="sos-modal-title">
        <div className="emergency-modal__signal">위험</div>
        <div className="emergency-modal__header">
          <div>
            <h2 id="sos-modal-title">{alert.workerName || '작업자'} {isSos ? 'SOS 요청' : '위험 감지'}</h2>
            <p className="emergency-modal__phone">연락처: {alert.workerPhone || '정보 없음'}</p>
          </div>
          {video && <button type="button" className="emergency-modal__close" onClick={onClose} aria-label="경고창 닫기">×</button>}
        </div>

        {!video ? (
          <>
            {error && <p className="emergency-modal__error">{error}</p>}
            <div className="emergency-modal__actions">
              <button type="button" className="emergency-modal__cancel" onClick={onClose} disabled={loading}>취소</button>
              <button type="button" className="emergency-modal__confirm" onClick={onConfirm} disabled={loading}>
                {loading ? '영상 연결 중...' : '확인'}
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              className="emergency-modal__video-close"
              onClick={onClose}
              aria-label="드론 영상 닫기"
            >
              ×
            </button>
            <DroneVideoPlayer video={video} />
          </>
        )}
      </section>
    </div>
  );
};

export default EmergencyAlertModal;

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import './EmergencyAlertModal.css';

const DroneVideoPlayer = ({ video }) => {
  const videoRef = useRef(null);
  const [playerError, setPlayerError] = useState('');

  useEffect(() => {
    const element = videoRef.current;
    if (!element || !video?.streamUrl) return undefined;
    setPlayerError('');

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
        setPlayerError('');
        element.play().catch(() => {
          setPlayerError('브라우저 재생 버튼을 눌러 현장 영상을 시작하세요.');
        });
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;

        recoveryAttempts += 1;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && recoveryAttempts <= 3) {
          setPlayerError('영상 연결을 복구하고 있습니다...');
          hls.startLoad();
          return;
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && recoveryAttempts <= 3) {
          setPlayerError('영상 디코더를 복구하고 있습니다...');
          hls.recoverMediaError();
          return;
        }
        setPlayerError('드론 영상 게이트웨이에 연결하지 못했습니다. 스트림 상태를 확인하세요.');
      });
      return () => hls.destroy();
    }

    element.src = video.streamUrl;
    const handleLoadedData = () => setPlayerError('');
    const handleError = () => setPlayerError('드론 영상을 재생하지 못했습니다.');
    element.addEventListener('loadeddata', handleLoadedData);
    element.addEventListener('error', handleError);
    element.play().catch(() => undefined);
    return () => {
      element.pause();
      element.removeEventListener('loadeddata', handleLoadedData);
      element.removeEventListener('error', handleError);
      element.removeAttribute('src');
      element.load();
    };
  }, [video]);

  return (
    <div className="emergency-video">
      <div className="emergency-video__meta">
        <strong>드론 현장 영상</strong>
        <span>{video.width}×{video.height} · {video.frameRate}fps · {video.protocol}</span>
      </div>
      <video ref={videoRef} controls autoPlay muted playsInline aria-label="드론 현장 영상" />
      {playerError && <p className="emergency-modal__error">{playerError}</p>}
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

  return (
    <div className="emergency-modal-backdrop" role="presentation">
      <section className="emergency-modal" role="alertdialog" aria-modal="true" aria-labelledby="sos-modal-title">
        <div className="emergency-modal__signal">SOS</div>
        <div className="emergency-modal__header">
          <div>
            <span>LV.3 긴급 경고</span>
            <h2 id="sos-modal-title">{alert.workerName || '작업자'} SOS 요청</h2>
          </div>
          {video && <button type="button" className="emergency-modal__close" onClick={onClose} aria-label="경고창 닫기">×</button>}
        </div>

        <p className="emergency-modal__message">{alert.message || '작업자가 SOS 버튼을 눌렀습니다.'}</p>

        {!video ? (
          <>
            <div className="emergency-modal__facts">
              <div><span>드론</span><strong>자동 출동 중</strong></div>
              <div><span>119 신고</span><strong>외부 신고 안 함</strong></div>
              <div><span>영상</span><strong>관리자 확인 후 시작</strong></div>
            </div>
            {error && <p className="emergency-modal__error">{error}</p>}
            <button type="button" className="emergency-modal__confirm" onClick={onConfirm} disabled={loading}>
              {loading ? '영상 연결 중...' : '확인하고 현장 영상 보기'}
            </button>
          </>
        ) : (
          <DroneVideoPlayer video={video} />
        )}
      </section>
    </div>
  );
};

export default EmergencyAlertModal;

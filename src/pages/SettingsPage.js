import React from 'react';
import { useAlert } from '../context/AlertContext';
import { useRealtime } from '../context/RealtimeContext';
import { useWorker } from '../context/WorkerContext';
import './SettingsPage.css';

const SettingsPage = () => {
  const { status } = useRealtime();
  const { workers } = useWorker();
  const { unreadCount } = useAlert();

  return (
    <div className="settings-page settings-page--simple">
      <section className="settings-simple-panel">
        <div>
          <span>시스템 상태</span>
          <h1>설정</h1>
          <p>시연에 필요한 핵심 상태만 표시합니다.</p>
        </div>
        <div className="settings-simple-grid">
          <div><span>실시간 연결</span><strong>{status === 'live' ? 'LIVE' : '연결 중'}</strong></div>
          <div><span>작업자</span><strong>{workers.length}명</strong></div>
          <div><span>미확인 알림</span><strong>{unreadCount}건</strong></div>
        </div>
      </section>
    </div>
  );
};

export default SettingsPage;

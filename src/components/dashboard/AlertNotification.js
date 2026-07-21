import React from 'react';
import './AlertNotification.css';

/**
 * AlertNotification 컴포넌트
 * 알림 한 건의 제목, 본문, 읽음/삭제 액션, 발생 시간을 표시합니다.
 *
 * @param {object} alert - severity/read/timestamp를 포함한 알림 데이터입니다.
 * @param {Function} onDismiss - 알림 삭제 버튼을 눌렀을 때 실행할 콜백입니다.
 * @param {Function} onRead - 읽음 처리 버튼을 눌렀을 때 실행할 콜백입니다.
 */
const AlertNotification = ({ alert, onDismiss, onRead }) => {
  // severity 값에 따라 좌측 강조선 색상을 결정합니다.
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'emergency':
        return '#dc2626';
      case 'warning':
        return '#d97706';
      case 'info':
        return '#2563eb';
      default:
        return '#64748b';
    }
  };

  // 상위 컨텍스트의 markAsRead 함수가 있을 때만 안전하게 호출합니다.
  const handleRead = () => {
    if (onRead) {
      onRead(alert.id);
    }
  };

  // 삭제/닫기 동작 역시 상위에서 전달한 콜백을 통해 상태를 갱신합니다.
  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss(alert.id);
    }
  };

  return (
    <div
      className={`alert-notification ${alert.severity} ${alert.read ? 'read' : 'unread'}`}
      style={{ borderLeftColor: getSeverityColor(alert.severity) }}
    >
      <div className="alert-content">
        <h4>{alert.title}</h4>
        <p>{alert.message}</p>
      </div>

      <div className="alert-actions">
        {!alert.read && (
          <button className="btn-read" type="button" onClick={handleRead}>
            읽음
          </button>
        )}
        <button className="btn-dismiss" type="button" onClick={handleDismiss}>
          닫기
        </button>
      </div>

      <small className="alert-time">
        {new Date(alert.timestamp).toLocaleTimeString()}
      </small>
    </div>
  );
};

export default AlertNotification;

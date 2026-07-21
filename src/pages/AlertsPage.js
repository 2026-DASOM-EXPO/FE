import React from 'react';
import { useAlert } from '../context/AlertContext';
import AlertNotification from '../components/dashboard/AlertNotification';
import './AlertsPage.css';

/**
 * AlertsPage 컴포넌트
 * 모든 알림의 긴급도, 읽음 상태, 삭제/읽음 처리 액션을 관리합니다.
 */
const AlertsPage = () => {
  const {
    alerts,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeAlert,
    getEmergencyAlerts,
  } = useAlert();

  // 긴급 알림은 요약 카드에서 별도로 보여 운영자가 대응 우선순위를 확인하게 합니다.
  const emergencyAlerts = getEmergencyAlerts();

  return (
    <div className="alerts-page">
      <h1>알림 관리</h1>

      {/* 요약 정보 */}
      <div className="alerts-summary">
        <div className="summary-card emergency">
          <h3>긴급 알림</h3>
          <p className="count">{emergencyAlerts.length}</p>
        </div>
        <div className="summary-card unread">
          <h3>읽지 않은 알림</h3>
          <p className="count">{unreadCount}</p>
        </div>
        <div className="summary-card total">
          <h3>전체 알림</h3>
          <p className="count">{alerts.length}</p>
        </div>
      </div>

      {/* 일괄 작업 버튼 */}
      {unreadCount > 0 && (
        <div className="action-buttons">
          <button className="btn-primary" type="button" onClick={markAllAsRead}>
            모두 읽음 처리
          </button>
        </div>
      )}

      {/* 알림 목록 */}
      <div className="alerts-container">
        {alerts.length === 0 ? (
          <div className="no-alerts">알림이 없습니다.</div>
        ) : (
          alerts.map((alert) => (
            <AlertNotification
              key={alert.id}
              alert={alert}
              onRead={markAsRead}
              onDismiss={removeAlert}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default AlertsPage;

import React, { useEffect, useState } from 'react';
import './RiskAlertToast.css';

const RiskAlertToast = ({ alert, onConfirm }) => {
  const [dismissedAlertId, setDismissedAlertId] = useState(null);

  useEffect(() => {
    setDismissedAlertId(null);
  }, [alert?.id]);

  if (!alert || alert.id === dismissedAlertId) return null;

  const dismiss = () => {
    setDismissedAlertId(alert.id);
    onConfirm();
  };

  return (
    <aside className="risk-alert-toast" role="status" aria-live="polite">
      <div className="risk-alert-toast__copy">
        <strong>{alert.workerName || '작업자'}</strong>
      </div>
      <button type="button" onClick={dismiss}>확인</button>
    </aside>
  );
};

export default RiskAlertToast;

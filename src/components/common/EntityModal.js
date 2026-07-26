import React from 'react';
import './EntityModal.css';

const EntityModal = ({ title, description, children, onClose, onSubmit, submitLabel = '저장', busy = false }) => (
  <div className="entity-modal-backdrop" role="presentation">
    <section className="entity-modal" role="dialog" aria-modal="true" aria-label={title}>
      <header className="entity-modal__header">
        <div>
          <span>WORKSAFE+ 관리</span>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="모달 닫기">×</button>
      </header>
      <form onSubmit={onSubmit}>
        <div className="entity-modal__body">{children}</div>
        <footer className="entity-modal__actions">
          <button type="button" className="entity-modal__cancel" onClick={onClose}>취소</button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? '처리 중...' : submitLabel}
          </button>
        </footer>
      </form>
    </section>
  </div>
);

export default EntityModal;

import React from "react";

const ConfirmModal = ({
  open,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  danger = false,
  children,
}) => {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-content" role="dialog" aria-modal="true">
        <h2 className="modal-title">{title}</h2>
        <div className="modal-message">{message}</div>
        {children}
        <div className="modal-actions">
          <button className="modal-btn" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            className={`modal-btn ${danger ? "modal-btn-danger" : "modal-btn-primary"}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(31, 41, 55, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18);
          padding: 2rem 2.5rem 1.5rem 2.5rem;
          min-width: 320px;
          max-width: 90vw;
          text-align: center;
        }
        .modal-title {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 0.75rem;
          color: #1f2937;
        }
        .modal-message {
          color: #6b7280;
          font-size: 1rem;
          margin-bottom: 1.5rem;
        }
        .modal-actions {
          display: flex;
          justify-content: center;
          gap: 1rem;
        }
        .modal-btn {
          padding: 0.65rem 1.5rem;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          background: #f3f4f6;
          color: #374151;
          transition: background 0.2s, color 0.2s;
        }
        .modal-btn:hover {
          background: #e5e7eb;
        }
        .modal-btn-danger {
          background: #fee2e2;
          color: #dc2626;
        }
        .modal-btn-danger:hover {
          background: #fecaca;
          color: #b91c1c;
        }
        .modal-btn-primary {
          background: #2563eb;
          color: #fff;
        }
        .modal-btn-primary:hover {
          background: #1d4ed8;
        }
      `}</style>
    </div>
  );
};

export default ConfirmModal;

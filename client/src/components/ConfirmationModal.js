import React, { useEffect } from 'react';
import './ConfirmationModal.css';

const ConfirmationModal = ({ 
  isOpen, 
  title, 
  message, 
  confirmText = "Confirm", 
  cancelText = "Cancel", 
  onConfirm, 
  onCancel,
  type = "default" // "default", "danger", "warning"
}) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
      return () => {
        document.body.classList.remove('modal-open');
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    // Only close if clicking the overlay, not the modal content
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div className="confirmation-overlay" onClick={handleOverlayClick}>
      <div className="confirmation-modal">
        <div className="confirmation-header">
          <h3 className={`confirmation-title ${type}`}>{title}</h3>
        </div>

        <div className="confirmation-content">
          <div className="confirmation-message">
            {message}
          </div>
        </div>

        <div className="confirmation-actions">
          <button 
            onClick={onCancel} 
            className="confirmation-cancel-btn"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm} 
            className={`confirmation-confirm-btn ${type}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
import { useState, useCallback } from 'react';

export const usePopup = () => {
  const [popupState, setPopupState] = useState({
    isOpen: false,
    content: '',
    type: 'info',
    title: '',
    autoClose: true,
    autoCloseDelay: 5000
  });

  const showPopup = useCallback((options) => {
    const {
      content,
      type = 'info',
      title = '',
      autoClose = true,
      autoCloseDelay = 5000
    } = options;

    setPopupState({
      isOpen: true,
      content,
      type,
      title,
      autoClose,
      autoCloseDelay
    });
  }, []);

  const hidePopup = useCallback(() => {
    setPopupState(prev => ({
      ...prev,
      isOpen: false
    }));
  }, []);

  const showSuccess = useCallback((content, title = 'Success', autoClose = true) => {
    showPopup({
      content,
      type: 'success',
      title,
      autoClose,
      autoCloseDelay: 5000
    });
  }, [showPopup]);

  const showError = useCallback((content, title = 'Error', autoClose = false) => {
    showPopup({
      content,
      type: 'error',
      title,
      autoClose,
      autoCloseDelay: 8000
    });
  }, [showPopup]);

  const showInfo = useCallback((content, title = 'Information', autoClose = true) => {
    showPopup({
      content,
      type: 'info',
      title,
      autoClose,
      autoCloseDelay: 5000
    });
  }, [showPopup]);

  const showWarning = useCallback((content, title = 'Warning', autoClose = true) => {
    showPopup({
      content,
      type: 'warning',
      title,
      autoClose,
      autoCloseDelay: 5000
    });
  }, [showPopup]);

  return {
    popup: {
      ...popupState,
      onClose: hidePopup
    },
    showPopup,
    hidePopup,
    showSuccess,
    showError,
    showInfo,
    showWarning   // 👈 Added warning support
  };
};

export default usePopup;

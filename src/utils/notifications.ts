import { ToastType } from '../components/Toast';

// This will be set by the ToastProvider
let toastContext: {
  showToast: (message: string, type: ToastType) => void;
} | null = null;

export const setToastContext = (context: { showToast: (message: string, type: ToastType) => void }) => {
  toastContext = context;
};

export const notify = {
  success: (message: string) => {
    if (toastContext) {
      toastContext.showToast(message, 'success');
    } else {
      console.warn('Toast context not initialized');
    }
  },
  error: (message: string) => {
    if (toastContext) {
      toastContext.showToast(message, 'error');
    } else {
      console.warn('Toast context not initialized');
    }
  },
  info: (message: string) => {
    if (toastContext) {
      toastContext.showToast(message, 'info');
    } else {
      console.warn('Toast context not initialized');
    }
  },
  warning: (message: string) => {
    if (toastContext) {
      toastContext.showToast(message, 'warning');
    } else {
      console.warn('Toast context not initialized');
    }
  },
};

import React, { useState } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'red' | 'blue';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = 'blue',
}) => {
  if (!isOpen) return null;

  const confirmButtonClass = confirmColor === 'red'
    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
    : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-600 mb-6">{message}</p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${confirmButtonClass}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook for using confirmation dialog
export const useConfirmDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: 'red' | 'blue';
  } | null>(null);

  const confirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    options?: {
      confirmText?: string;
      cancelText?: string;
      confirmColor?: 'red' | 'blue';
    }
  ) => {
    setConfig({
      title,
      message,
      onConfirm: () => {
        setIsOpen(false);
        onConfirm();
      },
      confirmText: options?.confirmText,
      cancelText: options?.cancelText,
      confirmColor: options?.confirmColor,
    });
    setIsOpen(true);
  };

  const Dialog = () => (
    <ConfirmDialog
      isOpen={isOpen}
      title={config?.title || ''}
      message={config?.message || ''}
      onConfirm={config?.onConfirm || (() => {})}
      onCancel={() => setIsOpen(false)}
      confirmText={config?.confirmText}
      cancelText={config?.cancelText}
      confirmColor={config?.confirmColor}
    />
  );

  return { confirm, Dialog };
};

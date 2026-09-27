import React, { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import { AppNotification } from '../types';

const timeAgo = (iso: string): string => {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return new Date(iso).toLocaleDateString();
};

interface NotificationBellProps {
  /** Colours for the bell button, so it fits the header it sits in. */
  buttonClassName?: string;
}

/**
 * The header bell: a red dot while anything is unread, and a dropdown with
 * the latest notifications. Opening one marks it read and goes to its page.
 */
const NotificationBell: React.FC<NotificationBellProps> = ({ buttonClassName = 'hover:text-gray-600' }) => {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const history = useHistory();

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const handleMouseDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const openNotification = (notification: AppNotification) => {
    if (!notification.readAt) {
      markRead(notification.id);
    }
    setOpen(false);
    if (notification.link) {
      history.push(notification.link);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className={`${buttonClassName} transition p-2 relative`}
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500" data-testid="notification-dot"></span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white text-gray-900 rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden"
          role="dialog"
          aria-label="Notifications"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className="text-sm text-blue-600 hover:text-blue-700">
                Mark all as read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500">No notifications yet</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-gray-100">
              {notifications.map(notification => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => openNotification(notification)}
                    className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-50 ${notification.readAt ? '' : 'bg-blue-50'}`}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${notification.readAt ? 'bg-transparent' : 'bg-blue-500'}`}
                    ></span>
                    <span className="min-w-0">
                      <span className={`block text-sm ${notification.readAt ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>
                        {notification.title}
                      </span>
                      <span className="block text-sm text-gray-600 break-words">{notification.message}</span>
                      <span className="block text-xs text-gray-400 mt-1">{timeAgo(notification.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

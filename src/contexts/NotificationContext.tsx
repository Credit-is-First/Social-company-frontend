import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { getAccessToken, notificationsAPI, refreshSession } from '../services/api';
import { AppNotification } from '../types';

/** How many of the latest notifications the bell keeps. */
const LIST_LIMIT = 20;

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  /** True while the live connection is up and signed in. */
  connected: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface ReadEvent {
  ids: string[] | 'all';
  unreadCount: number;
}

/**
 * Keeps the bell's list and unread count, live.
 *
 * The list comes from the REST API; new notifications arrive over socket.io.
 * After connecting, the socket sends the in-memory access token in an
 * `authenticate` message (never in the URL). If the server refuses it, the
 * token most likely expired while the socket was offline, so the session is
 * refreshed once and the socket reconnects. Every reconnect also reloads the
 * list, so anything sent while disconnected still shows up.
 */
export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const userId = user ? user.id : null;

  const load = useCallback(async () => {
    try {
      const { data } = await notificationsAPI.list(LIST_LIMIT);
      setNotifications(data.items);
      setUnreadCount(data.unreadCount);
    } catch (error) {
      // Leave the bell as it was; the next reconnect or sign-in reloads it.
    }
  }, []);

  useEffect(() => {
    setNotifications([]);
    setUnreadCount(0);
    setConnected(false);
    if (!userId) {
      return undefined;
    }

    let disposed = false;
    let retriedAfterRefusal = false;
    const socket = io('/notifications', { path: '/socket.io' });

    socket.on('connect', () => {
      socket.emit('authenticate', { token: getAccessToken() }, (result: { ok: boolean }) => {
        if (disposed || !result || !result.ok) {
          return;
        }
        retriedAfterRefusal = false;
        setConnected(true);
        load();
      });
    });

    socket.on('unauthorized', () => {
      setConnected(false);
      // The server disconnects after refusing, and socket.io does not
      // reconnect on its own after a server-side disconnect.
      if (retriedAfterRefusal) {
        return;
      }
      retriedAfterRefusal = true;
      refreshSession()
        .then(() => {
          if (!disposed) socket.connect();
        })
        .catch(() => undefined); // Signed out: AuthContext takes it from here.
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('notification', (notification: AppNotification) => {
      setNotifications(previous =>
        previous.some(item => item.id === notification.id)
          ? previous
          : [notification, ...previous].slice(0, LIST_LIMIT),
      );
      setUnreadCount(count => count + 1);
      showToast(`${notification.title}: ${notification.message}`, 'info');
    });

    // Another tab (or this one) read something: keep every tab's bell in step.
    socket.on('notifications:read', ({ ids, unreadCount: remaining }: ReadEvent) => {
      const now = new Date().toISOString();
      setNotifications(previous =>
        previous.map(item =>
          !item.readAt && (ids === 'all' || ids.indexOf(item.id) !== -1) ? { ...item, readAt: now } : item,
        ),
      );
      setUnreadCount(remaining);
    });

    load();

    return () => {
      disposed = true;
      socket.close();
    };
  }, [userId, load, showToast]);

  const markRead = useCallback(async (id: string) => {
    const now = new Date().toISOString();
    setNotifications(previous => previous.map(item => (item.id === id && !item.readAt ? { ...item, readAt: now } : item)));
    try {
      const { data } = await notificationsAPI.markRead(id);
      setUnreadCount(data.unreadCount);
    } catch (error) {
      load();
    }
  }, [load]);

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString();
    setNotifications(previous => previous.map(item => (item.readAt ? item : { ...item, readAt: now })));
    setUnreadCount(0);
    try {
      await notificationsAPI.markAllRead();
    } catch (error) {
      load();
    }
  }, [load]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, connected, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
};

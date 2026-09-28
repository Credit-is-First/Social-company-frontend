import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { clearSession, getAccessToken, notificationsAPI, refreshSession } from '../services/api';
import { AppNotification } from '../types';
import { isSessionGone, mergeIncoming, retryDelayMs } from './notificationRecovery';

/** How many of the latest notifications the bell keeps. */
const LIST_LIMIT = 20;

/**
 * A token refused this soon after a successful refresh was not refused for
 * being old: the account itself is no longer allowed (blocked or deleted), so
 * refreshing again would only loop.
 */
const FRESH_TOKEN_MS = 10 * 1000;

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
 * `authenticate` message (never in the URL). The server drops the socket with
 * `unauthorized` when that token expires or the account is blocked; the socket
 * then signs in again with a renewed token, refreshing the session if needed
 * and retrying with backoff while the server is unreachable. If the session
 * turns out to be gone, the user is signed out. Every reconnect reloads the
 * list, so anything sent while disconnected still shows up.
 */
export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const userId = user ? user.id : null;

  // Bumped whenever the signed-in user changes, so a list requested for the
  // previous user is never shown to the next one.
  const generation = useRef(0);
  // Ids of the notifications on show, so a repeated event is not counted twice.
  const knownIds = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    const requestedFor = generation.current;
    try {
      const { data } = await notificationsAPI.list(LIST_LIMIT);
      if (requestedFor !== generation.current) {
        return;
      }
      knownIds.current = new Set(data.items.map(item => item.id));
      setNotifications(data.items);
      setUnreadCount(data.unreadCount);
    } catch (error) {
      // Leave the bell as it was; the next reconnect or sign-in reloads it.
    }
  }, []);

  useEffect(() => {
    generation.current += 1;
    knownIds.current = new Set();
    setNotifications([]);
    setUnreadCount(0);
    setConnected(false);
    if (!userId) {
      return undefined;
    }

    let disposed = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryAttempt = 0;
    let lastSentToken: string | null = null;
    let lastRefreshAt = 0;
    const socket = io('/notifications', { path: '/socket.io' });

    // socket.io does not reconnect on its own after the server disconnects it.
    const reconnect = () => {
      if (!disposed) socket.connect();
    };

    // Renew the session, then sign the socket in again. While the server is
    // unreachable (a restart, a network drop) keep trying with backoff; if it
    // says the session is gone, sign out, which also closes this socket.
    const recover = () => {
      refreshSession()
        .then(() => {
          lastRefreshAt = Date.now();
          retryAttempt = 0;
          reconnect();
        })
        .catch(error => {
          if (disposed) return;
          if (isSessionGone(error)) {
            clearSession();
            return;
          }
          retryTimer = setTimeout(recover, retryDelayMs(retryAttempt));
          retryAttempt += 1;
        });
    };

    socket.on('connect', () => {
      lastSentToken = getAccessToken();
      socket.emit('authenticate', { token: lastSentToken }, (result: { ok: boolean }) => {
        if (disposed || !result || !result.ok) {
          return;
        }
        setConnected(true);
        load();
      });
    });

    socket.on('unauthorized', () => {
      setConnected(false);
      if (disposed) return;
      const current = getAccessToken();
      if (current && current !== lastSentToken) {
        // The page renewed its token meanwhile (an API call did): just use it.
        reconnect();
        return;
      }
      if (Date.now() - lastRefreshAt < FRESH_TOKEN_MS) {
        // Refused straight after a refresh: the account is blocked or deleted.
        // The next API call signs the user out; retrying here would loop.
        return;
      }
      recover();
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('notification', (notification: AppNotification) => {
      // A reconnect's reload can already contain it: then it is not new.
      if (knownIds.current.has(notification.id)) {
        return;
      }
      knownIds.current.add(notification.id);
      setNotifications(previous => mergeIncoming(previous, notification, LIST_LIMIT).list);
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
      if (retryTimer) clearTimeout(retryTimer);
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

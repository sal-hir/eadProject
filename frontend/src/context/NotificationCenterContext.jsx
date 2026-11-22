import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const NotificationCenterContext = createContext(null);

const STORAGE_KEY_PREFIX = 'swiftdrop_notifications_';

export const NotificationCenterProvider = ({ children }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [notifications, setNotifications] = useState([]);

  // Load user-specific notifications from localStorage on login
  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }
    const storageKey = `${STORAGE_KEY_PREFIX}${user.id}`;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setNotifications(JSON.parse(stored));
      } else {
        // Initial sample welcome notification for new users
        const initial = [
          {
            id: 'notif-welcome',
            title: 'Welcome to SwiftDrop!',
            message: 'Your account is active. Track parcels and receive real-time delivery alerts here.',
            tone: 'info',
            timestamp: new Date().toISOString(),
            read: false,
            link: user.role === 'COURIER' ? '/courier' : '/customer',
          },
        ];
        setNotifications(initial);
        localStorage.setItem(storageKey, JSON.stringify(initial));
      }
    } catch (e) {
      console.error('Failed to parse notifications from storage', e);
    }
  }, [user?.id, user?.role]);

  // Persist notifications on state changes
  const saveNotifications = useCallback((updater) => {
    setNotifications((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (user?.id) {
        try {
          localStorage.setItem(`${STORAGE_KEY_PREFIX}${user.id}`, JSON.stringify(next));
        } catch (e) {
          console.error('Failed to save notifications', e);
        }
      }
      return next;
    });
  }, [user?.id]);

  // Push new notification & show toast popup automatically
  const notify = useCallback(({ title, message, tone = 'info', trackingNumber, link, showToast = true }) => {
    const item = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title,
      message,
      tone,
      trackingNumber,
      link: link || (trackingNumber ? `/track/${trackingNumber}` : null),
      timestamp: new Date().toISOString(),
      read: false,
    };

    saveNotifications((prev) => [item, ...prev].slice(0, 50));

    if (showToast) {
      addToast({ title, message, tone, duration: 6000 });
    }
    return item;
  }, [saveNotifications, addToast]);

  // Connect to Notification Service SSE Stream for real-time live events from RabbitMQ
  useEffect(() => {
    // Determine the SSE URL
    const isLocalhost = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    const urls = [
      import.meta.env.VITE_NOTIFICATION_URL,
      isLocalhost ? 'http://localhost:4005/api/v1/notifications/stream' : null,
      '/notifications-api/api/v1/notifications/stream',
    ].filter(Boolean);

    let urlIndex = 0;
    let eventSource = null;
    let isClosed = false;

    const connect = () => {
      if (isClosed || urlIndex >= urls.length) return;
      const sseUrl = urls[urlIndex];

      try {
        console.log(`🔔 [NotificationCenter] Connecting to SSE at ${sseUrl}...`);
        eventSource = new EventSource(sseUrl);

        eventSource.onopen = () => {
          console.log(`✅ [NotificationCenter] SSE connected successfully to ${sseUrl}`);
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📨 [NotificationCenter] SSE message received:', data);

            if (data.type === 'PARCEL_NOTIFICATION' || data.type === 'PARCEL_STATUS_UPDATE') {
              const currentEmail = user?.email?.toLowerCase().trim();
              const targetEmail = data.recipientEmail?.toLowerCase().trim();

              const isTargetUser = !targetEmail ||
                !currentEmail ||
                targetEmail === currentEmail ||
                user?.role === 'ADMIN' ||
                user?.role === 'CUSTOMER';

              if (isTargetUser) {
                const statusToneMap = {
                  CREATED: 'success',
                  DELIVERED: 'success',
                  OUT_FOR_DELIVERY: 'warning',
                  FAILED: 'error',
                  CANCELLED: 'error',
                  PICKED_UP: 'info',
                  IN_TRANSIT: 'info',
                  PENDING_PICKUP: 'info',
                };

                let title = `Parcel ${data.trackingNumber || 'Update'}: ${data.newStatus || 'UPDATED'}`;
                let message = data.note || `Status transitioned to ${data.newStatus || 'UPDATED'}`;

                if (data.event === 'parcel.created') {
                  title = `Parcel Booked: ${data.trackingNumber}`;
                  message = 'Your delivery request was created and confirmed.';
                } else if (data.event === 'parcel.assigned') {
                  title = `Courier Assigned: ${data.trackingNumber}`;
                  message = data.courierName
                    ? `Courier ${data.courierName} is assigned to collect your parcel.`
                    : 'A courier has been assigned to collect your package.';
                } else if (data.newStatus === 'FAILED') {
                  message = data.failureReason
                    ? `Delivery attempt failed: ${data.failureReason}`
                    : (data.note || 'Delivery attempt unsuccessful.');
                }

                notify({
                  title,
                  message,
                  tone: statusToneMap[data.newStatus] || 'info',
                  trackingNumber: data.trackingNumber,
                  showToast: true,
                });
              }
            }
          } catch (e) {
            console.error('Error parsing SSE event', e);
          }
        };

        eventSource.onerror = (err) => {
          console.warn(`⚠️ [NotificationCenter] SSE connection error on ${sseUrl}:`, err);
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Try next fallback endpoint if available
          if (!isClosed && urlIndex + 1 < urls.length) {
            urlIndex++;
            console.log(`🔄 [NotificationCenter] Retrying with fallback SSE URL: ${urls[urlIndex]}`);
            setTimeout(connect, 1000);
          }
        };
      } catch (e) {
        console.warn('Could not establish Notification SSE connection', e);
      }
    };

    connect();

    return () => {
      isClosed = true;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [user, notify]);

  const markAsRead = useCallback((id) => {
    saveNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, [saveNotifications]);

  const markAllAsRead = useCallback(() => {
    saveNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [saveNotifications]);

  const clearAll = useCallback(() => {
    saveNotifications([]);
  }, [saveNotifications]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    notify,
    markAsRead,
    markAllAsRead,
    clearAll,
  }), [notifications, unreadCount, notify, markAsRead, markAllAsRead, clearAll]);

  return (
    <NotificationCenterContext.Provider value={value}>
      {children}
    </NotificationCenterContext.Provider>
  );
};

export const useNotificationCenter = () => {
  const ctx = useContext(NotificationCenterContext);
  if (!ctx) {
    throw new Error('useNotificationCenter must be used within a NotificationCenterProvider');
  }
  return ctx;
};

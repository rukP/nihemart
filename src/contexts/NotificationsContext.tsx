'use client';
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from 'react';
import { getSocket, reconnectSocket } from '@/lib/socket';
import { useAuth } from '@/hooks/useAuth';
import { useMyRiderProfile } from '@/hooks/useRiders';
import { toast } from 'sonner';
import type { Socket } from 'socket.io-client';

type Notification = {
  id: string;
  title: string;
  body?: string;
  created_at: string;
  read?: boolean;
  meta?: any;
  type?: string;
};

type NotificationsContextValue = {
  notifications: Notification[];
  addNotification: (n: Notification) => void;
  markAsRead: (id: string) => void;
  clear: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null
);

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within provider');
  return ctx;
};

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, hasRole } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const socketRef = useRef<Socket | null>(null);
  // compute boolean admin status so the effect can depend on it and re-run
  const isAdmin = Boolean(hasRole && hasRole('admin'));

  // Get rider profile if user is a rider
  const { data: rider } = useMyRiderProfile();
  const riderId = rider?.id || null;

  useEffect(() => {
    if (!user) return;

    const _addNotificationLocal = (n: Notification) => {
      setNotifications(prev => [n, ...prev]);
      // Show concise toasts only for important customer-facing events.
      try {
        // Parse meta if present
        const _meta =
          typeof n.meta === 'string' ? JSON.parse(n.meta) : n.meta || {};

        // Only show assignment_accepted toasts for the order owner (customer)
        if (n.type === 'assignment_accepted') {
          // Use the notification title directly since it's now properly formatted
          toast.success(n.title || 'Rider assigned to your order', {
            duration: 5000,
          });
          return;
        }

        // For other types, show appropriate toast messages using notification titles
        if (n.type === 'order_status_update') {
          toast.info(n.title || 'Order Status Updated', {
            duration: 4000,
          });
        } else if (n.type === 'order_delivered') {
          toast.success(n.title || 'Order Delivered Successfully', {
            duration: 5000,
          });
        } else if (n.type === 'refund_approved') {
          toast.success(n.title || 'Refund Approved', {
            duration: 5000,
          });
        } else if (n.type === 'promotion') {
          toast(n.title || 'Special Offer Available', {
            duration: 6000,
          });
        } else if (n.type === 'system') {
          toast.info(n.title || 'System Notification', {
            duration: 4000,
          });
        } else if (n.type === 'assignment_created') {
          // For rider notifications, show more specific toast
          toast.info(n.title || 'New Delivery Assignment', {
            duration: 4000,
          });
        } else if (n.type === 'assignment_rejected') {
          // Admin notification for rejected assignments
          toast.info(n.title || 'Assignment Rejected', {
            duration: 3000,
          });
        }
      } catch (_e) {
        // fallback: show generic toast
        toast.message(n.title || 'You have a new notification.');
      }
    };

    const fetchPersisted = async () => {
      try {
        // Use backend API to fetch notifications
        const { authorizedAPI } = await import('@/lib/api');
        const handleApiRequest = (await import('@/lib/handleApiRequest'))
          .default;

        let combined: Notification[] = [];

        // Fetch user-specific notifications for all users (including regular customers)
        // This should be called for all authenticated users, not just admins/riders
        if (user?.id) {
          try {
            const userNotifications = await handleApiRequest(() =>
              authorizedAPI.get(
                `/notifications?userId=${encodeURIComponent(user.id)}&limit=200`
              )
            );
            const notifications = Array.isArray(userNotifications)
              ? userNotifications
              : userNotifications?.notifications || [];
            // console.debug(
            //   '[NotificationsContext] Fetched user-specific notifications:',
            //   notifications.length
            // );
            // Normalize field names: createdAt -> created_at
            const normalized = notifications.map((n: any) => ({
              ...n,
              created_at: n.created_at || n.createdAt,
            }));
            combined = [...normalized, ...combined];
          } catch (_e) {
            // console.error('Failed to fetch user-specific notifications:', _e);
          }
        }

        // Fetch role-based notifications: admin
        if (hasRole && hasRole('admin')) {
          try {
            const adminNotifications = await handleApiRequest(() =>
              authorizedAPI.get('/notifications?role=admin&limit=100')
            );
            const notifications = Array.isArray(adminNotifications)
              ? adminNotifications
              : adminNotifications?.notifications || [];
            // console.debug(
            //   '[NotificationsContext] Fetched admin notifications:',
            //   notifications.length
            // );
            // Normalize field names: createdAt -> created_at
            const normalized = notifications.map((n: any) => ({
              ...n,
              created_at: n.created_at || n.createdAt,
            }));
            combined = [...normalized, ...combined];
          } catch (_e) {
            // console.error('Failed to fetch admin notifications:', _e);
          }
        }

        // Fetch rider notifications - include both userId and role to get both user-specific and role-based notifications
        if (hasRole && hasRole('rider') && user?.id) {
          try {
            const riderNotifications = await handleApiRequest(() =>
              authorizedAPI.get(`/notifications?role=rider&limit=200`)
            );
            const notifications = Array.isArray(riderNotifications)
              ? riderNotifications
              : riderNotifications?.notifications || [];
            // console.debug(
            //   '[NotificationsContext] Fetched rider notifications:',
            //   notifications.length
            // );
            // Normalize field names: createdAt -> created_at
            const normalized = notifications.map((n: any) => ({
              ...n,
              created_at: n.created_at || n.createdAt,
            }));
            combined = [...normalized, ...combined];
          } catch (_e) {
            // console.error('Failed to fetch rider notifications:', _e);
          }
        }

        // Normalize all notifications: createdAt -> created_at, and ensure required fields
        const normalizedCombined = (combined || [])
          .map((n: any) => {
            if (!n || !n.id) return null;
            return {
              ...n,
              created_at: n.created_at || n.createdAt,
              title: n.title || '',
              body: n.body || null,
              read: n.read || false,
            };
          })
          .filter(
            (n: any) =>
              n !== null && n.id && (n.title || n.body) && n.created_at
          );

        // dedupe by id across both fetched results and existing state
        const seen = new Set<string>();
        const dedupedFetched: Notification[] = normalizedCombined.filter(
          (x: any) => {
            if (!x || !x.id) return false;
            if (seen.has(x.id)) return false;
            seen.add(x.id);
            return true;
          }
        );

        // console.debug(
        //   '[NotificationsContext] Total notifications fetched and normalized:',
        //   dedupedFetched.length
        // );

        // merge with existing notifications (prev) while ensuring unique ids
        setNotifications(prev => {
          const merged: Notification[] = [];
          const seenIds = new Set<string>();

          // start with fetched (newest first)
          for (const n of dedupedFetched) {
            if (!n || !n.id) continue;
            if (seenIds.has(n.id)) continue;
            merged.push(n);
            seenIds.add(n.id);
          }

          // then append previous items that weren't in fetched
          for (const p of prev) {
            if (!p || !p.id) continue;
            if (seenIds.has(p.id)) continue;
            merged.push(p);
            seenIds.add(p.id);
          }

          // console.debug(
          //   '[NotificationsContext] Final merged notifications:',
          //   merged.length
          // );
          return merged.slice(0, 200);
        });
      } catch (_err) {
        // console.error('fetchPersisted notifications err', _err);
      }
    };

    // Socket.IO automatically handles reconnection, so we don't need aggressive polling.
    // We'll only poll as a fallback if the socket is disconnected for an extended period.

    let fallbackPollInterval: any = null;

    const startFallbackPoll = () => {
      // Only poll if socket is disconnected for more than 30 seconds
      // This is a last resort fallback - Socket.IO should handle reconnection automatically
      fallbackPollInterval = setInterval(() => {
        try {
          const socket = socketRef.current;
          if (!socket || !socket.connected) {
            // Socket is disconnected - check if it's been disconnected for a while
            // If so, fetch persisted notifications as fallback

            // console.debug(
            //   'Socket disconnected - fetching notifications as fallback'
            // );
            fetchPersisted();
          }
        } catch (_e) {}
      }, 30000); // Check every 30 seconds (much less frequent)
    };

    const stopFallbackPoll = () => {
      try {
        if (fallbackPollInterval) clearInterval(fallbackPollInterval);
        fallbackPollInterval = null;
      } catch (_e) {}
    };

    const setupRealtime = () => {
      // Disconnect existing socket if any
      if (socketRef.current) {
        try {
          socketRef.current.disconnect();
        } catch (_e) {}
        socketRef.current = null;
      }

      // Initialize Socket.IO connection
      const socket = getSocket();
      if (!socket) {
        // console.warn('Failed to initialize Socket.IO connection');
        return;
      }

      socketRef.current = socket;

      // Listen for new notifications
      socket.on('notification:new', (notification: any) => {
        try {
          // console.debug(
          //   'Socket.IO received notification:new',
          //   notification?.id
          // );
          handleRealtimeRow(notification);

          // Broadcast notification event via localStorage for other components
          try {
            localStorage.setItem(
              'notification_event',
              JSON.stringify({
                type: 'new',
                notification,
                meta: notification?.meta,
                timestamp: Date.now(),
              })
            );
            // Clear immediately to allow same-key triggers
            setTimeout(
              () => localStorage.removeItem('notification_event'),
              100
            );
          } catch (_e) {
            // Ignore localStorage errors
          }
        } catch (_e) {
          // console.error('Error handling notification:new', _e);
        }
      });

      // Listen for notification updates
      socket.on('notification:updated', (notification: any) => {
        try {
          // console.debug(
          //   'Socket.IO received notification:updated',
          //   notification?.id
          // );
          handleRealtimeRow(notification);

          // Broadcast notification event via localStorage for other components
          try {
            localStorage.setItem(
              'notification_event',
              JSON.stringify({
                type: 'updated',
                notification,
                meta: notification?.meta,
                timestamp: Date.now(),
              })
            );
            // Clear immediately to allow same-key triggers
            setTimeout(
              () => localStorage.removeItem('notification_event'),
              100
            );
          } catch (_e) {
            // Ignore localStorage errors
          }
        } catch (_e) {
          // console.error('Error handling notification:updated', _e);
        }
      });

      // Listen for general notification created event (fallback)
      socket.on('notification:created', (notification: any) => {
        try {
          // console.debug(
          //   'Socket.IO received notification:created',
          //   notification?.id
          // );
          handleRealtimeRow(notification);

          // Broadcast notification event via localStorage for other components
          try {
            localStorage.setItem(
              'notification_event',
              JSON.stringify({
                type: 'created',
                notification,
                meta: notification?.meta,
                timestamp: Date.now(),
              })
            );
            // Clear immediately to allow same-key triggers
            setTimeout(
              () => localStorage.removeItem('notification_event'),
              100
            );
          } catch (_e) {
            // Ignore localStorage errors
          }
        } catch (_e) {
          // console.error('Error handling notification:created', _e);
        }
      });

      // Handle connection events
      socket.on('connect', () => {
        // console.debug('Socket.IO connected for notifications');
        // Subscribe to notifications
        socket.emit('subscribe:notifications');
        // Stop fallback polling when connected
        stopFallbackPoll();
      });

      socket.on('disconnect', _reason => {
        // console.debug('Socket.IO disconnected:', reason);
        // Start fallback polling only if disconnected
        // Socket.IO will try to reconnect automatically
        startFallbackPoll();
      });

      // Start fallback poll only if socket is not connected initially
      if (!socket.connected) {
        startFallbackPoll();
      }

      // console.debug('Socket.IO notifications setup complete', {
      //   userId: user.id,
      //   isAdmin,
      //   riderId,
      // });
    };

    // Reconnect/resubscribe handling: re-setup realtime when browser comes back online
    const handleOnline = () => {
      try {
        reconnectSocket();
        setupRealtime();
      } catch (_e) {
        // console.error('Failed to re-connect Socket.IO on online:', _e);
      }
    };

    window.addEventListener('online', handleOnline);

    const handleRealtimeRow = (row: any) => {
      try {
        // Helpful debug during development: log realtime rows for troubleshooting
        // console.debug(
        //   'notifications realtime row:',
        //   row?.id,
        //   row?.recipient_user_id || row?.recipientUserId,
        //   row?.recipient_role || row?.recipientRole,
        //   row?.type
        // );
      } catch (_e) {}
      try {
        // Event handled via Socket.IO realtime
        // small defensive guard
      } catch (_e) {}
      // Normalize field names: support both camelCase (backend) and snake_case (legacy)
      const recipientUser = row.recipient_user_id || row.recipientUserId;
      const recipientRole = row.recipient_role || row.recipientRole;

      const isForUser =
        recipientUser && String(recipientUser) === String(user.id);
      const isForAdmin = recipientRole === 'admin' && isAdmin;
      const isForRider =
        recipientRole === 'rider' && hasRole && hasRole('rider');

      // Debug logging for admin notifications
      if (recipientRole === 'admin') {
        // console.debug('[NotificationsContext] Admin notification received:', {
        //   notificationId: row?.id,
        //   recipientRole,
        //   isAdmin,
        //   isForAdmin,
        //   userRoles: user?.roles || [],
        // });
      }

      // Debug logging for rider notifications
      if (recipientRole === 'rider') {
        // console.debug('[NotificationsContext] Rider notification received:', {
        //   notificationId: row?.id,
        //   recipientRole,
        //   recipientUser,
        //   isForRider,
        //   isForUser,
        //   riderId,
        //   userRoles: user?.roles || [],
        // });
      }

      // If recipient_user_id is null but the meta contains this user id (legacy flows), treat as intended for this user
      let metaUserMatch = false;
      try {
        const meta =
          typeof row.meta === 'string' ? JSON.parse(row.meta) : row.meta || {};
        const possibleIds = [
          meta.user_id,
          meta.recipient_user_id,
          meta.order?.user_id,
          meta.order_id,
        ];
        for (const idCandidate of possibleIds) {
          if (!idCandidate) continue;
          if (String(idCandidate) === String(user.id)) {
            metaUserMatch = true;
            break;
          }
        }
      } catch (_e) {
        // ignore parse error
      }

      let isForRiderFallback = false;
      if (recipientRole === 'rider') {
        try {
          const meta =
            typeof row.meta === 'string'
              ? JSON.parse(row.meta)
              : row.meta || {};
          if (
            meta &&
            meta.rider_id &&
            riderId &&
            String(meta.rider_id) === String(riderId)
          )
            isForRiderFallback = true;
        } catch (_e) {
          // ignore parse error
        }
      }

      if (
        !(
          isForUser ||
          isForAdmin ||
          isForRider ||
          isForRiderFallback ||
          metaUserMatch
        )
      ) {
        // console.debug(
        //   '[NotificationsContext] Notification filtered out (not for this user):',
        //   {
        //     notificationId: row?.id,
        //     type: row?.type,
        //     recipientUser,
        //     recipientRole,
        //     isForUser,
        //     isForAdmin,
        //     isForRider,
        //     isForRiderFallback,
        //     metaUserMatch,
        //     currentUserId: user.id,
        //     isAdmin,
        //     hasRiderRole: hasRole && hasRole('rider'),
        //   }
        // );
        return;
      }

      // console.debug('[NotificationsContext] Processing notification:', {
      //   notificationId: row?.id,
      //   type: row?.type,
      //   recipientUser,
      //   recipientRole,
      //   isForUser,
      //   isForAdmin,
      // });

      const normalized: Notification = {
        id: row.id,
        title: row.title,
        body: row.body,
        meta: row.meta,
        created_at: row.created_at || row.createdAt, // Normalize: support both createdAt and created_at
        read: row.read,
        type:
          (row.type as string) ||
          (() => {
            try {
              const meta =
                typeof row.meta === 'string'
                  ? JSON.parse(row.meta)
                  : row.meta || {};
              return meta?.type || meta?.event || undefined;
            } catch (_e) {
              return undefined;
            }
          })(),
      };

      setNotifications(prev => {
        // replace existing if present, otherwise add to front
        const idx = prev.findIndex(p => p.id === normalized.id);
        if (idx >= 0) {
          const copy = prev.slice();
          copy[idx] = normalized;
          return copy;
        }

        // Heuristic dedupe: if we already have a notification of the same
        // type for the same order/assignment recently, skip adding to
        // avoid duplicate notifications created by triggers + app logic.
        try {
          const newMeta =
            typeof normalized.meta === 'string'
              ? JSON.parse(normalized.meta || 'null')
              : normalized.meta || {};

          const keyCandidates = [
            newMeta?.assignment?.id,
            newMeta?.assignment_id,
            newMeta?.order?.id,
            newMeta?.order_id,
          ].filter(Boolean);

          if (keyCandidates.length > 0) {
            const exists = prev.some(p => {
              if (p.type !== normalized.type) return false;
              try {
                const pm =
                  typeof p.meta === 'string'
                    ? JSON.parse(p.meta || 'null')
                    : p.meta || {};
                const pKeys = [
                  pm?.assignment?.id,
                  pm?.assignment_id,
                  pm?.order?.id,
                  pm?.order_id,
                ].filter(Boolean);
                // If any key overlaps, consider it a duplicate
                return pKeys.some(k => keyCandidates.includes(k));
              } catch (_e) {
                return false;
              }
            });
            if (exists) return prev;
          }
        } catch (_e) {
          // ignore parse errors and continue
        }

        return [normalized, ...prev].slice(0, 200);
      });

      // show small toast for real-time arrival using notification titles
      if (normalized.type === 'assignment_accepted') {
        toast.success(normalized.title || 'Rider assigned to your order', {
          duration: 5000,
        });
      } else if (normalized.type === 'order_delivered') {
        toast.success(normalized.title || 'Order Delivered Successfully', {
          duration: 5000,
        });
      } else if (normalized.type === 'order_status_update') {
        toast.info(normalized.title || 'Order Status Updated', {
          duration: 4000,
        });
      } else if (normalized.type === 'assignment_created') {
        toast.info(normalized.title || 'New Delivery Assignment', {
          duration: 4000,
        });
      } else if (normalized.type === 'refund_approved') {
        toast.success(normalized.title || 'Refund Approved', {
          duration: 5000,
        });
      } else {
        // Default message for other types
        toast.message(normalized.title || 'New notification', {
          duration: 3000,
        });
      }
    };

    // Initial load + realtime subscriptions. We avoid kicking off aggressive polling.
    fetchPersisted();
    setupRealtime();

    return () => {
      try {
        stopFallbackPoll();
      } catch (_e) {}

      try {
        if (socketRef.current) {
          // Remove event listeners
          socketRef.current.off('notification:new');
          socketRef.current.off('notification:updated');
          socketRef.current.off('notification:created');
          socketRef.current.off('connect');
          socketRef.current.off('disconnect');

          // Note: We don't disconnect the socket here as it might be used by other parts
          // The socket will be cleaned up when the user logs out
          socketRef.current = null;
        }
      } catch (_err) {
        // console.error('Error cleaning up Socket.IO:', _err);
      }

      try {
        window.removeEventListener('online', handleOnline);
      } catch {}
    };
  }, [user?.id, isAdmin, riderId]);

  const addNotification = (n: Notification) =>
    setNotifications(prev => {
      if (!n || !n.id) return prev;
      // if already present, replace it
      const idx = prev.findIndex(p => p.id === n.id);
      if (idx >= 0) {
        const copy = prev.slice();
        copy[idx] = n;
        return copy;
      }
      return [n, ...prev].slice(0, 100);
    });

  const markAsRead = async (id: string) => {
    try {
      // Use backend API to mark as read
      const { authorizedAPI } = await import('@/lib/api');
      const handleApiRequest = (await import('@/lib/handleApiRequest')).default;

      await handleApiRequest(() =>
        authorizedAPI.patch(`/notifications/${id}/read`)
      );

      setNotifications(prev =>
        prev.map(p => (p.id === id ? { ...p, read: true } : p))
      );
    } catch (_err) {
      // console.error('markAsRead err', _err);
      // still mark locally for UX
      setNotifications(prev =>
        prev.map(p => (p.id === id ? { ...p, read: true } : p))
      );
    }
  };

  const clear = async () => {
    try {
      // Delete all notifications from backend
      const { authorizedAPI } = await import('@/lib/api');
      const handleApiRequest = (await import('@/lib/handleApiRequest')).default;

      await handleApiRequest(() =>
        authorizedAPI.delete('/notifications/clear')
      );
    } catch (_e) {
      // console.warn('notifications clear failed:', _e);
    }
    // Always clear local state for immediate UX
    setNotifications([]);
  };

  return (
    <NotificationsContext.Provider
      value={{ notifications, addNotification, markAsRead, clear }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export default NotificationsContext;

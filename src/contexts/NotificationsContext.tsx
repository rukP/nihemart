"use client";
import React, {
   createContext,
   useContext,
   useEffect,
   useState,
   useRef,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fetchRiderByUserId } from "@/integrations/supabase/riders";
import { toast } from "sonner";
import { formatRiderInfo } from "@/utils/notification-formatters";

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
   if (!ctx) throw new Error("useNotifications must be used within provider");
   return ctx;
};

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({
   children,
}) => {
   const { user, hasRole } = useAuth();
   const [notifications, setNotifications] = useState<Notification[]>([]);
   const [riderId, setRiderId] = useState<string | null>(null);
   const channelRef = useRef<any | null>(null);
   // compute boolean admin status so the effect can depend on it and re-run
   const isAdmin = Boolean(hasRole && hasRole("admin"));

   useEffect(() => {
      if (!user) return;

      const addNotificationLocal = (n: Notification) => {
         setNotifications((prev) => [n, ...prev]);
         // Show concise toasts only for important customer-facing events.
         try {
            // Parse meta if present
            const meta =
               typeof n.meta === "string" ? JSON.parse(n.meta) : n.meta || {};

            // Only show assignment_accepted toasts for the order owner (customer)
            if (n.type === "assignment_accepted") {
               // Use the notification title directly since it's now properly formatted
               toast.success(n.title || "Rider assigned to your order", {
                  duration: 5000,
               });
               return;
            }

            // For other types, show appropriate toast messages using notification titles
            if (n.type === "order_status_update") {
               toast.info(n.title || "Order Status Updated", {
                  duration: 4000,
               });
            } else if (n.type === "order_delivered") {
               toast.success(n.title || "Order Delivered Successfully", {
                  duration: 5000,
               });
            } else if (n.type === "refund_approved") {
               toast.success(n.title || "Refund Approved", {
                  duration: 5000,
               });
            } else if (n.type === "promotion") {
               toast(n.title || "Special Offer Available", {
                  duration: 6000,
               });
            } else if (n.type === "system") {
               toast.info(n.title || "System Notification", {
                  duration: 4000,
               });
            } else if (n.type === "assignment_created") {
               // For rider notifications, show more specific toast
               toast.info(n.title || "New Delivery Assignment", {
                  duration: 4000,
               });
            } else if (n.type === "assignment_rejected") {
               // Admin notification for rejected assignments
               toast.info(n.title || "Assignment Rejected", {
                  duration: 3000,
               });
            }
         } catch (e) {
            // fallback: show generic toast
            toast.message(n.title || "You have a new notification.");
         }
      };

      const fetchPersisted = async () => {
         try {
            // fetch notifications for this user (explicit recipient_user_id)
            const resUser = await fetch(
               `/api/notifications?userId=${encodeURIComponent(
                  user.id
               )}&limit=100`
            );
            const userJson = resUser.ok
               ? await resUser.json()
               : { notifications: [] };
            let combined: Notification[] = userJson.notifications || [];

            // Also fetch any notifications where meta includes this user id (fallback)
            try {
               const resMeta = await fetch(`/api/notifications?limit=200`);
               if (resMeta.ok) {
                  const metaJson = await resMeta.json();
                  const metaFiltered = (metaJson.notifications || []).filter(
                     (n: any) => {
                        try {
                           const meta =
                              typeof n.meta === "string"
                                 ? JSON.parse(n.meta)
                                 : n.meta || {};
                           return (
                              meta &&
                              (String(meta.user_id) === String(user.id) ||
                                 String(meta.recipient_user_id) ===
                                    String(user.id))
                           );
                        } catch (e) {
                           return false;
                        }
                     }
                  );
                  combined = [...metaFiltered, ...combined];
               }
            } catch (e) {
               // ignore
            }

            // fetch role-based notifications: admin
            if (hasRole && hasRole("admin")) {
               const resAdmin = await fetch(
                  `/api/notifications?role=admin&limit=100`
               );
               if (resAdmin.ok) {
                  const adminJson = await resAdmin.json();
                  combined = [...(adminJson.notifications || []), ...combined];
               }
            }

            // fetch rider role notifications (fallback), filter by riderId if available
            // fetch rider mapping for this user to include rider-role fallback notifications
            let foundRiderId: string | null = null;
            try {
               const rider = await fetchRiderByUserId(user.id);
               if (rider && rider.id) {
                  foundRiderId = rider.id;
                  if (!riderId) setRiderId(rider.id);
               }
            } catch (err) {
               // ignore
            }

            if (foundRiderId) {
               const resRider = await fetch(
                  `/api/notifications?role=rider&limit=200`
               );
               if (resRider.ok) {
                  const riderJson = await resRider.json();
                  const riderFiltered = (riderJson.notifications || []).filter(
                     (n: any) => {
                        try {
                           const meta =
                              typeof n.meta === "string"
                                 ? JSON.parse(n.meta)
                                 : n.meta || {};
                           return (
                              meta &&
                              meta.rider_id &&
                              String(meta.rider_id) === String(foundRiderId)
                           );
                        } catch (e) {
                           return false;
                        }
                     }
                  );
                  combined = [...riderFiltered, ...combined];
               }
            }

            // dedupe by id across both fetched results and existing state
            const seen = new Set<string>();
            const dedupedFetched: Notification[] = (combined || []).filter(
               (x: any) => {
                  if (!x || !x.id) return false;
                  if (seen.has(x.id)) return false;
                  seen.add(x.id);
                  return true;
               }
            );

            // merge with existing notifications (prev) while ensuring unique ids
            setNotifications((prev) => {
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

               return merged.slice(0, 200);
            });
         } catch (err) {
            console.error("fetchPersisted notifications err", err);
         }
      };

      // NOTE: We avoid aggressive client-side polling. Instead we rely on
      // Supabase realtime subscriptions targeted by recipient filters.
      // However, network or websocket problems can cause subscriptions to
      // silently stop. We'll keep a lightweight heartbeat that falls back
      // to fetching persisted notifications if no realtime events arrive
      // within a short window.

      const lastEventAt = { current: Date.now() } as { current: number };
      let heartbeatInterval: any = null;

      const startHeartbeat = () => {
         // Check every 8s; if no event in the last 12s, fetch persisted
         // notifications as a fallback.
         heartbeatInterval = setInterval(() => {
            try {
               const now = Date.now();
               if (now - lastEventAt.current > 12000) {
                  // console.debug fallback
                  // eslint-disable-next-line no-console
                  console.debug(
                     "No realtime notifications seen recently — polling for updates"
                  );
                  fetchPersisted();
               }
            } catch (e) {}
         }, 8000);
      };

      const stopHeartbeat = () => {
         try {
            if (heartbeatInterval) clearInterval(heartbeatInterval);
         } catch (e) {}
      };

      const setupRealtime = () => {
         // Create a channel scoped to this user for easier cleanup.
         // Remove any existing channel before creating a fresh one.
         try {
            if (channelRef.current) {
               try {
                  supabase.removeChannel(channelRef.current);
               } catch (e) {
                  channelRef.current.unsubscribe?.();
               }
               channelRef.current = null;
            }
         } catch {}

         const ch = supabase.channel(`public:notifications:user:${user.id}`);

         // Subscribe to all INSERT/UPDATE events on notifications table (no server-side filter)
         // Client-side filtering in handleRealtimeRow ensures only relevant notifications are processed.
         ch.on(
            "postgres_changes",
            {
               event: "INSERT",
               schema: "public",
               table: "notifications",
            },
            (payload: any) => {
               try {
                  // eslint-disable-next-line no-console
                  console.debug(
                     "notifications channel received INSERT",
                     payload?.new?.id
                  );
                  // update last-event timestamp for heartbeat
                  lastEventAt.current = Date.now();
               } catch (e) {}
               handleRealtimeRow(payload.new);
            }
         );

         ch.on(
            "postgres_changes",
            {
               event: "UPDATE",
               schema: "public",
               table: "notifications",
            },
            (payload: any) => {
               try {
                  // eslint-disable-next-line no-console
                  console.debug(
                     "notifications channel received UPDATE",
                     payload?.new?.id
                  );
                  // update last-event timestamp for heartbeat
                  lastEventAt.current = Date.now();
               } catch (e) {}
               handleRealtimeRow(payload.new);
            }
         );

         // Finalize subscription and keep a reference for cleanup
         ch.subscribe();
         channelRef.current = ch;
         // start heartbeat to detect silent disconnects
         startHeartbeat();
         // debug
         try {
            // eslint-disable-next-line no-console
            console.debug("Subscribed to notifications channel:", {
               channel: `public:notifications:user:${user.id}`,
               isAdmin,
               riderId,
            });
         } catch (e) {}
      };

      // Reconnect/resubscribe handling: re-setup realtime when browser comes back online
      const handleOnline = () => {
         try {
            setupRealtime();
         } catch (e) {
            console.error(
               "Failed to re-subscribe to notifications channel on online:",
               e
            );
         }
      };

      window.addEventListener("online", handleOnline);
      // optional: cleanup on offline can be added if needed

      const handleRealtimeRow = (row: any) => {
         try {
            // Helpful debug during development: log realtime rows for troubleshooting
            // eslint-disable-next-line no-console
            console.debug(
               "notifications realtime row:",
               row?.id,
               row?.recipient_user_id,
               row?.recipient_role,
               row?.type
            );
         } catch (e) {}
         try {
            // mark event seen for heartbeat fallback
            // (if setupRealtime hasn't created lastEventAt reference yet this is fine)
            // eslint-disable-next-line no-console
            // small defensive guard
         } catch (e) {}
         const recipientUser = row.recipient_user_id;
         const recipientRole = row.recipient_role;

         const isForUser =
            recipientUser && String(recipientUser) === String(user.id);
         const isForAdmin = recipientRole === "admin" && isAdmin;

         // If recipient_user_id is null but the meta contains this user id (legacy flows), treat as intended for this user
         let metaUserMatch = false;
         try {
            const meta =
               typeof row.meta === "string"
                  ? JSON.parse(row.meta)
                  : row.meta || {};
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
         } catch (e) {
            // ignore parse error
         }

         let isForRiderFallback = false;
         if (recipientRole === "rider") {
            try {
               const meta =
                  typeof row.meta === "string"
                     ? JSON.parse(row.meta)
                     : row.meta || {};
               if (
                  meta &&
                  meta.rider_id &&
                  riderId &&
                  String(meta.rider_id) === String(riderId)
               )
                  isForRiderFallback = true;
            } catch (e) {
               // ignore parse error
            }
         }

         if (!(isForUser || isForAdmin || isForRiderFallback || metaUserMatch))
            return;

         const normalized: Notification = {
            id: row.id,
            title: row.title,
            body: row.body,
            meta: row.meta,
            created_at: row.created_at,
            read: row.read,
            type:
               (row.type as string) ||
               (() => {
                  try {
                     const meta =
                        typeof row.meta === "string"
                           ? JSON.parse(row.meta)
                           : row.meta || {};
                     return meta?.type || meta?.event || undefined;
                  } catch (e) {
                     return undefined;
                  }
               })(),
         };

         setNotifications((prev) => {
            // replace existing if present, otherwise add to front
            const idx = prev.findIndex((p) => p.id === normalized.id);
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
                  typeof normalized.meta === "string"
                     ? JSON.parse(normalized.meta || "null")
                     : normalized.meta || {};

               const keyCandidates = [
                  newMeta?.assignment?.id,
                  newMeta?.assignment_id,
                  newMeta?.order?.id,
                  newMeta?.order_id,
               ].filter(Boolean);

               if (keyCandidates.length > 0) {
                  const exists = prev.some((p) => {
                     if (p.type !== normalized.type) return false;
                     try {
                        const pm =
                           typeof p.meta === "string"
                              ? JSON.parse(p.meta || "null")
                              : p.meta || {};
                        const pKeys = [
                           pm?.assignment?.id,
                           pm?.assignment_id,
                           pm?.order?.id,
                           pm?.order_id,
                        ].filter(Boolean);
                        // If any key overlaps, consider it a duplicate
                        return pKeys.some((k) => keyCandidates.includes(k));
                     } catch (e) {
                        return false;
                     }
                  });
                  if (exists) return prev;
               }
            } catch (e) {
               // ignore parse errors and continue
            }

            return [normalized, ...prev].slice(0, 200);
         });

         // show small toast for real-time arrival using notification titles
         if (normalized.type === "assignment_accepted") {
            toast.success(normalized.title || "Rider assigned to your order", {
               duration: 5000,
            });
         } else if (normalized.type === "order_delivered") {
            toast.success(normalized.title || "Order Delivered Successfully", {
               duration: 5000,
            });
         } else if (normalized.type === "order_status_update") {
            toast.info(normalized.title || "Order Status Updated", {
               duration: 4000,
            });
         } else if (normalized.type === "assignment_created") {
            toast.info(normalized.title || "New Delivery Assignment", {
               duration: 4000,
            });
         } else if (normalized.type === "refund_approved") {
            toast.success(normalized.title || "Refund Approved", {
               duration: 5000,
            });
         } else {
            // Default message for other types
            toast.message(normalized.title || "New notification", {
               duration: 3000,
            });
         }
      };

      // Initial load + realtime subscriptions. We avoid kicking off aggressive polling.
      fetchPersisted();
      setupRealtime();

      return () => {
         try {
            if (channelRef.current) {
               try {
                  // eslint-disable-next-line no-console
                  console.debug(
                     "Removing notifications channel",
                     channelRef.current
                  );
                  supabase.removeChannel(channelRef.current);
               } catch (e) {
                  try {
                     // eslint-disable-next-line no-console
                     console.debug(
                        "Unsubscribing notifications channel",
                        channelRef.current
                     );
                     channelRef.current.unsubscribe?.();
                  } catch (e) {}
               }
               channelRef.current = null;
            }
         } catch (err) {
            try {
               channelRef.current?.unsubscribe?.();
            } catch {}
         }
         try {
            stopHeartbeat();
         } catch (e) {}
         try {
            window.removeEventListener("online", handleOnline);
         } catch {}
      };
   }, [user?.id, isAdmin, riderId]);

   const addNotification = (n: Notification) =>
      setNotifications((prev) => {
         if (!n || !n.id) return prev;
         // if already present, replace it
         const idx = prev.findIndex((p) => p.id === n.id);
         if (idx >= 0) {
            const copy = prev.slice();
            copy[idx] = n;
            return copy;
         }
         return [n, ...prev].slice(0, 100);
      });

   const markAsRead = async (id: string) => {
      try {
         // Call mark-read API
         const res = await fetch(`/api/notifications/mark-read`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: [id] }),
         });
         if (!res.ok) throw new Error("Failed to mark as read");
         setNotifications((prev) =>
            prev.map((p) => (p.id === id ? { ...p, read: true } : p))
         );
      } catch (err) {
         console.error("markAsRead err", err);
         // still mark locally for UX
         setNotifications((prev) =>
            prev.map((p) => (p.id === id ? { ...p, read: true } : p))
         );
      }
   };

   const clear = async () => {
      try {
         // Attempt to clear persisted notifications for this user via API
         if (user && user.id) {
            const res = await fetch(`/api/notifications/clear`, {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ userId: user.id }),
            });
            if (!res.ok) {
               console.warn(
                  "Failed to clear notifications server-side",
                  res.statusText
               );
            }
         }
      } catch (e) {
         console.warn("notifications clear API call failed:", e);
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

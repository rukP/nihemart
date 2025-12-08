import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
   fetchUserOrders,
   fetchAllOrders,
   fetchOrderById,
   createOrder,
   updateOrderStatus,
   requestRefundForItem,
   cancelRefundRequestForItem,
   requestRefundForOrder,
   cancelRefundRequestForOrder,
   respondToRefundRequest,
   respondToOrderRefundRequest,
   deleteOrder,
   getOrderStats,
   type Order,
   type OrderQueryOptions,
   type CreateOrderRequest,
   type OrderStatus,
} from "@/integrations/supabase/orders";

// Query Keys
export const orderKeys = {
   all: ["orders"] as const,
   lists: () => [...orderKeys.all, "list"] as const,
   list: (options: OrderQueryOptions) =>
      [...orderKeys.lists(), options] as const,
   details: () => [...orderKeys.all, "detail"] as const,
   detail: (id: string) => [...orderKeys.details(), id] as const,
   stats: () => [...orderKeys.all, "stats"] as const,
   userOrders: (userId: string) => [...orderKeys.all, "user", userId] as const,
};

// Hook for fetching user's orders
export function useUserOrders(options: OrderQueryOptions = {}) {
   const { user, isLoggedIn } = useAuth();

   console.log("useUserOrders hook:", { user, isLoggedIn, options });

   const key = orderKeys.userOrders(user?.id || "");

   const keyWithOptions = [...key, { ...(options || {}) }];

   return useQuery({
      queryKey: keyWithOptions,
      queryFn: () => fetchUserOrders(options, user?.id),
      enabled: isLoggedIn && !!user,
      staleTime: 1000 * 60 * 5, // 5 minutes
   });
}

// Hook for fetching all orders (admin only)
export function useAllOrders(options: OrderQueryOptions = {}) {
   const { user, hasRole } = useAuth();

   return useQuery({
      queryKey: orderKeys.list(options),
      queryFn: () => {
         console.log("Executing fetchAllOrders with options:", options);
         return fetchAllOrders(options);
      },
      enabled: !!user && hasRole("admin"),
      staleTime: 0, // Disable stale time to always refetch
   });
}

// Hook for fetching single order
export function useOrder(id: string) {
   const { user, isLoggedIn } = useAuth();

   return useQuery({
      queryKey: orderKeys.detail(id),
      queryFn: () => fetchOrderById(id),
      enabled: isLoggedIn && !!user && !!id,
   });
}

// Hook to fetch and cache the latest rider assignment for an order
export function useOrderAssignment(orderId?: string, enabled = true) {
   const { user, isLoggedIn } = useAuth();

   return useQuery({
      queryKey: ["orders", "assignment", orderId],
      queryFn: async () => {
         if (!orderId) return null as any;
         const res = await fetch(`/api/orders/${orderId}/assignment`);
         if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(
               body?.error || `Failed to fetch assignment for ${orderId}`
            );
         }
         const json = await res.json();
         return json?.rider || null;
      },
      enabled: Boolean(orderId) && enabled && isLoggedIn && !!user,
      staleTime: 1000 * 60 * 5, // 5 minutes
   });
}

// Hook for order statistics (admin only)
export function useOrderStats() {
   const { user, hasRole } = useAuth();

   return useQuery({
      queryKey: orderKeys.stats(),
      queryFn: getOrderStats,
      enabled: !!user && hasRole("admin"),
      staleTime: 1000 * 60 * 5, // 5 minutes
   });
}

// Hook for fetching refunded items (admin)
export function useRefundedItems({
   page = 1,
   limit = 20,
   refundStatus,
}: { page?: number; limit?: number; refundStatus?: string } = {}) {
   const { user, hasRole } = useAuth();

   return useQuery({
      queryKey: ["orders", "refunded", { page, limit, refundStatus }],
      queryFn: async () => {
         const q = new URLSearchParams();
         q.set("page", String(page));
         q.set("limit", String(limit));
         if (refundStatus) q.set("refundStatus", refundStatus);
         const res = await fetch(`/api/admin/refunds?${q.toString()}`);
         if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body?.error || "Failed to fetch refunded items");
         }
         return res.json();
      },
      enabled: !!user && hasRole("admin"),
      staleTime: 0,
   });
}

// Hook for creating orders
export function useCreateOrder() {
   const queryClient = useQueryClient();
   const { user } = useAuth();

   return useMutation<Order, Error, CreateOrderRequest>({
      mutationFn: async (orderData: CreateOrderRequest) => {
         console.log("Regular Order Mutation - Starting with data:", orderData);
         console.log(
            "Regular Order Mutation - calling integrations.createOrder..."
         );
         if (!orderData.order || !orderData.items) {
            console.error("Invalid order data:", orderData);
            throw new Error("Invalid order data structure");
         }
         try {
            // Check if orders are enabled (server-side setting).
            // This check is best-effort; transient failures should not block checkout.
            // Orders can proceed with checkbox confirmation during non-working hours
            // No delivery_time validation required

            // Create the order via a server-side API so the insertion uses the
            // service role (avoids RLS denial when invoked from the browser).
            const resp = await fetch("/api/orders/create", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify(orderData),
            });

            if (!resp.ok) {
               const body = await resp.json().catch(() => ({}));
               const msg =
                  body?.error || `Failed to create order: ${resp.status}`;
               throw new Error(msg);
            }

            const result = await resp.json();
            console.log(
               "Regular Order Mutation - integrations.createOrder returned:",
               result
            );
            if (!result) {
               throw new Error("No response received from server");
            }
            console.log("Regular Order Mutation - Success:", result);
            return result;
         } catch (error) {
            console.error("Regular Order Mutation - Error:", error);
            throw error instanceof Error
               ? error
               : new Error("Unknown error occurred");
         }
      },
      onMutate: (variables) => {
         console.log("Regular Order Mutation - onMutate:", variables);
      },
      onSuccess: (data) => {
         console.log("Regular Order Mutation - onSuccess:", data);
         queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
         if (data?.id) {
            queryClient.setQueryData(orderKeys.detail(data.id), data);
         }
         if (user) {
            queryClient.invalidateQueries({
               queryKey: orderKeys.userOrders(user.id),
            });
         }

         try {
            if (typeof window !== "undefined") {
               const ref = sessionStorage.getItem("kpay_reference");
               if (ref && data?.id) {
                  (async () => {
                     const maxAttempts = 3;
                     for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                        try {
                           const resp = await fetch("/api/payments/link", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                 orderId: data.id,
                                 reference: ref,
                              }),
                           });

                           if (resp.ok) {
                              try {
                                 sessionStorage.removeItem("kpay_reference");
                              } catch (e) {}
                              break;
                           }

                           // If the response is a 409 (already linked) treat as success
                           if (resp.status === 409) {
                              try {
                                 sessionStorage.removeItem("kpay_reference");
                              } catch (e) {}
                              break;
                           }

                           // Non-OK responses will retry unless last attempt
                           const body = await resp.json().catch(() => ({}));
                           console.warn("Auto-link attempt failed:", {
                              attempt,
                              body,
                           });
                        } catch (e) {
                           console.warn("Auto-link payment attempt failed:", e);
                        }

                        if (attempt < maxAttempts) {
                           // backoff
                           await new Promise((r) =>
                              setTimeout(r, 500 * attempt)
                           );
                        }
                     }
                  })();
               }
            }
         } catch (e) {}
      },
      onError: (error: Error) => {
         console.error("Regular Order Mutation - onError:", error);
         toast.error(error.message || "Failed to create order");
      },
      onSettled: (data, error, variables) => {
         console.log("Regular Order Mutation - onSettled:", {
            data,
            error,
            variables,
         });
      },
   });
}

// Hook for updating order status
export function useUpdateOrderStatus() {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: async ({
         id,
         status,
         additionalFields,
      }: {
         id: string;
         status: OrderStatus;
         additionalFields?: Partial<Order>;
      }) => {
         // Call server API which uses service role key to perform status change
         const res = await fetch("/api/orders/update-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status, additionalFields }),
         });
         if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(
               body?.error || `Failed to update status: ${res.status}`
            );
         }
         const updated = await res.json();
         return updated as Order;
      },
      onMutate: async ({ id, status, additionalFields }) => {
         await queryClient.cancelQueries({ queryKey: orderKeys.all });

         const previousQueries = queryClient.getQueriesData({});

         for (const [key, data] of previousQueries) {
            try {
               if (!data) continue;

               // If this is a single order detail
               const asOrder = data as any;
               if (asOrder && asOrder.id === id) {
                  const updated = {
                     ...asOrder,
                     ...(additionalFields || {}),
                     status,
                  };
                  queryClient.setQueryData(key, updated);
                  continue;
               }

               // If this is a paginated list with `.data` array
               if (asOrder && Array.isArray(asOrder.data)) {
                  const updatedList = { ...asOrder } as any;
                  updatedList.data = asOrder.data.map((o: any) =>
                     o && o.id === id
                        ? { ...o, ...(additionalFields || {}), status }
                        : o
                  );
                  queryClient.setQueryData(key, updatedList);
               }
            } catch (e) {}
         }

         return { previousQueries };
      },
      onSuccess: (updatedOrder) => {
         // Update the specific order in cache with server response
         try {
            queryClient.setQueryData(
               orderKeys.detail(updatedOrder.id),
               updatedOrder
            );
         } catch (e) {}
         // Invalidate order lists to refetch authoritative data
         queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
         // Invalidate stats
         queryClient.invalidateQueries({ queryKey: orderKeys.stats() });
      },
      onError: (error, variables, context: any) => {
         // rollback optimistic updates using the captured previousQueries
         if (context?.previousQueries) {
            for (const [key, data] of context.previousQueries) {
               try {
                  queryClient.setQueryData(key, data);
               } catch (e) {}
            }
         }
         console.error("Failed to update order status:", error);
      },
      onSettled: (data) => {
         // Ensure lists and details are refreshed
         try {
            queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
            queryClient.invalidateQueries({ queryKey: orderKeys.stats() });
            if (data?.id) {
               queryClient.invalidateQueries({
                  queryKey: orderKeys.detail(data.id),
               });
            }
         } catch (e) {}
      },
   });
}

// Hook for rejecting an order item
export function useRejectOrderItem() {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: ({
         orderItemId,
         reason,
         adminInitiated,
      }: {
         orderItemId: string;
         reason: string;
         adminInitiated?: boolean;
      }) => requestRefundForItem(orderItemId, reason, Boolean(adminInitiated)),
      onMutate: async ({
         orderItemId,
         reason,
      }: {
         orderItemId: string;
         reason: string;
      }) => {
         await queryClient.cancelQueries({ queryKey: orderKeys.details() });
         await queryClient.cancelQueries({ queryKey: orderKeys.lists() });

         const previousDetails = queryClient.getQueriesData({
            queryKey: orderKeys.details(),
         });
         const previousLists = queryClient.getQueriesData({
            queryKey: orderKeys.lists(),
         });

         // Optimistically mark item as refund_requested/requested
         for (const [key, data] of previousDetails) {
            try {
               const order = data as any;
               if (order && Array.isArray(order.items)) {
                  const idx = order.items.findIndex(
                     (it: any) => it.id === orderItemId
                  );
                  if (idx !== -1) {
                     const updated = { ...order };
                     updated.items = [...order.items];
                     updated.items[idx] = {
                        ...updated.items[idx],
                        refund_requested: true,
                        refund_reason: reason,
                        refund_status: "requested",
                        refund_requested_at: new Date().toISOString(),
                     };
                     queryClient.setQueryData(key, updated);
                  }
               }
            } catch (e) {}
         }

         for (const [key, data] of previousLists) {
            try {
               const list = data as any;
               if (list && Array.isArray(list.data)) {
                  const updatedList = { ...list };
                  updatedList.data = list.data.map((order: any) => {
                     if (!order.items) return order;
                     const itemIdx = order.items.findIndex(
                        (it: any) => it.id === orderItemId
                     );
                     if (itemIdx === -1) return order;
                     const updatedOrder = { ...order };
                     updatedOrder.items = [...order.items];
                     updatedOrder.items[itemIdx] = {
                        ...updatedOrder.items[itemIdx],
                        refund_requested: true,
                        refund_reason: reason,
                        refund_status: "requested",
                        refund_requested_at: new Date().toISOString(),
                     };
                     return updatedOrder;
                  });
                  queryClient.setQueryData(key, updatedList);
               }
            } catch (e) {}
         }

         return { previousDetails, previousLists };
      },
      onError: (err, variables, context: any) => {
         // rollback
         if (context?.previousDetails) {
            for (const [key, data] of context.previousDetails) {
               try {
                  queryClient.setQueryData(key, data);
               } catch (e) {}
            }
         }
         if (context?.previousLists) {
            for (const [key, data] of context.previousLists) {
               try {
                  queryClient.setQueryData(key, data);
               } catch (e) {}
            }
         }
         const message = err?.message || "Failed to request refund";
         toast.error(message);
      },
      onSettled: (data: any) => {
         queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
         if (data?.order_id) {
            queryClient.invalidateQueries({
               queryKey: orderKeys.detail(data.order_id),
            });
         } else {
            queryClient.invalidateQueries({ queryKey: orderKeys.details() });
         }
      },
      onSuccess: () => {
         toast.success("Refund requested");
      },
   });
}

// Hook for un-rejecting an order item (undo rejection)
export function useUnrejectOrderItem() {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: (orderItemId: string) =>
         cancelRefundRequestForItem(orderItemId),
      onMutate: async (orderItemId: string) => {
         await queryClient.cancelQueries({ queryKey: orderKeys.details() });
         await queryClient.cancelQueries({ queryKey: orderKeys.lists() });

         const previousDetails = queryClient.getQueriesData({
            queryKey: orderKeys.details(),
         });
         const previousLists = queryClient.getQueriesData({
            queryKey: orderKeys.lists(),
         });

         for (const [key, data] of previousDetails) {
            try {
               const order = data as any;
               if (order && Array.isArray(order.items)) {
                  const idx = order.items.findIndex(
                     (it: any) => it.id === orderItemId
                  );
                  if (idx !== -1) {
                     const updated = { ...order };
                     updated.items = [...order.items];
                     updated.items[idx] = {
                        ...updated.items[idx],
                        refund_requested: false,
                        refund_reason: null,
                        refund_status: "cancelled",
                        refund_requested_at: null,
                     };
                     queryClient.setQueryData(key, updated);
                  }
               }
            } catch (e) {}
         }

         for (const [key, data] of previousLists) {
            try {
               const list = data as any;
               if (list && Array.isArray(list.data)) {
                  const updatedList = { ...list };
                  updatedList.data = list.data.map((order: any) => {
                     if (!order.items) return order;
                     const itemIdx = order.items.findIndex(
                        (it: any) => it.id === orderItemId
                     );
                     if (itemIdx === -1) return order;
                     const updatedOrder = { ...order };
                     updatedOrder.items = [...order.items];
                     updatedOrder.items[itemIdx] = {
                        ...updatedOrder.items[itemIdx],
                        refund_requested: false,
                        refund_reason: null,
                        refund_status: "cancelled",
                        refund_requested_at: null,
                     };
                     return updatedOrder;
                  });
                  queryClient.setQueryData(key, updatedList);
               }
            } catch (e) {}
         }

         return { previousDetails, previousLists };
      },
      onError: (err, variables, context: any) => {
         if (context?.previousDetails) {
            for (const [key, data] of context.previousDetails) {
               try {
                  queryClient.setQueryData(key, data);
               } catch (e) {}
            }
         }
         if (context?.previousLists) {
            for (const [key, data] of context.previousLists) {
               try {
                  queryClient.setQueryData(key, data);
               } catch (e) {}
            }
         }
         toast.error("Failed to cancel refund request");
      },
      onSettled: (data: any) => {
         queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
         if (data?.order_id) {
            queryClient.invalidateQueries({
               queryKey: orderKeys.detail(data.order_id),
            });
         } else {
            queryClient.invalidateQueries({ queryKey: orderKeys.details() });
         }
      },
      onSuccess: () => {
         toast.success("Refund request cancelled");
      },
   });
}

// Hook for deleting orders (admin only)
export function useDeleteOrder() {
   const queryClient = useQueryClient();

   return useMutation({
      mutationFn: (id: string) => deleteOrder(id),
      onSuccess: (_, deletedId) => {
         // Remove from cache
         queryClient.removeQueries({ queryKey: orderKeys.detail(deletedId) });

         // Invalidate lists
         queryClient.invalidateQueries({ queryKey: orderKeys.lists() });

         // Invalidate stats
         queryClient.invalidateQueries({ queryKey: orderKeys.stats() });
      },
      onError: (error) => {
         console.error("Failed to delete order:", error);
      },
   });
}

// Main hook that provides all order-related functionality
export function useOrders() {
   const { user, isLoggedIn, hasRole } = useAuth();
   const queryClient = useQueryClient();

   const isAdmin = hasRole("admin");

   return {
      // Query hooks
      useUserOrders: (options?: OrderQueryOptions) =>
         useUserOrders(options || {}),
      useAllOrders: (options?: OrderQueryOptions) =>
         useAllOrders(options || {}),
      useOrder: (id: string) => useOrder(id),
      useOrderStats: () => useOrderStats(),
      useRequestRefundItem: () => useRejectOrderItem(),
      useCancelRefundRequestItem: () => useUnrejectOrderItem(),
      useRespondRefundRequest: () =>
         useMutation({
            mutationFn: ({
               itemId,
               approve,
               note,
            }: {
               itemId: string;
               approve: boolean;
               note?: string;
            }) => respondToRefundRequest(itemId, approve, note),
            onSuccess: (updatedItem) => {
               // Try to merge the updated item row into any cached orders so UI updates immediately
               try {
                  const item = updatedItem as any;
                  const updatedItemId = item?.id;
                  const parentOrderId = item?.order_id;

                  // Update any cached order detail queries
                  const details = queryClient.getQueriesData({
                     queryKey: orderKeys.details(),
                  });
                  for (const [key, data] of details) {
                     try {
                        const order = data as any;
                        if (!order || !Array.isArray(order.items)) continue;
                        const idx = order.items.findIndex(
                           (it: any) => it.id === updatedItemId
                        );
                        if (idx !== -1) {
                           const updated = { ...order };
                           updated.items = [...order.items];
                           updated.items[idx] = {
                              ...updated.items[idx],
                              ...item,
                           };
                           queryClient.setQueryData(key, updated);
                        }
                     } catch (e) {}
                  }

                  // Update paginated lists
                  const lists = queryClient.getQueriesData({
                     queryKey: orderKeys.lists(),
                  });
                  for (const [key, data] of lists) {
                     try {
                        const list = data as any;
                        if (!list || !Array.isArray(list.data)) continue;
                        const updatedList = { ...list };
                        updatedList.data = list.data.map((order: any) => {
                           if (!order.items) return order;
                           const itemIdx = order.items.findIndex(
                              (it: any) => it.id === updatedItemId
                           );
                           if (itemIdx === -1) return order;
                           const updatedOrder = { ...order };
                           updatedOrder.items = [...order.items];
                           updatedOrder.items[itemIdx] = {
                              ...updatedOrder.items[itemIdx],
                              ...item,
                           };
                           return updatedOrder;
                        });
                        queryClient.setQueryData(key, updatedList);
                     } catch (e) {}
                  }

                  // Also update the specific order detail key if present
                  if (parentOrderId) {
                     const existing = queryClient.getQueryData(
                        orderKeys.detail(parentOrderId)
                     );
                     if (existing) {
                        const order = existing as any;
                        if (Array.isArray(order.items)) {
                           const idx = order.items.findIndex(
                              (it: any) => it.id === updatedItemId
                           );
                           if (idx !== -1) {
                              const updated = { ...order };
                              updated.items = [...order.items];
                              updated.items[idx] = {
                                 ...updated.items[idx],
                                 ...item,
                              };
                              queryClient.setQueryData(
                                 orderKeys.detail(parentOrderId),
                                 updated
                              );
                           }
                        }
                     }
                  }
               } catch (e) {
                  // fallback to invalidation
                  queryClient.invalidateQueries({
                     queryKey: orderKeys.lists(),
                  });
               }

               queryClient.invalidateQueries({ queryKey: orderKeys.stats() });
               try {
                  if (
                     (updatedItem as any)?.refund_status === "rejected" &&
                     (updatedItem as any)?._mode === "reject"
                  ) {
                     toast.success("Reject response processed");
                  } else {
                     toast.success("Refund response processed");
                  }
               } catch (e) {
                  toast.success("Refund response processed");
               }
            },
            onError: (err) => {
               console.error("Failed to respond to refund:", err);
               toast.error(err?.message || "Failed to process refund response");
            },
         }),
      // Admin respond to full-order refunds
      useRespondOrderRefund: () =>
         useMutation({
            mutationFn: ({
               orderId,
               approve,
               note,
            }: {
               orderId: string;
               approve: boolean;
               note?: string;
            }) => respondToOrderRefundRequest(orderId, approve, note),
            onSuccess: (updatedOrder) => {
               try {
                  const order = updatedOrder as any;
                  const id = order?.id;

                  // Merge into order detail cache
                  const existing = queryClient.getQueryData(
                     orderKeys.detail(id)
                  );
                  if (existing) {
                     const merged = { ...(existing as any), ...order } as any;
                     if (
                        order?.refund_status === "approved" &&
                        Array.isArray(merged.items)
                     ) {
                        merged.items = merged.items.map((it: any) => ({
                           ...it,
                           refund_status:
                              it.refund_status === "requested"
                                 ? "approved"
                                 : it.refund_status,
                        }));
                        // When a full-order refund is approved, ensure order status reflects refunded
                        merged.status =
                           merged.status === "delivered"
                              ? "refunded"
                              : merged.status;
                     }
                     queryClient.setQueryData(orderKeys.detail(id), merged);
                  }

                  // Merge into list pages
                  const lists = queryClient.getQueriesData({
                     queryKey: orderKeys.lists(),
                  });
                  for (const [key, data] of lists) {
                     try {
                        const list = data as any;
                        if (!list || !Array.isArray(list.data)) continue;
                        const updatedList = { ...list };
                        updatedList.data = list.data.map((o: any) => {
                           if (o.id !== id) return o;
                           const merged = { ...o, ...order } as any;
                           if (
                              order?.refund_status === "approved" &&
                              Array.isArray(merged.items)
                           ) {
                              merged.items = merged.items.map((it: any) => ({
                                 ...it,
                                 refund_status:
                                    it.refund_status === "requested"
                                       ? "approved"
                                       : it.refund_status,
                              }));
                              // Ensure list items reflect overall refunded status
                              merged.status =
                                 merged.status === "delivered"
                                    ? "refunded"
                                    : merged.status;
                           }
                           return merged;
                        });
                        queryClient.setQueryData(key, updatedList);
                     } catch (e) {}
                  }
               } catch (e) {
                  queryClient.invalidateQueries({
                     queryKey: orderKeys.lists(),
                  });
               }

               queryClient.invalidateQueries({ queryKey: orderKeys.stats() });
               toast.success("Order refund response processed");
            },
            onError: (err) => {
               console.error("Failed to respond to order refund:", err);
               toast.error(
                  err?.message || "Failed to process order refund response"
               );
            },
         }),

      // Hook to request full-order refund
      useRequestRefundOrder: () =>
         useMutation({
            mutationFn: ({
               orderId,
               reason,
               adminInitiated,
            }: {
               orderId: string;
               reason: string;
               adminInitiated?: boolean;
            }) =>
               requestRefundForOrder(orderId, reason, Boolean(adminInitiated)),
            onMutate: async ({
               orderId,
               reason,
            }: {
               orderId: string;
               reason: string;
            }) => {
               await queryClient.cancelQueries({
                  queryKey: orderKeys.details(),
               });
               await queryClient.cancelQueries({ queryKey: orderKeys.lists() });

               const previousDetails = queryClient.getQueriesData({
                  queryKey: orderKeys.details(),
               });
               const previousLists = queryClient.getQueriesData({
                  queryKey: orderKeys.lists(),
               });

               for (const [key, data] of previousDetails) {
                  try {
                     const order = data as any;
                     if (order && order.id === orderId) {
                        const updated = {
                           ...order,
                           refund_requested: true,
                           refund_reason: reason,
                           refund_status: "requested",
                           refund_requested_at: new Date().toISOString(),
                        };
                        queryClient.setQueryData(key, updated);
                     }
                  } catch (e) {}
               }

               for (const [key, data] of previousLists) {
                  try {
                     const list = data as any;
                     if (list && Array.isArray(list.data)) {
                        const updatedList = { ...list };
                        updatedList.data = list.data.map((order: any) => {
                           if (order.id !== orderId) return order;
                           return {
                              ...order,
                              refund_requested: true,
                              refund_reason: reason,
                              refund_status: "requested",
                              refund_requested_at: new Date().toISOString(),
                           };
                        });
                        queryClient.setQueryData(key, updatedList);
                     }
                  } catch (e) {}
               }

               return { previousDetails, previousLists };
            },
            onError: (err, vars, context: any) => {
               if (context?.previousDetails) {
                  for (const [key, data] of context.previousDetails) {
                     try {
                        queryClient.setQueryData(key, data);
                     } catch (e) {}
                  }
               }
               if (context?.previousLists) {
                  for (const [key, data] of context.previousLists) {
                     try {
                        queryClient.setQueryData(key, data);
                     } catch (e) {}
                  }
               }
               toast.error(
                  err?.message || "Failed to request full-order refund"
               );
            },
            onSettled: (data: any) => {
               queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
               if (data?.id) {
                  queryClient.invalidateQueries({
                     queryKey: orderKeys.detail(data.id),
                  });
               } else {
                  queryClient.invalidateQueries({
                     queryKey: orderKeys.details(),
                  });
               }
            },
            onSuccess: () => {
               toast.success("Full-order refund requested");
            },
         }),

      // Hook to cancel full-order refund
      useCancelRefundRequestOrder: () =>
         useMutation({
            mutationFn: (orderId: string) =>
               cancelRefundRequestForOrder(orderId),
            onMutate: async (orderId: string) => {
               await queryClient.cancelQueries({
                  queryKey: orderKeys.details(),
               });
               await queryClient.cancelQueries({ queryKey: orderKeys.lists() });

               const previousDetails = queryClient.getQueriesData({
                  queryKey: orderKeys.details(),
               });
               const previousLists = queryClient.getQueriesData({
                  queryKey: orderKeys.lists(),
               });

               for (const [key, data] of previousDetails) {
                  try {
                     const order = data as any;
                     if (order && order.id === orderId) {
                        const updated = {
                           ...order,
                           refund_requested: false,
                           refund_reason: null,
                           refund_status: "cancelled",
                           refund_requested_at: null,
                        };
                        queryClient.setQueryData(key, updated);
                     }
                  } catch (e) {}
               }

               for (const [key, data] of previousLists) {
                  try {
                     const list = data as any;
                     if (list && Array.isArray(list.data)) {
                        const updatedList = { ...list };
                        updatedList.data = list.data.map((order: any) => {
                           if (order.id !== orderId) return order;
                           return {
                              ...order,
                              refund_requested: false,
                              refund_reason: null,
                              refund_status: "cancelled",
                              refund_requested_at: null,
                           };
                        });
                        queryClient.setQueryData(key, updatedList);
                     }
                  } catch (e) {}
               }

               return { previousDetails, previousLists };
            },
            onError: (err, vars, context: any) => {
               if (context?.previousDetails) {
                  for (const [key, data] of context.previousDetails) {
                     try {
                        queryClient.setQueryData(key, data);
                     } catch (e) {}
                  }
               }
               if (context?.previousLists) {
                  for (const [key, data] of context.previousLists) {
                     try {
                        queryClient.setQueryData(key, data);
                     } catch (e) {}
                  }
               }
               toast.error("Failed to cancel full-order refund request");
            },
            onSettled: (data: any) => {
               queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
               if (data?.id) {
                  queryClient.invalidateQueries({
                     queryKey: orderKeys.detail(data.id),
                  });
               } else {
                  queryClient.invalidateQueries({
                     queryKey: orderKeys.details(),
                  });
               }
            },
            onSuccess: () => {
               toast.success("Full-order refund cancelled");
            },
         }),

      // Mutation hooks
      createOrder: useCreateOrder(),
      updateOrderStatus: useUpdateOrderStatus(),
      deleteOrder: useDeleteOrder(),

      // Utility functions
      invalidateOrders: () => {
         queryClient.invalidateQueries({ queryKey: orderKeys.all });
      },

      // Refunds
      useRefundedItems: (opts?: {
         page?: number;
         limit?: number;
         refundStatus?: string;
      }) => useRefundedItems(opts || {}),
      // Expose assignment hook so components can cache/reuse rider lookups
      useOrderAssignment: (orderId?: string, enabled = true) =>
         useOrderAssignment(orderId, enabled),

      prefetchOrder: (id: string) => {
         return queryClient.prefetchQuery({
            queryKey: orderKeys.detail(id),
            queryFn: () => fetchOrderById(id),
            staleTime: 1000 * 60 * 5,
         });
      },

      // User state
      user,
      isLoggedIn,
      isAdmin,
   };
}

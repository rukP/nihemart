import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { authorizedAPI, unauthorizedAPI } from '@/lib/api';
import handleApiRequest from '@/lib/handleApiRequest';
import { formatLocalDate } from '@/lib/format';
import * as orderActionsAPI from '@/lib/api/orderActions';
import type {
  Order,
  OrderQueryOptions,
  CreateOrderRequest,
  OrderStatus,
  BackendOrder,
  BackendOrderItem,
  PaginatedOrdersResponse,
  OrderItem,
  Rider,
} from '@/types/orders';

// Transform backend order item to frontend format
function transformOrderItem(item: BackendOrderItem): OrderItem {
  return {
    ...item,
    id: item.id || '',
    order_id: item.orderId || item.order_id || '',
    product_id: item.productId || item.product_id || null,
    product_variation_id:
      item.productVariationId || item.product_variation_id || null,
    product_name: item.productName || item.product_name || '',
    product_sku: item.productSku || item.product_sku || null,
    variation_name: item.variationName || item.variation_name || null,
    product_image_url: item.productImageUrl || item.product_image_url || null,
    price: item.price || 0,
    quantity: item.quantity || 0,
    total: item.total || 0,
    created_at:
      item.createdAt instanceof Date
        ? item.createdAt.toISOString()
        : item.createdAt || item.created_at || '',
    refund_requested:
      item.refundRequested !== undefined
        ? item.refundRequested
        : item.refund_requested !== undefined
          ? item.refund_requested
          : false,
    refund_reason: item.refundReason || item.refund_reason || null,
    refund_status: item.refundStatus || item.refund_status || null,
    refund_requested_at: item.refundRequestedAt
      ? typeof item.refundRequestedAt === 'string'
        ? item.refundRequestedAt
        : (item.refundRequestedAt as Date).toISOString()
      : item.refund_requested_at || null,
    rejected: item.rejected,
    rejection_reason: item.rejection_reason,
    rejected_at: item.rejected_at,
  };
}

// Transform backend camelCase to frontend snake_case for compatibility
// FIXED: Include ALL fields including label fields and ensure payment_method always has a default
function transformOrder(order: BackendOrder): Order {
  if (!order) return order as unknown as Order;

  const deliveryTime = order.deliveryTime
    ? typeof order.deliveryTime === 'string'
      ? order.deliveryTime
      : order.deliveryTime.toISOString()
    : order.delivery_time;

  const refundRequestedAt = order.refundRequestedAt
    ? typeof order.refundRequestedAt === 'string'
      ? order.refundRequestedAt
      : order.refundRequestedAt.toISOString()
    : order.refund_requested_at;

  return {
    ...order,
    id: order.id || '',
    // Transform camelCase to snake_case
    order_number: order.orderNumber || order.order_number || '',
    user_id: order.userId || order.user_id,
    status: (order.status as OrderStatus) || 'pending',
    subtotal: order.subtotal || 0,
    total: order.total || 0,
    created_at:
      order.createdAt instanceof Date
        ? order.createdAt.toISOString()
        : order.createdAt || order.created_at || '',
    updated_at:
      order.updatedAt instanceof Date
        ? order.updatedAt.toISOString()
        : order.updatedAt || order.updated_at || '',
    shipped_at:
      order.shippedAt instanceof Date
        ? order.shippedAt.toISOString()
        : order.shippedAt || order.shipped_at,
    delivered_at:
      order.deliveredAt instanceof Date
        ? order.deliveredAt.toISOString()
        : order.deliveredAt || order.delivered_at,
    customer_email: order.customerEmail || order.customer_email || '',
    customer_first_name:
      order.customerFirstName || order.customer_first_name || '',
    customer_last_name:
      order.customerLastName || order.customer_last_name || '',
    customer_phone: order.customerPhone || order.customer_phone,
    delivery_address: order.deliveryAddress || order.delivery_address || '',
    delivery_city: order.deliveryCity || order.delivery_city || '',
    delivery_notes: order.deliveryNotes || order.delivery_notes,
    schedule_notes: order.scheduleNotes || order.schedule_notes,
    delivery_time: deliveryTime,
    // FIXED: Always include payment_method with default value if missing
    payment_method:
      order.paymentMethod || order.payment_method || 'cash_on_delivery',
    is_paid: order.isPaid !== undefined ? order.isPaid : order.is_paid,
    is_external:
      order.isExternal !== undefined ? order.isExternal : order.is_external,
    refund_requested:
      order.refundRequested !== undefined
        ? order.refundRequested
        : order.refund_requested,
    refund_reason: order.refundReason || order.refund_reason,
    refund_status: order.refundStatus || order.refund_status,
    refund_requested_at: refundRequestedAt,
    // FIXED: Include order labeling fields (handle both camelCase and snake_case)
    label_number: order.labelNumber || order.label_number || null,
    location_code: order.locationCode || order.location_code || null,
    is_labeled:
      order.isLabeled !== undefined
        ? order.isLabeled
        : order.is_labeled !== undefined
          ? order.is_labeled
          : false,
    rider: order.rider,
    // Transform items with ALL refund fields
    items: order.items ? order.items.map(transformOrderItem) : order.items,
  };
}

interface BackendPaginatedResponse {
  data?: BackendOrder[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  count?: number;
}

type BackendOrderListResponse =
  | BackendPaginatedResponse
  | BackendOrder[]
  | BackendOrder;

function transformOrderList(
  data: BackendOrderListResponse
): PaginatedOrdersResponse | Order[] {
  if (!data) return [];

  // Handle paginated response
  if (
    typeof data === 'object' &&
    'data' in data &&
    Array.isArray((data as BackendPaginatedResponse).data)
  ) {
    const paginatedData = data as BackendPaginatedResponse;
    return {
      ...paginatedData,
      data: paginatedData.data!.map(transformOrder),
    } as PaginatedOrdersResponse;
  }

  // Handle array response
  if (Array.isArray(data)) {
    return data.map(transformOrder);
  }

  return [transformOrder(data as BackendOrder)];
}

// Query Keys
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (options: OrderQueryOptions) =>
    [...orderKeys.lists(), options] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  stats: () => [...orderKeys.all, 'stats'] as const,
  userOrders: (userId: string) => [...orderKeys.all, 'user', userId] as const,
};

// Internal API functions (renamed to avoid conflict with imported orderAPI)
const internalOrderAPI = {
  // Get user orders (allows guests - will filter by userId if authenticated, or by email/orderNumber if guest)
  getUserOrders: async (
    options: OrderQueryOptions = {}
  ): Promise<PaginatedOrdersResponse | Order[]> => {
    const params = new URLSearchParams();

    if (options.filters) {
      if (options.filters.status)
        params.append('status', options.filters.status);
      if (options.filters.search)
        params.append('search', options.filters.search);
      if (options.filters.dateFrom)
        params.append('dateFrom', options.filters.dateFrom);
      if (options.filters.dateTo)
        params.append('dateTo', options.filters.dateTo);
      if (options.filters.priceMin)
        params.append('priceMin', String(options.filters.priceMin));
      if (options.filters.priceMax)
        params.append('priceMax', String(options.filters.priceMax));
      if (options.filters.city) params.append('city', options.filters.city);
      if (options.filters.isPaid !== undefined)
        params.append('isPaid', String(options.filters.isPaid));
      if (options.filters.isExternal !== undefined)
        params.append('isExternal', String(options.filters.isExternal));
    }

    if (options.pagination) {
      if (options.pagination.page)
        params.append('page', String(options.pagination.page));
      if (options.pagination.limit)
        params.append('limit', String(options.pagination.limit));
    }

    if (options.sort) {
      if (options.sort.column) params.append('sortColumn', options.sort.column);
      if (options.sort.direction)
        params.append('sortDirection', options.sort.direction);
    }

    const queryString = params.toString();
    // Use unauthorizedAPI to allow guests (token will be attached via interceptor if available)
    const result = await handleApiRequest(() =>
      unauthorizedAPI.get(`/orders${queryString ? `?${queryString}` : ''}`)
    );
    return transformOrderList(result);
  },

  // Get all orders (admin)
  getAllOrders: async (
    options: OrderQueryOptions = {}
  ): Promise<PaginatedOrdersResponse | Order[]> => {
    const params = new URLSearchParams();

    if (options.filters) {
      if (options.filters.status)
        params.append('status', options.filters.status);
      if (options.filters.search)
        params.append('search', options.filters.search);
      if (options.filters.dateFrom)
        params.append('dateFrom', options.filters.dateFrom);
      if (options.filters.dateTo)
        params.append('dateTo', options.filters.dateTo);
      if (options.filters.priceMin)
        params.append('priceMin', String(options.filters.priceMin));
      if (options.filters.priceMax)
        params.append('priceMax', String(options.filters.priceMax));
      if (options.filters.city) params.append('city', options.filters.city);
      if (options.filters.isPaid !== undefined)
        params.append('isPaid', String(options.filters.isPaid));
      if (options.filters.isExternal !== undefined)
        params.append('isExternal', String(options.filters.isExternal));
    }

    if (options.pagination) {
      if (options.pagination.page)
        params.append('page', String(options.pagination.page));
      if (options.pagination.limit)
        params.append('limit', String(options.pagination.limit));
    }

    if (options.sort) {
      if (options.sort.column) params.append('sortColumn', options.sort.column);
      if (options.sort.direction)
        params.append('sortDirection', options.sort.direction);
    }

    const queryString = params.toString();
    const result = await handleApiRequest(() =>
      authorizedAPI.get(
        `/orders/admin/all${queryString ? `?${queryString}` : ''}`
      )
    );
    return transformOrderList(result);
  },

  // Get order by ID (allows guests)
  getOrderById: async (id: string): Promise<Order> => {
    const result = await handleApiRequest(() =>
      unauthorizedAPI.get(`/orders/${id}`)
    );
    return transformOrder(result);
  },

  // Create order
  createOrder: async (request: CreateOrderRequest): Promise<Order> => {
    const result = await handleApiRequest(() =>
      authorizedAPI.post('/orders', request)
    );
    return transformOrder(result);
  },

  // Update order status (admin)
  updateOrderStatus: async (
    id: string,
    status: OrderStatus
  ): Promise<Order> => {
    const result = await handleApiRequest(() =>
      authorizedAPI.patch(`/orders/admin/${id}/status`, { status })
    );
    return transformOrder(result);
  },

  // Cancel order (customer-facing - allows guests)
  cancelOrder: async (id: string): Promise<Order> => {
    const result = await handleApiRequest(() =>
      unauthorizedAPI.patch(`/orders/${id}/cancel`)
    );
    return transformOrder(result);
  },

  // Mark transport only (admin) - Cancel order but keep transport fee
  markTransportOnly: async (id: string): Promise<Order> => {
    const result = await handleApiRequest(() =>
      authorizedAPI.post(`/orders/admin/${id}/transport-only`)
    );
    return transformOrder(result);
  },

  // Request refund for item (customer-facing - allows guests)
  requestItemRefund: async (
    itemId: string,
    reason: string
  ): Promise<OrderItem> => {
    return handleApiRequest(() =>
      unauthorizedAPI.post(`/orders/items/${itemId}/refund`, { reason })
    );
  },

  // Request refund for order (customer-facing - allows guests)
  requestOrderRefund: async (
    orderId: string,
    reason: string
  ): Promise<Order> => {
    const result = await handleApiRequest(() =>
      unauthorizedAPI.post(`/orders/${orderId}/refund`, { reason })
    );
    return transformOrder(result);
  },

  // Cancel item refund request (customer-facing - allows guests)
  cancelItemRefundRequest: async (itemId: string): Promise<OrderItem> => {
    return handleApiRequest(() =>
      unauthorizedAPI.post(`/orders/items/${itemId}/refund/cancel`)
    );
  },

  // Cancel order refund request (customer-facing - allows guests)
  cancelOrderRefundRequest: async (orderId: string): Promise<Order> => {
    const result = await handleApiRequest(() =>
      unauthorizedAPI.post(`/orders/${orderId}/refund/cancel`)
    );
    return transformOrder(result);
  },

  // Respond to item refund (admin)
  respondToItemRefund: async (
    itemId: string,
    approve: boolean
  ): Promise<OrderItem> => {
    return handleApiRequest(() =>
      authorizedAPI.post(`/orders/admin/items/${itemId}/refund/respond`, {
        approve,
      })
    );
  },

  // Respond to order refund (admin)
  respondToOrderRefund: async (
    orderId: string,
    approve: boolean
  ): Promise<Order> => {
    const result = await handleApiRequest(() =>
      authorizedAPI.post(`/orders/admin/${orderId}/refund/respond`, {
        approve,
      })
    );
    return transformOrder(result);
  },

  // Get refunded items (admin)
  getRefundedItems: async (
    options: {
      refundStatus?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    data: OrderItem[];
    pagination?: { page: number; limit: number; total: number };
  }> => {
    const params = new URLSearchParams();
    if (options.refundStatus)
      params.append('refundStatus', options.refundStatus);
    if (options.page) params.append('page', String(options.page));
    if (options.limit) params.append('limit', String(options.limit));

    const queryString = params.toString();
    return handleApiRequest(() =>
      authorizedAPI.get(
        `/orders/admin/refunds/items${queryString ? `?${queryString}` : ''}`
      )
    );
  },
};

/**
 * Hook for fetching user's orders
 */
export function useUserOrders(options: OrderQueryOptions = {}) {
  const { user } = useAuth();

  const key = orderKeys.userOrders(user?.id || 'guest');
  const keyWithOptions = [...key, { ...(options || {}) }];

  return useQuery({
    queryKey: keyWithOptions,
    queryFn: () => internalOrderAPI.getUserOrders(options),
    enabled: true, // Allow guests to query (they need to provide email/orderNumber in search)
    staleTime: 1000 * 60 * 2, // 2 minutes - orders can change frequently
    gcTime: 1000 * 60 * 15, // 15 minutes - keep in cache
    placeholderData: previousData => previousData, // Keep previous data while refetching
  });
}

/**
 * Hook for fetching all orders (admin only)
 */
export function useAllOrders(options: OrderQueryOptions = {}) {
  const { user, hasRole } = useAuth();

  return useQuery({
    queryKey: orderKeys.list(options),
    queryFn: () => internalOrderAPI.getAllOrders(options),
    enabled: !!user && hasRole('admin'),
    staleTime: 1000 * 60, // 1 minute - balance freshness with performance
    gcTime: 1000 * 60 * 10, // 10 minutes - keep in cache
    // Removed refetchInterval to prevent constant reloading - admins can manually refresh
    placeholderData: previousData => previousData,
  });
}

/**
 * Hook for fetching single order (allows guests)
 */
export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => internalOrderAPI.getOrderById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    placeholderData: previousData => previousData,
  });
}

/**
 * Hook to fetch and cache the latest rider assignment for an order
 */
/**
 * Hook to fetch assignments for multiple orders in batch
 */
export function useOrderAssignmentsBatch(orderIds: string[], enabled = true) {
  return useQuery({
    queryKey: ['orders', 'assignments', 'batch', orderIds.sort().join(',')],
    queryFn: async () => {
      if (orderIds.length === 0) return {};
      const idsParam = orderIds.join(',');
      const res = await fetch(
        `/api/orders/assignments/batch?ids=${encodeURIComponent(idsParam)}`
      );
      if (!res.ok) throw new Error('Failed to fetch assignments');
      const data = await res.json();
      return data.assignments || {};
    },
    enabled: enabled && orderIds.length > 0,
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}

interface OrderWithAssignments extends Order {
  assignments?: Array<{
    id: string;
    rider?: Rider | null;
    assignedAt: string;
  }>;
}

// Type for query cache data patterns
type QueryCacheData = Order | PaginatedOrdersResponse | unknown;
type QueryCacheEntry = [readonly unknown[], QueryCacheData];

// Helper to safely cast order-like data
function asOrderData(data: unknown): (Order & { data?: Order[] }) | null {
  if (!data || typeof data !== 'object') return null;
  return data as Order & { data?: Order[] };
}

// Mutation context type
interface MutationContext {
  previousQueries?: QueryCacheEntry[];
  previousDetails?: QueryCacheEntry[];
  previousLists?: QueryCacheEntry[];
}

export function useOrderAssignment(orderId?: string, enabled = true) {
  const { user, isLoggedIn } = useAuth();

  return useQuery<Rider | null>({
    queryKey: ['orders', 'assignment', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      // Get order which includes assignment info
      const order = await internalOrderAPI.getOrderById(orderId);
      // Extract rider from assignments array (latest assignment)
      const orderWithAssignments = order as OrderWithAssignments;
      if (
        orderWithAssignments &&
        Array.isArray(orderWithAssignments.assignments) &&
        orderWithAssignments.assignments.length > 0
      ) {
        // Get the latest assignment (should be sorted by assignedAt desc)
        const latestAssignment = orderWithAssignments.assignments[0];
        return latestAssignment?.rider || null;
      }
      // Fallback to direct rider property if it exists
      return orderWithAssignments?.rider || null;
    },
    enabled: Boolean(orderId) && enabled && isLoggedIn && !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Order stats type
export interface OrderStats {
  totalOrders?: number;
  total_orders?: number;
  deliveredOrders?: number;
  delivered_orders?: number;
  shippedOrders?: number;
  shipped_orders?: number;
  totalSales?: number;
  total_sales?: number;
  pendingOrders?: number;
  pending_orders?: number;
  processingOrders?: number;
  processing_orders?: number;
  cancelledOrders?: number;
  cancelled_orders?: number;
  completedOrders?: number;
  daily?: Array<{ day: string; count?: number; value?: number }>;
}

/**
 * Hook for order statistics (admin only)
 * Uses a reasonable limit to avoid overwhelming the browser with large datasets
 */
export function useOrderStats(
  options: {
    dateFrom?: string;
    dateTo?: string;
    payment_method?: string;
  } = {}
) {
  const { user, hasRole } = useAuth();

  return useQuery<OrderStats>({
    queryKey: [...orderKeys.stats(), options],
    queryFn: async () => {
      // Fetch orders with a reasonable limit to calculate stats
      // Note: For large datasets, consider adding a dedicated stats endpoint on the backend
      const ordersRes = await internalOrderAPI.getAllOrders({
        filters: {
          ...(options.dateFrom ? { dateFrom: options.dateFrom } : {}),
          ...(options.dateTo ? { dateTo: options.dateTo } : {}),
          ...(options.payment_method
            ? { payment_method: options.payment_method }
            : {}),
        },
        pagination: { page: 1, limit: 500 }, // Reduced from 10000 to prevent memory issues
      });
      const orders = Array.isArray(ordersRes)
        ? ordersRes
        : ordersRes?.data || [];

      // Get total count from pagination.total (actual total from backend)
      const totalOrders = Array.isArray(ordersRes)
        ? ordersRes.length
        : (ordersRes?.pagination?.total ?? ordersRes?.count ?? orders.length);

      // Calculate status counts from fetched orders
      // Note: These may be estimates if total > fetched limit
      const deliveredOrders = orders.filter((o: Order) => {
        const status = String(o.status || '').toLowerCase();
        return status === 'delivered';
      }).length;
      const shippedOrders = orders.filter((o: Order) => {
        const status = String(o.status || '').toLowerCase();
        return status === 'shipped';
      }).length;
      const pendingOrders = orders.filter((o: Order) => {
        const status = String(o.status || '').toLowerCase();
        return status === 'pending';
      }).length;
      const processingOrders = orders.filter((o: Order) => {
        const status = String(o.status || '').toLowerCase();
        return status === 'processing';
      }).length;
      const cancelledOrders = orders.filter((o: Order) => {
        const status = String(o.status || '').toLowerCase();
        return status === 'cancelled';
      }).length;

      const totalSales = orders
        .filter((o: Order) => {
          const status = String(o.status || '').toLowerCase();
          return status === 'delivered';
        })
        .reduce((sum: number, o: Order) => sum + Number(o.total || 0), 0);

      // Group orders by day for chart data (last 7 days)
      const dailyMap = new Map<string, number>();
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      orders.forEach((order: Order) => {
        const date = order.created_at;
        if (date) {
          const orderDate = new Date(date);
          if (orderDate >= sevenDaysAgo) {
            const day = formatLocalDate(orderDate);
            dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
          }
        }
      });

      const daily = Array.from(dailyMap.entries()).map(([day, count]) => ({
        day,
        count,
        value: count,
      }));

      return {
        totalOrders,
        deliveredOrders,
        shippedOrders,
        pendingOrders,
        processingOrders,
        cancelledOrders,
        totalSales,
        daily,
      };
    },
    enabled: !!user && hasRole('admin'),
    staleTime: 1000 * 60 * 5, // 5 minutes - longer cache to reduce refetches
    gcTime: 1000 * 60 * 15, // 15 minutes cache time
  });
}

/**
 * Hook for fetching refunded items (admin)
 */
export function useRefundedItems({
  page = 1,
  limit = 20,
  refundStatus,
}: { page?: number; limit?: number; refundStatus?: string } = {}) {
  const { user, hasRole } = useAuth();

  return useQuery({
    queryKey: ['orders', 'refunded', { page, limit, refundStatus }],
    queryFn: () =>
      internalOrderAPI.getRefundedItems({ refundStatus, page, limit }),
    enabled: !!user && hasRole('admin'),
    staleTime: 0,
  });
}

/**
 * Hook for creating orders
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<Order, Error, CreateOrderRequest>({
    mutationFn: async (orderData: CreateOrderRequest) => {
      if (!orderData.order || !orderData.items) {
        throw new Error('Invalid order data structure');
      }

      const result = await internalOrderAPI.createOrder(orderData);
      return result;
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      if (data?.id) {
        queryClient.setQueryData(orderKeys.detail(data.id), data);
      }
      if (user) {
        queryClient.invalidateQueries({
          queryKey: orderKeys.userOrders(user.id),
        });
      }

      // Payment-order linking is handled automatically by the backend
      // when creating orders from payment sessions, so no manual linking needed
      // Clean up session storage reference if present
      try {
        if (typeof window !== 'undefined') {
          const ref = sessionStorage.getItem('kpay_reference');
          if (ref) {
            sessionStorage.removeItem('kpay_reference');
          }
        }
      } catch (_e) {}
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create order');
    },
  });
}

/**
 * Hook for canceling orders (customer-facing - allows guests)
 */
export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return await internalOrderAPI.cancelOrder(id);
    },
    onMutate: async id => {
      await queryClient.cancelQueries({ queryKey: orderKeys.all });

      const previousQueries = queryClient.getQueriesData({});

      for (const [key, data] of previousQueries) {
        try {
          if (!data) continue;

          const orderData = asOrderData(data);
          if (orderData && orderData.id === id) {
            const updated = {
              ...orderData,
              status: 'cancelled' as OrderStatus,
            };
            queryClient.setQueryData(key, updated);
            continue;
          }

          if (orderData && Array.isArray(orderData.data)) {
            const updatedList = { ...orderData };
            updatedList.data = orderData.data.map((o: Order) =>
              o && o.id === id
                ? { ...o, status: 'cancelled' as OrderStatus }
                : o
            );
            queryClient.setQueryData(key, updatedList);
          }
        } catch (_e) {}
      }

      return { previousQueries };
    },
    onSuccess: updatedOrder => {
      try {
        queryClient.setQueryData(
          orderKeys.detail(updatedOrder.id),
          updatedOrder
        );
      } catch (_e) {}
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.stats() });
      toast.success('Order cancelled successfully');
    },
    onError: (error, _variables, context: MutationContext | undefined) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          try {
            queryClient.setQueryData(key, data);
          } catch (_e) {}
        }
      }
      // console.error('Failed to cancel order:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to cancel order'
      );
    },
    onSettled: data => {
      try {
        queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
        queryClient.invalidateQueries({ queryKey: orderKeys.stats() });
        if (data?.id) {
          queryClient.invalidateQueries({
            queryKey: orderKeys.detail(data.id),
          });
        }
      } catch (_e) {}
    },
  });
}

/**
 * Hook for marking order as transport only (admin only)
 * Cancels order but keeps transport fee
 */
export function useMarkTransportOnly() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return await internalOrderAPI.markTransportOnly(id);
    },
    onMutate: async _id => {
      await queryClient.cancelQueries({ queryKey: orderKeys.all });

      const previousQueries = queryClient.getQueriesData({});

      return { previousQueries };
    },
    onError: (err, id, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error('Failed to mark transport only');
    },
    onSuccess: (_updatedOrder, _id) => {
      // Invalidate and refetch all order queries
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      toast.success('Order marked as transport only');
    },
  });
}

/**
 * Hook for updating order status (admin only)
 */
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
      const updated = await internalOrderAPI.updateOrderStatus(id, status);
      // Merge additional fields if provided
      return { ...updated, ...(additionalFields || {}) } as Order;
    },
    onMutate: async ({ id, status, additionalFields }) => {
      await queryClient.cancelQueries({ queryKey: orderKeys.all });

      const previousQueries = queryClient.getQueriesData({});

      for (const [key, data] of previousQueries) {
        try {
          if (!data) continue;

          const orderData = asOrderData(data);
          if (orderData && orderData.id === id) {
            const updated = {
              ...orderData,
              ...(additionalFields || {}),
              status,
            };
            queryClient.setQueryData(key, updated);
            continue;
          }

          if (orderData && Array.isArray(orderData.data)) {
            const updatedList = { ...orderData };
            updatedList.data = orderData.data.map((o: Order) =>
              o && o.id === id
                ? { ...o, ...(additionalFields || {}), status }
                : o
            );
            queryClient.setQueryData(key, updatedList);
          }
        } catch (_e) {}
      }

      return { previousQueries };
    },
    onSuccess: updatedOrder => {
      try {
        queryClient.setQueryData(
          orderKeys.detail(updatedOrder.id),
          updatedOrder
        );
      } catch (_e) {}
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.stats() });
    },
    onError: (error, _variables, context: MutationContext | undefined) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          try {
            queryClient.setQueryData(key, data);
          } catch (_e) {}
        }
      }
      // console.error('Failed to update order status:', error);
    },
    onSettled: data => {
      try {
        queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
        queryClient.invalidateQueries({ queryKey: orderKeys.stats() });
        if (data?.id) {
          queryClient.invalidateQueries({
            queryKey: orderKeys.detail(data.id),
          });
        }
      } catch (_e) {}
    },
  });
}

/**
 * Hook for REJECTING an order item (non-delivered orders only)
 * This is an immediate action that does NOT require admin approval
 */
export function useRejectOrderItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderItemId,
      reason,
      isDelivered,
    }: {
      orderItemId: string;
      reason: string;
      isDelivered: boolean;
    }) => {
      // console.log('[useRejectOrderItem] Calling endpoint:', {
      //   orderItemId,
      //   isDelivered,
      //   endpoint: isDelivered ? '/refund' : '/reject',
      // });

      // Call the appropriate endpoint based on delivery status
      if (isDelivered) {
        // Delivered orders: request refund (requires admin approval)
        return orderActionsAPI.requestRefundForItem(orderItemId, reason);
      } else {
        // Non-delivered orders: reject immediately (no approval needed)
        return orderActionsAPI.rejectOrderItem(orderItemId, reason);
      }
    },
    onMutate: async ({
      orderItemId,
      reason,
      isDelivered,
    }: {
      orderItemId: string;
      reason: string;
      isDelivered: boolean;
    }) => {
      await queryClient.cancelQueries({ queryKey: orderKeys.details() });
      await queryClient.cancelQueries({ queryKey: orderKeys.lists() });

      const previousDetails = queryClient.getQueriesData({
        queryKey: orderKeys.details(),
      });
      const previousLists = queryClient.getQueriesData({
        queryKey: orderKeys.lists(),
      });

      // Optimistically mark item based on order delivery status
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

              if (isDelivered) {
                // Delivered orders: refund request (requires admin approval)
                updated.items[idx] = {
                  ...updated.items[idx],
                  refund_requested: true,
                  refund_reason: reason,
                  refund_status: 'requested',
                  refund_requested_at: new Date().toISOString(),
                };
              } else {
                // Non-delivered orders: immediate rejection
                updated.items[idx] = {
                  ...updated.items[idx],
                  rejected: true,
                  rejection_reason: reason,
                  rejected_at: new Date().toISOString(),
                };
              }

              queryClient.setQueryData(key, updated);
            }
          }
        } catch (_e) {
          // console.error('Error during optimistic update:', _e);
        }
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

              if (isDelivered) {
                // Delivered orders: refund request (requires admin approval)
                updatedOrder.items[itemIdx] = {
                  ...updatedOrder.items[itemIdx],
                  refund_requested: true,
                  refund_reason: reason,
                  refund_status: 'requested',
                  refund_requested_at: new Date().toISOString(),
                };
              } else {
                // Non-delivered orders: immediate rejection
                updatedOrder.items[itemIdx] = {
                  ...updatedOrder.items[itemIdx],
                  rejected: true,
                  rejection_reason: reason,
                  rejected_at: new Date().toISOString(),
                };
              }

              return updatedOrder;
            });
            queryClient.setQueryData(key, updatedList);
          }
        } catch (_e) {
          // console.error('Error during optimistic list update:', _e);
        }
      }

      return { previousDetails, previousLists };
    },
    onError: (err, variables, context: any) => {
      // rollback
      if (context?.previousDetails) {
        for (const [key, data] of context.previousDetails) {
          try {
            queryClient.setQueryData(key, data);
          } catch (_e) {}
        }
      }
      if (context?.previousLists) {
        for (const [key, data] of context.previousLists) {
          try {
            queryClient.setQueryData(key, data);
          } catch (_e) {}
        }
      }
      const message = err?.message || 'Failed to request refund';
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
    onSuccess: (data: any, _variables) => {
      // Update cache with actual server response
      // console.log(
      //   '[useRejectOrderItem] Success - updating cache with server data:',
      //   data
      // );

      // Update order details cache
      const details = queryClient.getQueriesData({
        queryKey: orderKeys.details(),
      });

      for (const [key, cachedData] of details) {
        try {
          const order = cachedData as any;
          if (order && Array.isArray(order.items)) {
            const idx = order.items.findIndex((it: any) => it.id === data.id);
            if (idx !== -1) {
              const updated = { ...order };
              updated.items = [...order.items];
              updated.items[idx] = {
                ...updated.items[idx],
                ...data, // Merge server response
              };
              queryClient.setQueryData(key, updated);
              // console.log('[useRejectOrderItem] Updated order detail cache');
            }
          }
        } catch (_e) {
          // console.error(
          //   '[useRejectOrderItem] Error updating detail cache:',
          //   _e
          // );
        }
      }

      // Force refetch to ensure UI is in sync
      queryClient.invalidateQueries({ queryKey: orderKeys.details() });
    },
  });
}

/**
 * Hook for canceling item refund request
 */
export function useUnrejectOrderItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderItemId: string) =>
      orderActionsAPI.cancelRefundRequestForItem(orderItemId),
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
                refund_status: 'cancelled',
                refund_requested_at: null,
              };
              queryClient.setQueryData(key, updated);
            }
          }
        } catch (_e) {}
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
                refund_status: 'cancelled',
                refund_requested_at: null,
              };
              return updatedOrder;
            });
            queryClient.setQueryData(key, updatedList);
          }
        } catch (_e) {}
      }

      return { previousDetails, previousLists };
    },
    onError: (err, variables, context: any) => {
      if (context?.previousDetails) {
        for (const [key, data] of context.previousDetails) {
          try {
            queryClient.setQueryData(key, data);
          } catch (_e) {}
        }
      }
      if (context?.previousLists) {
        for (const [key, data] of context.previousLists) {
          try {
            queryClient.setQueryData(key, data);
          } catch (_e) {}
        }
      }
      toast.error('Failed to cancel refund request');
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
      toast.success('Refund request cancelled');
    },
  });
}

/**
 * Main hook that provides all order-related functionality
 */
export function useOrders() {
  const { user, isLoggedIn, hasRole } = useAuth();
  const queryClient = useQueryClient();

  const isAdmin = hasRole('admin');

  return {
    // Query hooks
    useUserOrders: (options?: OrderQueryOptions) =>
      useUserOrders(options || {}),
    useAllOrders: (options?: OrderQueryOptions) => useAllOrders(options || {}),
    useOrder: (id: string) => useOrder(id),
    useOrderStats: (options?: {
      dateFrom?: string;
      dateTo?: string;
      payment_method?: string;
    }) => useOrderStats(options || {}),
    // Mutation hooks
    cancelOrder: useCancelOrder(),
    updateOrderStatus: useUpdateOrderStatus(),
    markTransportOnly: useMarkTransportOnly(),
    useRequestRefundItem: () => useRejectOrderItem(),
    useCancelRefundRequestItem: () => useUnrejectOrderItem(),
    useRespondRefundRequest: () =>
      useMutation({
        mutationFn: ({
          itemId,
          approve,
          _note,
        }: {
          itemId: string;
          approve: boolean;
          _note?: string;
        }) => internalOrderAPI.respondToItemRefund(itemId, approve),
        onSuccess: updatedItem => {
          // Try to merge the updated item row into any cached orders so UI updates immediately
          try {
            const item = updatedItem as any;
            const updatedItemId = item?.id;
            const parentOrderId = item?.order_id || item?.orderId;

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
              } catch (_e) {}
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
              } catch (_e) {}
            }

            // Invalidate the parent order query to refetch updated order status
            // This ensures we get the updated order status if all items are refunded
            if (parentOrderId) {
              queryClient.invalidateQueries({
                queryKey: orderKeys.detail(parentOrderId),
              });

              // Also update cached data if present (optimistic update)
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

                    // If all items are now refunded (approved), mark order as refunded
                    // Check if the updated item has approved status
                    const itemRefundStatus =
                      item?.refund_status || item?.refundStatus;
                    const isApproved = itemRefundStatus === 'approved';

                    if (
                      isApproved &&
                      Array.isArray(updated.items) &&
                      updated.items.length > 0
                    ) {
                      const allItemsRefunded = updated.items.every(
                        (it: any) =>
                          it.refund_status === 'approved' ||
                          it.refundStatus === 'approved'
                      );
                      if (allItemsRefunded) {
                        updated.status = 'refunded';
                        updated.refund_status = 'approved';
                        updated.refundStatus = 'approved';
                        updated.refund_requested = true;
                        updated.refundRequested = true;
                      }
                    }

                    queryClient.setQueryData(
                      orderKeys.detail(parentOrderId),
                      updated
                    );
                  }
                }
              }
            }
          } catch (_e) {
            // fallback to invalidation
            queryClient.invalidateQueries({
              queryKey: orderKeys.lists(),
            });
          }

          queryClient.invalidateQueries({ queryKey: orderKeys.stats() });
          try {
            if (
              (updatedItem as any)?.refund_status === 'rejected' &&
              (updatedItem as any)?._mode === 'reject'
            ) {
              toast.success('Reject response processed');
            } else {
              toast.success('Refund response processed');
            }
          } catch (_e) {
            toast.success('Refund response processed');
          }
        },
        onError: err => {
          // console.error('Failed to respond to refund:', err);
          toast.error(err?.message || 'Failed to process refund response');
        },
      }),
    // Admin respond to full-order refunds
    useRespondOrderRefund: () =>
      useMutation({
        mutationFn: ({
          orderId,
          approve,
          _note,
        }: {
          orderId: string;
          approve: boolean;
          _note?: string;
        }) => internalOrderAPI.respondToOrderRefund(orderId, approve),
        onSuccess: updatedOrder => {
          try {
            const order = updatedOrder as any;
            const id = order?.id;

            // Merge into order detail cache
            const existing = queryClient.getQueryData(orderKeys.detail(id));
            if (existing) {
              const merged = { ...(existing as any), ...order } as any;
              if (
                order?.refund_status === 'approved' &&
                Array.isArray(merged.items)
              ) {
                merged.items = merged.items.map((it: any) => ({
                  ...it,
                  refund_status:
                    it.refund_status === 'requested'
                      ? 'approved'
                      : it.refund_status,
                }));
                // When a full-order refund is approved, ensure order status reflects refunded
                merged.status =
                  merged.status === 'delivered' ? 'refunded' : merged.status;
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
                    order?.refund_status === 'approved' &&
                    Array.isArray(merged.items)
                  ) {
                    merged.items = merged.items.map((it: any) => ({
                      ...it,
                      refund_status:
                        it.refund_status === 'requested'
                          ? 'approved'
                          : it.refund_status,
                    }));
                    // Ensure list items reflect overall refunded status
                    merged.status =
                      merged.status === 'delivered'
                        ? 'refunded'
                        : merged.status;
                  }
                  return merged;
                });
                queryClient.setQueryData(key, updatedList);
              } catch (_e) {}
            }
          } catch (_e) {
            queryClient.invalidateQueries({
              queryKey: orderKeys.lists(),
            });
          }

          queryClient.invalidateQueries({ queryKey: orderKeys.stats() });
          toast.success('Order refund response processed');
        },
        onError: err => {
          // console.error('Failed to respond to order refund:', err);
          toast.error(
            err?.message || 'Failed to process order refund response'
          );
        },
      }),

    // Hook to request full-order refund
    useRequestRefundOrder: () =>
      useMutation({
        mutationFn: ({
          orderId,
          reason,
          _adminInitiated,
        }: {
          orderId: string;
          reason: string;
          _adminInitiated?: boolean;
        }) => internalOrderAPI.requestOrderRefund(orderId, reason),
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
                  refund_status: 'requested',
                  refund_requested_at: new Date().toISOString(),
                };
                queryClient.setQueryData(key, updated);
              }
            } catch (_e) {}
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
                    refund_status: 'requested',
                    refund_requested_at: new Date().toISOString(),
                  };
                });
                queryClient.setQueryData(key, updatedList);
              }
            } catch (_e) {}
          }

          return { previousDetails, previousLists };
        },
        onError: (err, vars, context: any) => {
          if (context?.previousDetails) {
            for (const [key, data] of context.previousDetails) {
              try {
                queryClient.setQueryData(key, data);
              } catch (_e) {}
            }
          }
          if (context?.previousLists) {
            for (const [key, data] of context.previousLists) {
              try {
                queryClient.setQueryData(key, data);
              } catch (_e) {}
            }
          }
          toast.error(err?.message || 'Failed to request full-order refund');
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
          toast.success('Full-order refund requested');
        },
      }),

    // Hook to cancel full-order refund
    useCancelRefundRequestOrder: () =>
      useMutation({
        mutationFn: (orderId: string) =>
          orderActionsAPI.cancelRefundRequestForOrder(orderId),
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
                  refund_status: 'cancelled',
                  refund_requested_at: null,
                };
                queryClient.setQueryData(key, updated);
              }
            } catch (_e) {}
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
                    refund_status: 'cancelled',
                    refund_requested_at: null,
                  };
                });
                queryClient.setQueryData(key, updatedList);
              }
            } catch (_e) {}
          }

          return { previousDetails, previousLists };
        },
        onError: (err, vars, context: any) => {
          if (context?.previousDetails) {
            for (const [key, data] of context.previousDetails) {
              try {
                queryClient.setQueryData(key, data);
              } catch (_e) {}
            }
          }
          if (context?.previousLists) {
            for (const [key, data] of context.previousLists) {
              try {
                queryClient.setQueryData(key, data);
              } catch (_e) {}
            }
          }
          toast.error('Failed to cancel full-order refund request');
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
          toast.success('Full-order refund cancelled');
        },
      }),

    // Mutation hooks
    createOrder: useCreateOrder(),
    // deleteOrder is not implemented - returns a placeholder that throws
    deleteOrder: {
      mutateAsync: (_id: string) => {
        throw new Error('Delete order not implemented');
      },
      mutate: (_id: string) => {
        throw new Error('Delete order not implemented');
      },
      isPending: false,
      isError: false,
      isSuccess: false,
    },

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
        queryFn: () => internalOrderAPI.getOrderById(id),
        staleTime: 1000 * 60 * 5, // 5 minutes for prefetched data
        gcTime: 1000 * 60 * 15, // 15 minutes
      });
    },

    // User state
    user,
    isLoggedIn,
    isAdmin,
  };
}

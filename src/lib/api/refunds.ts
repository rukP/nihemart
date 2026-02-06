import { authorizedAPI } from '../api';
import handleApiRequest from '@/lib/handleApiRequest';

export interface RefundItem {
  id: string;
  orderId: string;
  orderItemId?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  amount: number;
  reason?: string;
  requestedAt: string;
  respondedAt?: string;
  response?: string;
  order?: any;
  item?: any;
}

export interface RefundsResponse {
  data: RefundItem[];
  count?: number;
  total?: number;
}

export interface RefundFilters {
  type?: 'items' | 'orders';
  status?: 'pending' | 'approved' | 'rejected' | 'completed';
  page?: number;
  limit?: number;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
}

// Internal API functions
const refundsAPI = {
  // Get refunded items (admin only)
  getRefundedItems: async (
    filters: RefundFilters = {}
  ): Promise<RefundsResponse> => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);

    const res = await handleApiRequest(() =>
      authorizedAPI.get(
        `/orders/admin/refunds/items${params.toString() ? `?${params.toString()}` : ''}`
      )
    );

    return {
      data: Array.isArray(res) ? res : res?.data || res?.items || [],
      count: res?.count || res?.total || 0,
    };
  },

  // Respond to item refund request (admin only)
  respondToItemRefund: async (
    itemId: string,
    action: 'approved' | 'rejected',
    response?: string
  ): Promise<RefundItem> => {
    return handleApiRequest(() =>
      authorizedAPI.post(`/orders/admin/items/${itemId}/refund/respond`, {
        action,
        response,
      })
    );
  },

  // Respond to order refund request (admin only)
  respondToOrderRefund: async (
    orderId: string,
    action: 'approved' | 'rejected',
    response?: string
  ): Promise<any> => {
    return handleApiRequest(() =>
      authorizedAPI.post(`/orders/admin/${orderId}/refund/respond`, {
        action,
        response,
      })
    );
  },
};

export default refundsAPI;

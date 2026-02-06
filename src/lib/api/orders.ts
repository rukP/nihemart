import { authorizedAPI, unauthorizedAPI } from '@/lib/api';
import handleApiRequest from '@/lib/handleApiRequest';
import { Order } from '@/types/orders';

/**
 * Fetch order by ID (allows guests)
 */
export async function fetchOrderById(orderId: string): Promise<Order> {
  return handleApiRequest(() => unauthorizedAPI.get(`/orders/${orderId}`));
}

/**
 * Fetch refunded data for dashboard
 */
export async function fetchRefundedDataForDashboard(
  dateFrom?: string,
  dateTo?: string
): Promise<{
  totals: {
    requested: number;
    approved: number;
    rejected: number;
    cancelled?: number;
    refunded?: number;
  };
  series: Array<{
    date: string;
    requested: number;
    approved: number;
    rejected: number;
  }>;
}> {
  // Use the refunded items endpoint, forwarding optional date filters
  const params = new URLSearchParams();
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);

  const response = await handleApiRequest(() =>
    authorizedAPI.get(
      `/orders/admin/refunds/items${params.toString() ? `?${params.toString()}` : ''}`
    )
  );

  // Transform response to match expected format
  const items = response.items || response.data || [];

  const totals = {
    requested: items.filter((item: any) => item.refund_status === 'requested')
      .length,
    approved: items.filter((item: any) => item.refund_status === 'approved')
      .length,
    rejected: items.filter((item: any) => item.refund_status === 'rejected')
      .length,
    cancelled: items.filter((item: any) => item.refund_status === 'cancelled')
      .length,
    refunded: items.filter((item: any) => item.refund_status === 'refunded')
      .length,
  };

  // Group by date for series data
  const seriesMap = new Map<
    string,
    { requested: number; approved: number; rejected: number }
  >();

  items.forEach((item: any) => {
    if (item.refund_requested_at) {
      const date = new Date(item.refund_requested_at)
        .toISOString()
        .split('T')[0];
      const existing = seriesMap.get(date) || {
        requested: 0,
        approved: 0,
        rejected: 0,
      };

      if (item.refund_status === 'requested') existing.requested++;
      else if (item.refund_status === 'approved') existing.approved++;
      else if (item.refund_status === 'rejected') existing.rejected++;

      seriesMap.set(date, existing);
    }
  });

  const series = Array.from(seriesMap.entries()).map(([date, counts]) => ({
    date,
    ...counts,
  }));

  return { totals, series };
}

/**
 * Mark order as transport only (admin)
 * Cancels order but keeps transport fee. Zeroes product total, keeps transport fee.
 */
export async function markTransportOnly(orderId: string): Promise<Order> {
  return handleApiRequest(() =>
    authorizedAPI.post(`/orders/admin/${orderId}/transport-only`)
  );
}

/**
 * Label order (admin)
 * FIXED: Returns the full updated order with all fields including label fields
 */
export async function labelOrder(
  orderId: string,
  data: {
    labelNumber: string;
    locationCode: string;
    orderCount?: number;
  }
): Promise<Order> {
  const response = await handleApiRequest(() =>
    authorizedAPI.post(`/orders/admin/${orderId}/label`, data)
  );
  // FIXED: Ensure response is properly transformed - backend returns camelCase, we need snake_case
  // The transformOrder function will handle this, but we'll do a quick normalization here
  return {
    ...response,
    label_number: response.labelNumber || response.label_number,
    location_code: response.locationCode || response.location_code,
    is_labeled:
      response.isLabeled !== undefined
        ? response.isLabeled
        : response.is_labeled,
  } as Order;
}

/**
 * Remove label from order (admin)
 * FIXED: Returns the full updated order with all fields
 */
export async function removeOrderLabel(orderId: string): Promise<Order> {
  const response = await handleApiRequest(() =>
    authorizedAPI.delete(`/orders/admin/${orderId}/label`)
  );
  // FIXED: Ensure response is properly transformed - backend returns camelCase, we need snake_case
  return {
    ...response,
    label_number: response.labelNumber || response.label_number || null,
    location_code: response.locationCode || response.location_code || null,
    is_labeled:
      response.isLabeled !== undefined
        ? response.isLabeled
        : response.is_labeled !== undefined
          ? response.is_labeled
          : false,
  } as Order;
}

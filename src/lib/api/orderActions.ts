import { unauthorizedAPI } from '@/lib/api';
import handleApiRequest from '@/lib/handleApiRequest';

/**
 * REJECT item (non-delivered orders only) - Immediate action, no admin approval needed
 */
export async function rejectOrderItem(orderItemId: string, reason: string) {
  return handleApiRequest(() =>
    unauthorizedAPI.post(`/orders/items/${orderItemId}/reject`, { reason })
  );
}

/**
 * REQUEST REFUND for item (delivered orders only) - Requires admin approval
 */
export async function requestRefundForItem(
  orderItemId: string,
  reason: string
) {
  return handleApiRequest(() =>
    unauthorizedAPI.post(`/orders/items/${orderItemId}/refund`, { reason })
  );
}

/**
 * Cancel refund request for item
 */
export async function cancelRefundRequestForItem(orderItemId: string) {
  return handleApiRequest(() =>
    unauthorizedAPI.post(`/orders/items/${orderItemId}/refund/cancel`)
  );
}

/**
 * Cancel refund request for order
 */
export async function cancelRefundRequestForOrder(orderId: string) {
  return handleApiRequest(() =>
    unauthorizedAPI.post(`/orders/${orderId}/refund/cancel`)
  );
}

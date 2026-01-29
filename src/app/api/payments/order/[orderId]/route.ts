import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { API_BASE } from '@/lib/api';

// Helper to extract auth token from request
function getAuthToken(request: NextRequest): string | null {
   const authHeader = request.headers.get("authorization");
   if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.slice(7);
   }
   return null;
}

interface RouteParams {
  params: Promise<{
    orderId: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { orderId } = await params;

  try {
    logger.info('api', 'Payment list request received', { orderId });

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Get auth token from request headers
    const authToken = getAuthToken(request);

    // Forward request to backend
    const backendUrl = `${API_BASE}/payments/order/${orderId}`;
    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
    });

    const backendData = await backendResponse.json();

    if (!backendResponse.ok) {
      logger.error('api', 'Backend payment list fetch failed', {
        orderId,
        status: backendResponse.status,
        error: backendData.message || backendData.error,
      });
      return NextResponse.json(
        {
          error: backendData.message || backendData.error || 'Failed to fetch payments',
        },
        { status: backendResponse.status }
      );
    }

    // Transform backend response (camelCase to snake_case for compatibility)
    const payments = (backendData.data || backendData || []).map((payment: any) => ({
      ...payment,
      order_id: payment.orderId || payment.order_id,
      kpay_transaction_id: payment.kpayTransactionId || payment.kpay_transaction_id,
      kpay_auth_key: payment.kpayAuthKey || payment.kpay_auth_key,
      kpay_return_code: payment.kpayReturnCode || payment.kpay_return_code,
      kpay_response: payment.kpayResponse || payment.kpay_response,
      kpay_webhook_data: payment.kpayWebhookData || payment.kpay_webhook_data,
      kpay_mom_transaction_id: payment.kpayMomTransactionId || payment.kpay_mom_transaction_id,
      kpay_pay_account: payment.kpayPayAccount || payment.kpay_pay_account,
      failure_reason: payment.failureReason || payment.failure_reason,
      client_timeout: payment.clientTimeout || payment.client_timeout,
      client_timeout_reason: payment.clientTimeoutReason || payment.client_timeout_reason,
      created_at: payment.createdAt || payment.created_at,
      updated_at: payment.updatedAt || payment.updated_at,
      completed_at: payment.completedAt || payment.completed_at,
    }));

    logger.info('api', 'Payments retrieved successfully', {
      orderId,
      paymentCount: payments?.length || 0
    });

    return NextResponse.json(payments || []);

  } catch (error) {
    logger.error('api', 'Failed to retrieve payments for order', {
      orderId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

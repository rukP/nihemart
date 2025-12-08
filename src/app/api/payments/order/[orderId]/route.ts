import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/utils/supabase/service';
import { logger } from '@/lib/logger';

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

    // Initialize Supabase client
    const supabase = createServiceSupabaseClient();

    // Fetch all payments for this order
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (paymentsError) {
      logger.error('api', 'Failed to fetch payments', { orderId, error: paymentsError.message });
      return NextResponse.json(
        { error: 'Failed to fetch payments' },
        { status: 500 }
      );
    }

    logger.info('api', 'Payments retrieved successfully', { 
      orderId,
      paymentCount: payments?.length || 0
    });
    
    // Check for pending payments and update their status
    if (payments && payments.length > 0) {
      const pendingPayments = payments.filter(p => p.status === 'pending' && p.kpay_transaction_id);
      
      if (pendingPayments.length > 0) {
        logger.info('api', 'Found pending payments, checking for updates', { 
          orderId,
          pendingCount: pendingPayments.length 
        });
        
        // Check status for each pending payment
        for (const payment of pendingPayments) {
          try {
            const statusResponse = await fetch(`${request.nextUrl.origin}/api/payments/kpay/status`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ paymentId: payment.id })
            });
            
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              if (statusData.needsUpdate) {
                payment.status = statusData.status;
                logger.info('api', 'Payment status updated in list', { 
                  paymentId: payment.id,
                  newStatus: statusData.status 
                });
              }
            }
          } catch (statusError) {
            logger.warn('api', 'Failed to check status for payment', { 
              paymentId: payment.id,
              error: statusError instanceof Error ? statusError.message : String(statusError)
            });
          }
        }
      }
    }

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
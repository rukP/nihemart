'use client';

import { AlertCircle } from 'lucide-react';

// ============================================================================
// RETRY BANNER COMPONENT
// Displays information banner when user is retrying a failed payment.
// Shows previous payment method and amount.
// ============================================================================

export interface RetryBannerProps {
  isRetryMode: boolean;
  total: number;
  previousPaymentMethod?: string | null;
  loadCheckoutFromStorage: () => any;
}

/**
 * Get human-readable payment method name
 */
function getPaymentMethodName(method: string): string {
  switch (method) {
    case 'mtn_momo':
      return 'MTN Mobile Money';
    case 'airtel_money':
      return 'Airtel Money';
    case 'visa_card':
      return 'Visa Card';
    case 'mastercard':
      return 'MasterCard';
    case 'cash_on_delivery':
      return 'Cash on Delivery';
    default:
      return method;
  }
}

export function RetryBanner({
  isRetryMode,
  total,
  previousPaymentMethod,
  loadCheckoutFromStorage,
}: RetryBannerProps) {
  if (!isRetryMode) return null;

  // Try to get the old payment method from storage if not provided via props
  const persisted = loadCheckoutFromStorage();
  const oldMethod = previousPaymentMethod || persisted?.paymentMethod;

  return (
    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center">
        <AlertCircle className="h-5 w-5 text-blue-600 mr-3" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900">Retry Payment</p>
          <p className="text-xs text-blue-700 mt-1">
            Previous payment failed or timed out. Choose a different payment
            method below. Your cart and delivery details were restored from your
            browser.
          </p>
          <div className="mt-2 text-xs text-blue-800 space-y-1">
            <div>Amount: RWF {Number(total).toLocaleString()}</div>
            {oldMethod && (
              <div className="flex items-center gap-2">
                <span>Previous method:</span>
                <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-medium">
                  {getPaymentMethodName(oldMethod)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RetryBanner;

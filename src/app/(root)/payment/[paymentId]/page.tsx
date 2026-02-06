'use client';
import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  Smartphone,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { useKPayPayment } from '@/hooks/useKPayPayment';
import { useAuth } from '@/hooks/useAuth';
import { useOrders } from '@/hooks/useOrders';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import Image from 'next/image';
import logo from '@/assets/logo.png';
import { navigateToThankYou } from '@/lib/navigation';

interface PaymentData {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  reference: string;
  kpay_transaction_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  created_at: string;
  checkout_url?: string;
  failure_reason?: string;
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      }
    >
      <PaymentPageContent />
    </Suspense>
  );
}

function PaymentPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { checkPaymentStatus, isCheckingStatus } = useKPayPayment();

  const rawPaymentId = params?.paymentId as string;
  // Sanitize paymentId: handle cases where it might be the string "null" or "undefined"
  // Also decode URL-encoded values (e.g., %7Breference%7D becomes {reference})
  let decodedPaymentId = rawPaymentId;
  try {
    if (rawPaymentId) {
      decodedPaymentId = decodeURIComponent(rawPaymentId);
    }
  } catch (_e) {
    // If decoding fails, use original
    decodedPaymentId = rawPaymentId;
  }

  const paymentId =
    decodedPaymentId &&
    decodedPaymentId !== 'null' &&
    decodedPaymentId !== 'undefined' &&
    decodedPaymentId !== '{reference}' &&
    decodedPaymentId.trim() !== ''
      ? decodedPaymentId
      : null;

  const orderId = searchParams?.get('orderId');
  // Sanitize orderId: some flows may include the literal string 'null'
  // (for example when building URLs from nullable values). Treat
  // 'null' or empty strings as absent so we don't append
  // `orderId=null` to URLs.
  const safeOrderId =
    orderId && orderId !== 'null' && orderId !== 'undefined'
      ? orderId
      : undefined;

  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [stoppedPolling, setStoppedPolling] = useState(false);
  const timeoutReportedRef = useRef(false);
  const pollingIntervalRef = useRef<number | null>(null);
  const lastStatusCheckRef = useRef<number>(0);
  const countdownIntervalRef = useRef<number | null>(null);
  const deadlineRef = useRef<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(300);
  const statusCheckCountRef = useRef(0); // Add missing variable
  const { user } = useAuth();
  const { createOrder } = useOrders();
  const { clearCart } = useCart();

  // Helper to load checkout snapshot
  const loadCheckoutFromStorage = () => {
    try {
      if (typeof window === 'undefined') return null;
      const raw = localStorage.getItem('nihemart_checkout_v1');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_e) {
      return null;
    }
  };

  // Helper to clear cart conditionally (only if NOT Buy Now flow)
  const clearCartIfNeeded = () => {
    try {
      const snapshot = loadCheckoutFromStorage();
      const isBuyNowFlow = snapshot?.isBuyNowFlow || false;

      if (!isBuyNowFlow) {
        clearCart();
        console.log('[PaymentPage] Cart cleared (cart order)');
      } else {
        console.log('[PaymentPage] Cart preserved (Buy Now order)');
      }
    } catch (_e) {
      console.error('[PaymentPage] Failed to handle cart:', _e);
    }
  };

  // Helper: finalize payment by reference and auto-create order if webhook didn't create it
  const finalizeAndMaybeCreateOrder = async (ref: string | undefined) => {
    if (!ref) return;
    try {
      const finResp = await fetch(`/api/payments/kpay/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: ref }),
      });

      if (!finResp.ok) {
        const errorData = await finResp.json().catch(() => ({}));
        console.error(
          '[finalizeAndMaybeCreateOrder] Finalize failed:',
          errorData
        );
        toast.error('Failed to finalize payment. Please try again.');
        return;
      }

      const finData = await finResp.json();

      // Backend's checkPaymentStatus should have created the order if payment was successful
      if (finData?.success && finData.orderId) {
        // Order was created by backend, redirect to appropriate page
        try {
          // Clean up storage
          try {
            localStorage.removeItem('nihemart_checkout_v1');
          } catch (_e) {}
          try {
            sessionStorage.removeItem('kpay_reference');
          } catch (_e) {}
          // Only clear cart if NOT a Buy Now flow
          clearCartIfNeeded();
        } catch (_e) {
          console.warn('Failed to clean up storage:', _e);
        }

        // Redirect based on user authentication status
        if (user && user.id) {
          router.push(`/orders/${finData.orderId}`);
        } else {
          navigateToThankYou(router);
        }
        return;
      }

      // If order wasn't created but payment is completed, try fallback creation from localStorage
      // This should rarely happen if backend is working correctly
      if (finData?.success && finData.canCreateOrder) {
        const snapshot = loadCheckoutFromStorage() || null;

        const cartItems = (
          snapshot && snapshot.cart && Array.isArray(snapshot.cart)
            ? snapshot.cart
            : []
        ) as any[];

        const subtotal = cartItems.reduce(
          (sum, it) =>
            sum + (Number(it.price) || 0) * (Number(it.quantity) || 0),
          0
        );

        const transport = 2000;
        const total = subtotal + transport;

        const derivedFullName =
          (snapshot?.formData?.firstName || '') +
          ' ' +
          (snapshot?.formData?.lastName || '');

        const [fName, ...lParts] = (derivedFullName || '').split(' ');
        const lName = lParts.join(' ');

        const itemsForOrder = cartItems.map((it: any) => ({
          product_id: it.product_id || it.id,
          product_variation_id: it.variation_id || undefined,
          product_name: it.name,
          product_sku: it.sku || undefined,
          variation_name: it.variation_name || undefined,
          price: it.price,
          quantity: it.quantity,
          total: it.price * it.quantity,
        }));

        const orderPayload = {
          order: {
            user_id: user?.id,
            subtotal,
            tax: transport,
            total,
            // Always provide email with fallback - prevents NOT NULL constraint error
            customer_email:
              (snapshot?.formData?.email || '').trim() ||
              `guest-${(snapshot?.formData?.phone || '').replace(/\D/g, '') || Date.now()}@nihemart.rw`,
            customer_first_name: (fName || '').trim(),
            customer_last_name: (lName || '').trim(),
            customer_phone: (snapshot?.formData?.phone || undefined) as any,
            delivery_address: (snapshot?.formData?.address || '') as any,
            delivery_city: (snapshot?.formData?.city || '') as any,
            status: 'pending',
            // Use actual payment method from payment record, not snapshot (fixes retry mode)
            payment_method:
              payment?.payment_method || (snapshot?.paymentMethod as any) || '',
            delivery_notes: (snapshot?.formData?.delivery_notes ||
              undefined) as any,
          },
          items: itemsForOrder,
        } as any;

        if (createOrder && typeof createOrder.mutate === 'function') {
          createOrder.mutate(orderPayload, {
            onSuccess: async (createdOrder: any) => {
              try {
                // Payment-order linking is handled automatically by the backend
                // when creating orders from payment sessions, so no manual linking needed

                try {
                  localStorage.removeItem('nihemart_checkout_v1');
                } catch (_e) {}
                try {
                  sessionStorage.removeItem('kpay_reference');
                } catch (_e) {}
                // Only clear cart if NOT a Buy Now flow
                clearCartIfNeeded();

                if (user && user.id) {
                  router.push(`/orders/${createdOrder.id}`);
                } else {
                  navigateToThankYou(router);
                }
              } catch (_err) {
                console.error(
                  'Error after creating order on payment page:',
                  _err
                );
                router.push('/');
              }
            },
            onError: (err: any) => {
              console.error('Auto-create order failed on payment page:', err);
              toast.error(
                'Failed to create order automatically. Please contact support with your payment reference.'
              );
            },
          });
        } else {
          toast.error(
            'Unable to create order automatically. Please return to checkout to complete your order.'
          );
          router.push(`/checkout?payment=success`);
        }
      }
    } catch (_e) {
      console.error('finalizeAndMaybeCreateOrder failed:', _e);
    }
  };

  // Fetch payment data
  const fetchPaymentData = async () => {
    // If paymentId is invalid, try to get reference from sessionStorage
    if (!paymentId) {
      try {
        const ref = sessionStorage.getItem('kpay_reference');
        if (ref && ref !== 'null' && ref !== 'undefined') {
          console.log(
            '[PaymentPage] No paymentId in URL, using reference from sessionStorage:',
            ref
          );
          // Redirect to the correct URL with the reference
          router.replace(`/payment/${ref}`);
          return;
        }
      } catch (_e) {
        console.error(
          '[PaymentPage] Failed to get reference from sessionStorage:',
          _e
        );
      }
      setError('Invalid payment ID. Please return to checkout and try again.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/payments/${paymentId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch payment data');
      }
      const data = await response.json();
      setPayment(data);

      // For card payments, if checkout URL is available and payment is pending/initiated, redirect immediately
      const isCardPayment =
        data.payment_method === 'visa_card' ||
        data.payment_method === 'mastercard' ||
        data.payment_method?.includes('card');

      const isPendingStatus =
        data.status === 'pending' || data.status === 'initiated';

      if (isCardPayment && data.checkout_url && isPendingStatus) {
        console.log(
          '[PaymentPage] Card payment detected, redirecting to KPay checkout:',
          data.checkout_url
        );
        // Store the reference so we can return to this page after payment
        try {
          if (data.reference) {
            sessionStorage.setItem('kpay_reference', data.reference);
          }
        } catch (_e) {
          console.warn('[PaymentPage] Failed to store reference:', _e);
        }
        // Redirect to KPay - they will redirect back to redirectUrl (which points to this page)
        window.location.href = data.checkout_url;
        return; // Don't continue processing, we're redirecting
      }

      // If returning from KPay and payment is completed, check if order exists
      // Check URL params for KPay return indicators
      const urlParams = new URLSearchParams(window.location.search);
      const isKPayReturn =
        urlParams.has('refid') ||
        urlParams.has('tid') ||
        urlParams.has('statusid');

      if (
        isKPayReturn &&
        (data.status === 'completed' || data.status === 'successful')
      ) {
        console.log(
          '[PaymentPage] Detected return from KPay with completed payment'
        );
        // Immediately check status to ensure we have latest data
        if (data.reference) {
          try {
            const statusResult = await checkPaymentStatus({
              reference: data.reference,
              transactionId: data.kpay_transaction_id,
            });

            if (
              statusResult.success &&
              (statusResult.status === 'completed' ||
                statusResult.status === 'successful')
            ) {
              // Payment is confirmed, check if order was created
              // Note: statusResult doesn't have orderId, we use data.order_id from payment data
              if (!data.order_id) {
                // Try to finalize and create order
                await finalizeAndMaybeCreateOrder(data.reference);
                return;
              } else {
                // Order exists, redirect based on user status
                const orderId = data.order_id;
                if (orderId) {
                  // Clean up storage before redirect
                  try {
                    localStorage.removeItem('nihemart_checkout_v1');
                    sessionStorage.removeItem('kpay_reference');
                    // Only clear cart if NOT a Buy Now flow
                    clearCartIfNeeded();
                  } catch (_e) {
                    console.warn('Failed to clean up storage:', _e);
                  }

                  // Redirect: authenticated users to order page, guests to thank-you page
                  if (user && user.id) {
                    router.push(`/orders/${orderId}`);
                  } else {
                    navigateToThankYou(router);
                  }
                  return;
                }
              }
            }
          } catch (_e) {
            console.error(
              '[PaymentPage] Failed to check status after KPay return:',
              _e
            );
          }
        }
      }

      if (data.status === 'completed' || data.status === 'successful') {
        setPaymentCompleted(true);
        // If payment is already completed and order exists, redirect immediately
        if (data.order_id) {
          // Clean up storage
          try {
            localStorage.removeItem('nihemart_checkout_v1');
          } catch (_e) {}
          try {
            sessionStorage.removeItem('kpay_reference');
          } catch (_e) {}
          // Only clear cart if NOT a Buy Now flow
          clearCartIfNeeded();

          // Redirect based on user authentication status
          if (user && user.id) {
            router.push(`/orders/${data.order_id}`);
          } else {
            navigateToThankYou(router);
          }
          return;
        }
        // If payment is already completed but no order exists yet, attempt finalize + auto-create
        if (!data.order_id) {
          try {
            await finalizeAndMaybeCreateOrder(data.reference);
            return;
          } catch (_e) {
            console.error('Failed to finalize on initial fetch:', _e);
          }
        }
      }
    } catch (_err) {
      setError(_err instanceof Error ? _err.message : 'Failed to load payment');
    } finally {
      setLoading(false);
    }
  };

  // Check payment status periodically (interval configured elsewhere)
  const checkStatus = async () => {
    if (!payment || paymentCompleted || loading) return;
    // CRITICAL: Stop polling immediately if timeout was reported or polling was stopped
    if (stoppedPolling || timeoutReportedRef.current) {
      // Clear any intervals if they're still running
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current as unknown as number);
        pollingIntervalRef.current = null;
      }
      return;
    }
    // Throttle: ensure at most one status check every 30s regardless of callers
    const now = Date.now();
    if (now - lastStatusCheckRef.current < 29500) return;
    lastStatusCheckRef.current = now;
    // Avoid making a status check if one is already in progress
    if (isCheckingStatus) return;

    // stop polling for terminal statuses
    if (
      payment.status === 'timeout' ||
      payment.status === 'failed' ||
      payment.status === 'cancelled'
    ) {
      setStoppedPolling(true);
      timeoutReportedRef.current = true;
      // Clear intervals immediately
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current as unknown as number);
        pollingIntervalRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current as unknown as number);
        countdownIntervalRef.current = null;
      }
      return;
    }

    try {
      const statusResult = await checkPaymentStatus({
        paymentId: payment.id,
        transactionId: payment.kpay_transaction_id,
        reference: payment.reference,
      });

      if (statusResult.success) {
        // Normalize statuses
        const s = statusResult.status;
        if (s === 'completed' || s === 'successful') {
          // If payment is successful, attempt to mark the order as paid on the server
          try {
            // best-effort: call the update-status endpoint to mark the order as paid
            // Only call update-status when we have an order id (order-based flow).
            const targetOrderId = safeOrderId || payment.order_id;
            if (targetOrderId) {
              await fetch('/api/orders/update-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: targetOrderId,
                  status: 'paid',
                  additionalFields: {
                    payment_reference: payment.reference,
                    kpay_transaction_id: payment.kpay_transaction_id,
                    payment_amount: payment.amount,
                  },
                }),
              });
            } else {
              // Session-based flow: there's no order to update yet. Ensure checkout does not re-initiate payment.
              // IMPORTANT: Do NOT remove the stored kpay_reference here.
              // The checkout page will read this reference after redirect and
              // perform the server-side linking when the user creates the
              // order. Removing it here causes the checkout to be unable
              // to link payments to newly created orders.
            }
          } catch (_err) {
            console.warn(
              'Failed to notify server about payment success:',
              _err
            );
          }

          // Stop further polling immediately
          setStoppedPolling(true);
          // clear any running intervals immediately
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current as unknown as number);
            pollingIntervalRef.current = null;
          }
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current as unknown as number);
            countdownIntervalRef.current = null;
          }
          setPaymentCompleted(true);
          setPayment(prev => (prev ? { ...prev, status: s } : null));
          toast.success('Payment completed successfully!');

          // Attempt to finalize and auto-create the order here so the
          // user does not get redirected back to the checkout page.
          // Use the helper function to avoid code duplication
          await finalizeAndMaybeCreateOrder(payment.reference);
          return;
        }
        if (s === 'failed' || s === 'cancelled') {
          setPayment(prev =>
            prev
              ? {
                  ...prev,
                  status: s,
                  failure_reason: statusResult.error,
                }
              : null
          );

          const errorMessage =
            statusResult.error || 'Payment failed or was cancelled';
          toast.error(errorMessage, { duration: 5000 });

          if (
            payment.payment_method === 'visa_card' ||
            payment.payment_method === 'mastercard'
          ) {
            toast.error(
              'Card payment failed. Please check your card details and try again.'
            );
          }

          // Return to checkout so user can retry or choose another method
          // Stop polling immediately and then redirect
          setStoppedPolling(true);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current as unknown as number);
            pollingIntervalRef.current = null;
          }
          setTimeout(() => {
            router.push(`/checkout?payment=failed`);
          }, 800);
          return;
        }

        // Update status only if it changed, to avoid unnecessary rerenders/interval resets
        if (payment && s && s !== payment.status) {
          setPayment(prev => (prev ? { ...prev, status: s } : null));
        }
      } else if (statusResult.error) {
        // Don't show errors if timeout was already reported or polling was stopped
        if (stoppedPolling || timeoutReportedRef.current) {
          return;
        }
        console.error('Payment status check error:', statusResult.error);
        // Increment status check count
        statusCheckCountRef.current++;
        const NOTICETHRESHOLD = 3; // Define the threshold
        // Inform user if checks are taking long
        if (statusCheckCountRef.current >= NOTICETHRESHOLD) {
          toast.info(
            "Payment is taking longer than usual. We'll keep checking for a bit longer...",
            { duration: 4000 }
          );
        }
      }
    } catch (_err) {
      // Don't show errors if timeout was already reported or polling was stopped
      if (stoppedPolling || timeoutReportedRef.current) {
        return;
      }
      console.error('Failed to check payment status:', _err);
      toast.error(
        'Having trouble checking payment status. Please refresh the page or try a different payment method.',
        { duration: 5000 }
      );
    }

    // Timeout handled by countdown; do nothing here.
    // Countdown-driven timeout handles termination; no per-check timeout here.
  }; // Removed extra closing brace

  // Check if we're returning from KPay (card payment redirect)
  useEffect(() => {
    // Check URL parameters that KPay might add when redirecting back
    const urlParams = new URLSearchParams(window.location.search);
    const kpayRef = urlParams.get('refid') || urlParams.get('reference');
    const kpayTid = urlParams.get('tid') || urlParams.get('transactionId');

    // If we have KPay parameters but paymentId is invalid, try to use the reference
    if ((kpayRef || kpayTid) && !paymentId) {
      const ref = kpayRef || sessionStorage.getItem('kpay_reference');
      if (ref && ref !== 'null' && ref !== 'undefined') {
        console.log(
          '[PaymentPage] Detected KPay return, using reference:',
          ref
        );
        router.replace(`/payment/${ref}`);
        return;
      }
    }

    // If we have a valid paymentId, fetch payment data
    if (paymentId) {
      fetchPaymentData();
    }
  }, [paymentId, router]);

  useEffect(() => {
    if (!payment || paymentCompleted || loading || stoppedPolling) return;

    // Set deadline once
    if (!deadlineRef.current) {
      deadlineRef.current = Date.now() + 5 * 60 * 1000; // 5 minutes
    }

    // Run an immediate check once, then poll every 30s
    checkStatus();

    // initialize remainingSeconds if null (5 minutes)
    setRemainingSeconds(s => (s === null ? 300 : s));

    // create polling interval and store id
    // NOTE: window.setInterval returns a number in browsers
    pollingIntervalRef.current = window.setInterval(() => {
      // Poll for status every 30s (countdown is handled separately every second)
      checkStatus();
    }, 30000) as unknown as number;

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current as unknown as number);
        pollingIntervalRef.current = null;
      }
    };
  }, [payment?.id, paymentCompleted, loading, stoppedPolling]);

  // Start a 1s countdown timer for UX
  useEffect(() => {
    // start countdown only when pending and not stopped
    if (!payment || paymentCompleted || loading || stoppedPolling) return;
    if (payment.status !== 'pending') return;

    // Ensure deadline exists
    if (!deadlineRef.current) {
      deadlineRef.current = Date.now() + 5 * 60 * 1000;
    }

    // Immediate compute
    setRemainingSeconds(() => {
      const d = deadlineRef.current!;
      return Math.max(0, Math.ceil((d - Date.now()) / 1000));
    });

    countdownIntervalRef.current = window.setInterval(() => {
      const d = deadlineRef.current!;
      const remaining = Math.max(0, Math.ceil((d - Date.now()) / 1000));
      setRemainingSeconds(remaining);

      if (remaining === 0 && !timeoutReportedRef.current) {
        timeoutReportedRef.current = true;
        // Stop polling and countdown
        setStoppedPolling(true);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current as unknown as number);
          pollingIntervalRef.current = null;
        }
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current as unknown as number);
          countdownIntervalRef.current = null;
        }
        // Ask server to record timeout and update UI
        (async () => {
          try {
            const resp = await fetch('/api/payments/timeout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                paymentId: payment.id,
                reason: 'Client-side timeout after 5 minutes',
              }),
            });
            const data = await resp.json();
            if (data?.status === 'completed' || data?.status === 'successful') {
              setPaymentCompleted(true);
              setPayment(prev =>
                prev ? { ...prev, status: data.status } : null
              );
              toast.success('Payment completed successfully!');
              router.push(`/checkout?payment=success`);
              return;
            }
            setPayment(prev =>
              prev
                ? {
                    ...prev,
                    status: 'timeout',
                    failure_reason:
                      'Payment took too long to process. You can try again or use a different payment method.',
                  }
                : null
            );
            toast.error(
              'Payment took too long to process. You can try again or use a different payment method.',
              { duration: 6000 }
            );
          } catch (_e) {
            console.error('Failed to record timeout:', _e);
          }
        })();
      }
    }, 1000) as unknown as number;

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current as unknown as number);
        countdownIntervalRef.current = null;
      }
    };
  }, [payment, paymentCompleted, loading, stoppedPolling]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current as unknown as number);
        pollingIntervalRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current as unknown as number);
        countdownIntervalRef.current = null;
      }
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'successful':
        return <CheckCircle className="h-12 w-12 text-green-500" />;
      case 'failed':
      case 'cancelled':
      case 'timeout':
        return <XCircle className="h-12 w-12 text-red-500" />;
      case 'pending':
        return <Clock className="h-12 w-12 text-orange-500 animate-pulse" />;
      default:
        return <AlertCircle className="h-12 w-12 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'successful':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'failed':
      case 'cancelled':
      case 'timeout':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'pending':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    if (
      method.includes('momo') ||
      method.includes('mtn') ||
      method.includes('airtel')
    ) {
      return <Smartphone className="h-5 w-5" />;
    }
    return <CreditCard className="h-5 w-5" />;
  };

  const getPaymentMethodName = (method: string) => {
    const names: Record<string, string> = {
      mtn_momo: 'MTN Mobile Money',
      airtel_money: 'Airtel Money',
      visa_card: 'Visa Card',
      mastercard: 'MasterCard',
      spenn: 'SPENN',
    };
    return names[method] || method.toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-2xl mx-auto">
            <Card className="border-0 shadow-xl">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
                <span className="text-gray-600 font-medium">
                  Loading payment details...
                </span>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-2xl mx-auto">
            <Card className="border-0 shadow-xl">
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <XCircle className="h-16 w-16 text-red-500" />
                </div>
                <CardTitle className="text-2xl text-red-600">
                  Payment Error
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="mb-6 text-gray-600">
                  {error || 'Payment not found'}
                </p>
                <Button
                  onClick={() => router.back()}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* Header with Logo */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <Image
              src={logo}
              alt="Logo"
              className="h-8 sm:h-10 w-auto"
              priority
            />
            <Badge variant="outline" className="text-xs sm:text-sm font-medium">
              Payment #{payment.reference.slice(-8)}
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-4 sm:py-8 px-3 sm:px-4 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Left Column - Main Status & Details */}
          <div className="space-y-4 sm:space-y-6">
            {/* Main Status Card */}
            <Card className="border-0 shadow-xl overflow-hidden">
              <div
                className={`${getStatusColor(
                  payment.status
                )} border-b py-6 sm:py-8`}
              >
                <div className="flex flex-col items-center text-center px-4 sm:px-6">
                  {getStatusIcon(payment.status)}
                  <h1 className="text-xl sm:text-2xl font-bold mt-3 sm:mt-4 mb-2">
                    {paymentCompleted
                      ? 'Payment Successful!'
                      : payment.status === 'pending'
                        ? 'Processing Payment'
                        : payment.status === 'failed'
                          ? 'Payment Failed'
                          : payment.status === 'timeout'
                            ? 'Payment Timeout'
                            : 'Payment Status'}
                  </h1>
                  <p className="text-xs sm:text-sm opacity-80 max-w-md px-2">
                    {paymentCompleted
                      ? "Your payment has been processed successfully! We're creating your order now."
                      : payment.status === 'pending'
                        ? 'Please wait patiently while we process your payment. Do not close this page.'
                        : payment.status === 'failed'
                          ? "We couldn't process your payment. Please try again or use a different method."
                          : payment.status === 'timeout'
                            ? 'Payment took too long to process. You can try again or use a different payment method.'
                            : 'Checking your payment status...'}
                  </p>
                </div>
              </div>

              {/* Amount Display */}
              <div className="bg-gradient-to-r from-blue-500 to-orange-500 text-white py-4 sm:py-6">
                <div className="text-center">
                  <p className="text-xs sm:text-sm opacity-90 mb-1">Amount</p>
                  <p className="text-3xl sm:text-4xl font-bold">
                    {payment.amount.toLocaleString()}{' '}
                    <span className="text-xl sm:text-2xl">
                      {payment.currency}
                    </span>
                  </p>
                </div>
              </div>

              {/* Payment Details */}
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg">
                    <span className="text-xs sm:text-sm text-gray-600 flex items-center flex-shrink-0">
                      {getPaymentMethodIcon(payment.payment_method)}
                      <span className="ml-2">Payment Method</span>
                    </span>
                    <span className="font-semibold text-gray-800 text-xs sm:text-sm text-right">
                      {getPaymentMethodName(payment.payment_method)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg">
                    <span className="text-xs sm:text-sm text-gray-600">
                      Status
                    </span>
                    <Badge
                      className={`${getStatusColor(payment.status)} text-xs`}
                    >
                      {payment.status.charAt(0).toUpperCase() +
                        payment.status.slice(1)}
                    </Badge>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-lg gap-1 sm:gap-2">
                    <span className="text-xs sm:text-sm text-gray-600 flex-shrink-0">
                      Reference
                    </span>
                    <span className="font-mono text-xs sm:text-sm font-semibold break-all">
                      {payment.reference}
                    </span>
                  </div>

                  {payment.kpay_transaction_id && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-lg gap-1 sm:gap-2">
                      <span className="text-xs sm:text-sm text-gray-600 flex-shrink-0">
                        Transaction ID
                      </span>
                      <span className="font-mono text-xs text-gray-700 break-all">
                        {payment.kpay_transaction_id}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg">
                    <span className="text-xs sm:text-sm text-gray-600">
                      Customer
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-right break-words max-w-[60%]">
                      {payment.customer_name}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-lg gap-1 sm:gap-2">
                    <span className="text-xs sm:text-sm text-gray-600">
                      Phone
                    </span>
                    <span className="text-xs sm:text-sm font-medium break-all">
                      {payment.customer_phone}
                    </span>
                  </div>
                </div>

                {/* Failure Reason */}
                {payment.failure_reason &&
                  (payment.status === 'failed' ||
                    payment.status === 'timeout') && (
                    <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-2 sm:gap-3">
                        <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs sm:text-sm font-semibold text-red-800 mb-1">
                            {payment.status === 'timeout'
                              ? 'Payment Timeout'
                              : 'Payment Failed'}
                          </p>
                          <p className="text-xs sm:text-sm text-red-700">
                            {payment.failure_reason}
                          </p>
                          <p className="text-xs text-red-600 mt-2">
                            {payment.status === 'timeout'
                              ? 'Your order is still pending. You can try the same payment method again or use a different one.'
                              : 'Please try again or contact support if the issue persists.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Instructions & Actions */}
          <div className="space-y-4 sm:space-y-6">
            {/* Instructions Card */}
            {payment.status === 'pending' && !paymentCompleted && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-orange-50 p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg flex items-center text-blue-700">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" />
                    Payment Instructions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  {payment.payment_method.includes('momo') ||
                  payment.payment_method.includes('mtn') ||
                  payment.payment_method.includes('airtel') ? (
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm">
                          1
                        </div>
                        <p className="ml-2 sm:ml-3 text-xs sm:text-sm text-gray-700">
                          Check your mobile phone{' '}
                          <span className="font-medium break-all">
                            ({payment.customer_phone})
                          </span>{' '}
                          for an SMS prompt
                        </p>
                      </div>
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm">
                          2
                        </div>
                        <p className="ml-2 sm:ml-3 text-xs sm:text-sm text-gray-700">
                          Enter your Mobile Money PIN to authorize the payment
                        </p>
                      </div>
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm">
                          3
                        </div>
                        <p className="ml-2 sm:ml-3 text-xs sm:text-sm text-gray-700">
                          Wait for confirmation - this page will update
                          automatically
                        </p>
                      </div>
                      <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs sm:text-sm text-blue-800">
                          <strong>💡 Tip:</strong> Keep this page open.
                          We&apos;ll automatically detect when your payment is
                          complete.
                        </p>
                      </div>
                    </div>
                  ) : payment.payment_method.includes('card') ||
                    payment.payment_method === 'visa_card' ||
                    payment.payment_method === 'mastercard' ? (
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm">
                          1
                        </div>
                        <p className="ml-2 sm:ml-3 text-xs sm:text-sm text-gray-700">
                          You&apos;ll be redirected to a secure payment gateway
                        </p>
                      </div>
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm">
                          2
                        </div>
                        <p className="ml-2 sm:ml-3 text-xs sm:text-sm text-gray-700">
                          Enter your card details securely
                        </p>
                      </div>
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm">
                          3
                        </div>
                        <p className="ml-2 sm:ml-3 text-xs sm:text-sm text-gray-700">
                          Return here to see your payment confirmation
                        </p>
                      </div>
                      <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-xs sm:text-sm text-green-800">
                          <strong>🔒 Secure:</strong> All card transactions are
                          encrypted and PCI-compliant.
                        </p>
                      </div>
                      <Button
                        onClick={() => window.location.reload()}
                        variant="outline"
                        className="w-full mt-3 sm:mt-4 border-green-300 text-green-700 hover:bg-green-50 text-xs sm:text-sm h-9 sm:h-10"
                      >
                        <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                        Refresh Payment Status
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs sm:text-sm text-gray-700">
                        Follow the instructions provided by your payment
                        provider to complete the transaction.
                      </p>
                      <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs sm:text-sm text-gray-700">
                          <strong>Note:</strong> This page will automatically
                          update when payment is confirmed.
                        </p>
                      </div>
                    </div>
                  )}

                  {isCheckingStatus && (
                    <div className="mt-3 sm:mt-4 flex items-center justify-center text-xs sm:text-sm text-gray-600 p-3 bg-white rounded-lg border">
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-2" />
                      Checking payment status...
                    </div>
                  )}

                  {/* Remaining time UI */}
                  {remainingSeconds !== null &&
                    remainingSeconds > 0 &&
                    payment.status === 'pending' &&
                    !paymentCompleted && (
                      <div className="mt-3 sm:mt-4 p-3 bg-white rounded-lg border text-xs text-gray-600 flex items-center justify-between">
                        <div>
                          <strong>Timeout in:</strong>{' '}
                          <span>
                            {(() => {
                              const s = remainingSeconds || 0;
                              const mm = Math.floor(s / 60)
                                .toString()
                                .padStart(2, '0');
                              const ss = (s % 60).toString().padStart(2, '0');
                              return `${mm}:${ss}`;
                            })()}
                          </span>
                        </div>
                      </div>
                    )}
                </CardContent>
              </Card>
            )}

            {/* Action Buttons - Only show for failed/timeout cases */}
            {(payment.status === 'failed' || payment.status === 'timeout') && (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-3">
                    <Button
                      onClick={() => {
                        // Build params safely to avoid adding orderId=null
                        const params = new URLSearchParams();
                        const oid = safeOrderId || payment.order_id;
                        if (oid) params.set('orderId', oid);
                        params.set('retry', 'true');
                        if (payment.status === 'timeout')
                          params.set('timedout', 'true');
                        const url = `/checkout?${params.toString()}`;
                        router.push(url);
                      }}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-xs sm:text-sm h-9 sm:h-11"
                    >
                      Try Different Method
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.location.reload()}
                      className="w-full border-gray-300 text-xs sm:text-sm h-9 sm:h-11"
                    >
                      <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                      {payment.status === 'timeout'
                        ? 'Try Again'
                        : 'Retry Payment'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Wait Message for Pending Payments */}
            {payment.status === 'pending' && !paymentCompleted && (
              <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-orange-50">
                <CardContent className="p-4 sm:p-6">
                  <div className="text-center space-y-3">
                    <div className="flex justify-center">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <Clock className="h-8 w-8 text-blue-600 animate-pulse" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-blue-800">
                      Please Wait Patiently
                    </h3>
                    <p className="text-sm text-blue-700">
                      Your payment is being processed securely. This page will
                      automatically update when your payment is confirmed.
                    </p>
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <p className="text-xs text-blue-600 font-medium">
                        ⏳ Do not close this page or navigate away
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Success Message for Completed Payments */}
            {paymentCompleted && (
              <Card className="border-0 shadow-lg bg-gradient-to-r from-green-50 to-emerald-50">
                <CardContent className="p-4 sm:p-6">
                  <div className="text-center space-y-3">
                    <div className="flex justify-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-green-800">
                      Payment Successful!
                    </h3>
                    <p className="text-sm text-green-700">
                      Your order is being created. You'll be redirected
                      automatically in a moment.
                    </p>
                    <div className="bg-white rounded-lg p-3 border border-green-200">
                      <p className="text-xs text-green-600 font-medium">
                        ✅ Please wait while we finalize your order
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

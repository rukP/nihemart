'use client';

import { useState, useCallback } from 'react';
import { navigateToThankYou } from '@/lib/navigation';
import { PAYMENTMETHODS } from '@/lib/services/kpay';

// ============================================================================
// CHECKOUT PAYMENT HOOK
// Manages payment state and handlers for checkout.
// ============================================================================

interface UseCheckoutPaymentProps {
  user: any;
  router: any;
  clearAllCheckoutClientState: () => void;
  clearBuyNowItem: () => void;
  isBuyNowFlow: boolean;
}

export function useCheckoutPayment({
  user,
  router,
  clearAllCheckoutClientState,
  clearBuyNowItem,
  isBuyNowFlow,
}: UseCheckoutPaymentProps) {
  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState<
    keyof typeof PAYMENTMETHODS | 'cash_on_delivery' | ''
  >('');
  const [mobileMoneyPhones, setMobileMoneyPhones] = useState<{
    mtn_momo?: string;
    airtel_money?: string;
  }>({});

  // Payment flow state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [paymentCheckoutUrl, setPaymentCheckoutUrl] = useState<string | null>(
    null
  );
  const [paymentVerified, setPaymentVerified] = useState<boolean>(false);
  const [previousPaymentMethod, setPreviousPaymentMethod] = useState<
    string | null
  >(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [suppressEmptyCartRedirect, setSuppressEmptyCartRedirect] =
    useState(false);
  const [paymentFailure, setPaymentFailure] = useState<{
    kind: 'timedout' | 'failed' | 'not_found';
    message?: string;
    reference?: string;
  } | null>(null);

  // Handle mobile money phone change
  const handleMobileMoneyPhoneChange = useCallback(
    (method: 'mtn_momo' | 'airtel_money', phoneNumber: string) => {
      setMobileMoneyPhones(prev => ({
        ...prev,
        [method]: phoneNumber,
      }));
    },
    []
  );

  // Handle payment success
  const handlePaymentSuccess = useCallback(
    (orderId: string) => {
      setPaymentModalOpen(false);
      setPaymentReference(null);
      setPaymentCheckoutUrl(null);
      setPaymentInProgress(false);
      setIsSubmitting(false);
      try {
        clearAllCheckoutClientState();
      } catch (_e) {
        // console.error('Failed to clear checkout state:', _e);
      }
      try {
        if (isBuyNowFlow && clearBuyNowItem) {
          clearBuyNowItem();
        }
      } catch (_e) {
        // console.error('Failed to clear buy now item:', _e);
      }
      setTimeout(() => {
        if (user && user.id) {
          router.push(`/orders/${orderId}`);
        } else {
          navigateToThankYou(router);
        }
      }, 300);
    },
    [user, router, clearAllCheckoutClientState, clearBuyNowItem, isBuyNowFlow]
  );

  // Handle payment modal close
  const handlePaymentModalClose = useCallback(() => {
    setPaymentModalOpen(false);
    setPaymentReference(null);
    setPaymentCheckoutUrl(null);
    setPaymentInProgress(false);
    setIsSubmitting(false);
  }, []);

  // Handle payment initiated
  const handlePaymentInitiated = useCallback(
    (paymentInfo: {
      reference: string | null;
      checkoutUrl: string | null;
      isCardPayment: boolean;
    }) => {
      setPaymentFailure(null);
      setPaymentReference(paymentInfo.reference);
      setPaymentCheckoutUrl(paymentInfo.checkoutUrl);
      setPaymentModalOpen(true);
    },
    []
  );

  return {
    // State
    paymentMethod,
    setPaymentMethod,
    mobileMoneyPhones,
    setMobileMoneyPhones,
    isSubmitting,
    setIsSubmitting,
    paymentInProgress,
    setPaymentInProgress,
    paymentModalOpen,
    setPaymentModalOpen,
    paymentReference,
    setPaymentReference,
    paymentCheckoutUrl,
    setPaymentCheckoutUrl,
    paymentVerified,
    setPaymentVerified,
    previousPaymentMethod,
    setPreviousPaymentMethod,
    isFinalizing,
    setIsFinalizing,
    suppressEmptyCartRedirect,
    setSuppressEmptyCartRedirect,
    paymentFailure,
    setPaymentFailure,

    // Handlers
    handleMobileMoneyPhoneChange,
    handlePaymentSuccess,
    handlePaymentModalClose,
    handlePaymentInitiated,
  };
}

export default useCheckoutPayment;

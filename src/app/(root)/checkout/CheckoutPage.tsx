'use client';

// ============================================================================
// CHECKOUT PAGE COMPONENT (Refactored)
//
// Structure:
// - HOOKS: useCheckoutStorage, useCheckoutLocationData, useOrdersEnabled,
//   useCheckoutAddressHandlers, useCheckoutPayment, useCheckoutTotals,
//   useCheckoutFlags, useSubmitOrder
// - COMPONENTS: AddressSection, DeliveryInstructionsSection, PaymentSection,
//   OrderItemsList, PriceSummary, SelectedAddressCard, ScheduleConfirmation,
//   CheckoutFooter, PaymentModal, DeleteAddressDialog, RetryBanner,
//   FinalizingBanner, EmptyCartView
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { useOrders } from '@/hooks/useOrders';
import { useCart } from '@/contexts/CartContext';
import { useBuyNow } from '@/contexts/BuyNowContext';
import { useAddresses } from '@/hooks/useAddresses';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { CreditCard, ChevronDown, ChevronRight } from 'lucide-react';

import sectorsFees from '@/lib/data/sectors_fees.json';

// Hooks
import useCheckoutStorage from '@/hooks/useCheckoutStorage';
import useCheckoutLocationData from '@/hooks/useCheckoutLocationData';
import useOrdersEnabled from '@/hooks/useOrdersEnabled';
import useCheckoutAddressHandlers from '@/hooks/useCheckoutAddressHandlers';
import useCheckoutPayment from '@/hooks/useCheckoutPayment';
import useCheckoutTotals from '@/hooks/useCheckoutTotals';
import useCheckoutFlags from '@/hooks/useCheckoutFlags';
import useSubmitOrder from '@/hooks/useSubmitOrder';
import { useKPayPayment } from '@/hooks/useKPayPayment';
import useGuestInfo from '@/hooks/useGuestInfo';

// Components
import CheckoutHeader from '@/components/checkout/CheckoutHeader';
import OrderItemsList from '@/components/checkout/OrderItemsList';
import PriceSummary from '@/components/checkout/PriceSummary';
import PaymentSection from '@/components/checkout/PaymentSection';
import CheckoutFooter from '@/components/checkout/CheckoutFooter';
import PaymentModal from '@/components/checkout/PaymentModal';
import { CheckoutSkeleton } from '@/components/checkout/CheckoutSkeleton';
import GuestCheckoutForm from '@/components/guest/GuestCheckoutForm';
import RetryBanner from '@/components/checkout/RetryBanner';
import FinalizingBanner from '@/components/checkout/FinalizingBanner';
import EmptyCartView from '@/components/checkout/EmptyCartView';
import AddressSection from '@/components/checkout/AddressSection';
import DeliveryInstructionsSection from '@/components/checkout/DeliveryInstructionsSection';
import ScheduleConfirmation from '@/components/checkout/ScheduleConfirmation';
import SelectedAddressCard from '@/components/checkout/SelectedAddressCard';
import DeleteAddressDialog from '@/components/checkout/DeleteAddressDialog';

// Utilities
import { validateCheckoutForm } from '@/lib/checkout/validation';
import {
  generateWhatsAppMessage,
  openWhatsAppCheckout,
} from '@/lib/checkout/whatsapp';

// ============================================================================

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sku?: string;
  variation_id?: string;
  variation_name?: string;
  product_id?: string;
}

const CheckoutPage = ({
  isRetryMode,
  retryOrderId,
}: {
  isRetryMode: boolean;
  retryOrderId: string | null;
}) => {
  const { t } = useLanguage();
  const { user, isLoggedIn } = useAuth();
  const { createOrder } = useOrders();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    address: '',
    city: '',
    phone: '',
    delivery_notes: '',
  });
  const [errors, setErrors] = useState<any>({});

  // Order items state
  const [orderItems, setOrderItems] = useState<CartItem[]>([]);
  const [isBuyNowFlow, setIsBuyNowFlow] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // UI state
  const [addressOpen, setAddressOpen] = useState(false);
  const [addNewOpen, setAddNewOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  // Context hooks
  const { items: cartItems, clearCart, removeItem } = useCart();
  const { item: buyNowItem, clearBuyNowItem } = useBuyNow();
  const {
    saved: savedAddresses,
    selected: selectedAddress,
    selectAddress,
    saveAddress,
    updateAddress,
    removeAddress,
    reloadSaved,
  } = useAddresses();

  // Storage hook
  const {
    loadCheckoutFromStorage,
    saveCheckoutToStorage,
    clearCheckoutStorage,
    clearAllCheckoutClientState,
    preventPersistenceRef,
  } = useCheckoutStorage();

  // Location data hook
  const {
    provinces,
    districts,
    sectors,
    selectedProvince,
    selectedDistrict,
    selectedSector,
    setSelectedProvince,
    setSelectedDistrict,
    setSelectedSector,
  } = useCheckoutLocationData();

  // Orders enabled hook
  const {
    ordersEnabled,
    ordersSource,
    ordersDisabledMessage,
    scheduleConfirmChecked,
    setScheduleConfirmChecked,
    scheduleNotes,
    setScheduleNotes,
  } = useOrdersEnabled();

  // Address handlers hook
  const addressHandlers = useCheckoutAddressHandlers({
    isLoggedIn,
    sectors,
    districts,
    setSelectedProvince,
    setSelectedDistrict,
    setSelectedSector,
    selectedProvince,
    selectedDistrict,
    selectedSector,
    setFormData,
    setAddNewOpen,
    setAddressOpen,
    removeAddress,
    reloadSaved,
    selectedAddress,
    selectAddress,
    t,
  });

  // Payment hook
  const payment = useCheckoutPayment({
    user,
    router,
    clearAllCheckoutClientState,
    clearBuyNowItem,
    isBuyNowFlow,
  });

  // Payment API hooks
  const {
    initiatePayment,
    formatPhoneNumber,
    validatePaymentRequest,
    isInitiating,
  } = useKPayPayment();
  const { formatPhoneInput: guestFormatPhoneInput } = useGuestInfo();

  // Retry mode values
  const fallbackParams =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : null;
  const effectiveIsRetry =
    isRetryMode ||
    searchParams?.get('retry') === 'true' ||
    fallbackParams?.get('retry') === 'true';
  const _rawOrderId =
    retryOrderId ??
    searchParams?.get('orderId') ??
    fallbackParams?.get('orderId') ??
    null;
  const effectiveRetryOrderId =
    _rawOrderId && _rawOrderId !== 'null' && _rawOrderId !== 'undefined'
      ? _rawOrderId
      : null;

  // Derive city from location
  const deriveCity = useCallback(() => {
    if (selectedSector) {
      const s = sectors.find(
        (x: any) => String(x.sct_id) === String(selectedSector)
      );
      if (s?.sct_name) return s.sct_name;
    }
    if (selectedDistrict) {
      const d = districts.find(
        (x: any) => String(x.dst_id) === String(selectedDistrict)
      );
      if (d?.dst_name) return d.dst_name;
    }
    if (selectedProvince) {
      const p = provinces.find(
        (x: any) => String(x.prv_id) === String(selectedProvince)
      );
      if (p?.prv_name) return p.prv_name;
    }
    return (
      addressHandlers.effectiveAddress?.city || formData.city?.trim() || ''
    );
  }, [
    selectedSector,
    selectedDistrict,
    selectedProvince,
    sectors,
    districts,
    provinces,
    addressHandlers.effectiveAddress,
    formData.city,
  ]);

  // Price calculations
  const { subtotal, transport, total } = useCheckoutTotals({
    orderItems,
    sectors,
    sectorsFees,
    selectedAddress: addressHandlers.effectiveAddress,
    selectedSector,
    hasAddress: Boolean(
      addressHandlers.effectiveAddress?.display_name ||
      addressHandlers.effectiveAddress?.city ||
      formData.address?.trim()
    ),
  });

  // Validation flags
  const {
    hasItems,
    isKigali,
    isExplicitNonKigaliLocation,
    hasAddress,
    hasEmail,
    hasValidPhone,
    missingSteps,
  } = useCheckoutFlags({
    orderItemsCount: orderItems.length,
    selectedAddress: addressHandlers.effectiveAddress,
    formData,
    selectedProvince,
    provinces,
    selectedSector,
    sectors,
    formatPhoneNumber,
    paymentMethod: payment.paymentMethod as any,
    paymentVerified: payment.paymentVerified,
    effectiveIsRetry,
    ordersEnabled,
    ordersSource,
    scheduleConfirmChecked,
  });

  // Form validation
  const validateForm = useCallback(
    () =>
      validateCheckoutForm({
        formData,
        selectedAddress: addressHandlers.effectiveAddress,
        isLoggedIn,
        t,
      }),
    [formData, addressHandlers.effectiveAddress, isLoggedIn, t]
  );

  // Phone change handler
  const handleGuestPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = guestFormatPhoneInput(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
    if (errors?.phone)
      setErrors((prev: any) => ({ ...prev, phone: undefined }));
  };

  // Order submission
  const handleCreateOrder = useSubmitOrder({
    isSubmitting: payment.isSubmitting,
    setPaymentFailure: payment.setPaymentFailure,
    validateForm,
    orderItems,
    t,
    toast,
    setIsSubmitting: payment.setIsSubmitting,
    setErrors,
    ordersEnabled,
    ordersSource,
    scheduleConfirmChecked,
    deriveCity,
    user,
    formData,
    subtotal,
    transport,
    total,
    createOrder,
    setSuppressEmptyCartRedirect: payment.setSuppressEmptyCartRedirect,
    setPreventPersistence: (val: boolean) => {
      preventPersistenceRef.current = val;
    },
    clearCart,
    setOrderItems,
    clearAllCheckoutClientState,
    router,
    setPaymentInProgress: payment.setPaymentInProgress,
    mobileMoneyPhones: payment.mobileMoneyPhones,
    initiatePayment,
    formatPhoneNumber,
    validatePaymentRequest,
    paymentVerified: payment.paymentVerified,
    selectedAddress: addressHandlers.effectiveAddress,
    clearBuyNowItem,
    isBuyNowFlow,
    scheduleNotes,
    ordersDisabledMessage,
    paymentMethod: payment.paymentMethod,
    effectiveIsRetry,
    effectiveRetryOrderId,
    onPaymentInitiated: payment.handlePaymentInitiated,
  });

  // WhatsApp checkout
  const handleWhatsAppCheckout = () => {
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }
    if (orderItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    if (ordersEnabled === false && ordersSource === 'admin') {
      toast.error(
        ordersDisabledMessage ||
          t('checkout.ordersDisabledMessage') ||
          'Ordering is currently disabled.'
      );
      return;
    }
    if (
      ordersEnabled === false &&
      ordersSource === 'schedule' &&
      !scheduleConfirmChecked
    ) {
      toast.info(
        t('checkout.confirmScheduleDelivery') ||
          'Please confirm schedule delivery.'
      );
      return;
    }
    openWhatsAppCheckout(
      generateWhatsAppMessage({
        orderItems,
        formData,
        derivedCity: deriveCity(),
        subtotal,
        transport,
        total,
        ordersEnabled,
        ordersSource,
        scheduleNotes,
      })
    );
  };

  // EFFECTS

  // Load temp address for guests
  useEffect(() => {
    addressHandlers.loadTempAddress();
  }, [isLoggedIn]);

  // Auto-fill city
  useEffect(() => {
    const addr = (
      addressHandlers.effectiveAddress?.street ||
      formData.address ||
      ''
    ).trim();
    if (!addr || formData.city?.trim()) return;
    const parts = addr
      .split(',')
      .map((p: string) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      setFormData(prev => ({ ...prev, city: parts[parts.length - 2] }));
    } else if (/kigali/i.test(addr)) {
      setFormData(prev => ({ ...prev, city: 'Kigali' }));
    }
  }, [formData.address, addressHandlers.effectiveAddress]);

  // Restore persisted state
  useEffect(() => {
    const persisted = loadCheckoutFromStorage();
    if (!persisted || effectiveIsRetry) return;
    if (persisted.formData) {
      const incoming = { ...persisted.formData } as any;
      if (!incoming.fullName && (incoming.firstName || incoming.lastName)) {
        incoming.fullName =
          `${incoming.firstName || ''} ${incoming.lastName || ''}`.trim();
      }
      setFormData(prev => ({ ...prev, ...incoming }));
    }
    if (persisted.paymentMethod)
      payment.setPaymentMethod(persisted.paymentMethod as any);
    if (persisted.mobileMoneyPhones)
      payment.setMobileMoneyPhones(persisted.mobileMoneyPhones);
    if (!orderItems.length && persisted.cart) setOrderItems(persisted.cart);
  }, []);

  // Persist state
  useEffect(() => {
    if (preventPersistenceRef.current) return;
    const id = setTimeout(
      () =>
        saveCheckoutToStorage({
          formData,
          paymentMethod: payment.paymentMethod,
          mobileMoneyPhones: payment.mobileMoneyPhones,
          cart: orderItems,
          isBuyNowFlow,
        }),
      250
    );
    return () => clearTimeout(id);
  }, [
    formData,
    payment.paymentMethod,
    payment.mobileMoneyPhones,
    orderItems,
    isBuyNowFlow,
  ]);

  // KPay return detection
  useEffect(() => {
    if (payment.paymentModalOpen) return;
    const urlParams = new URLSearchParams(window.location.search);
    const kpayRef = urlParams.get('refid') || urlParams.get('reference');
    const kpayTid = urlParams.get('tid') || urlParams.get('transactionId');
    const paymentReturn = urlParams.get('payment') === 'return';
    if (
      (kpayRef || kpayTid || paymentReturn) &&
      (urlParams.get('reference') || kpayRef)
    ) {
      const ref =
        urlParams.get('reference') ||
        kpayRef ||
        sessionStorage.getItem('kpay_reference');
      if (ref && ref !== 'null' && ref !== 'undefined') {
        payment.setPaymentReference(ref);
        payment.setPaymentModalOpen(true);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [payment.paymentModalOpen]);

  // Payment success return
  useEffect(() => {
    const p =
      searchParams?.get('payment') ||
      new URLSearchParams(window.location.search).get('payment');
    const oid =
      searchParams?.get('orderId') ||
      new URLSearchParams(window.location.search).get('orderId');
    if (p === 'success' && oid) {
      (async () => {
        const resp = await fetch(`/api/payments/order/${oid}`);
        if (!resp.ok) {
          payment.setPaymentVerified(false);
          return;
        }
        const payments = await resp.json();
        const ok =
          Array.isArray(payments) &&
          payments.some(
            (x: any) => x.status === 'completed' || x.status === 'successful'
          );
        payment.setPaymentVerified(!!ok);
        if (ok) {
          toast.success('Payment completed successfully.');
          payment.setPaymentFailure(null);
          clearCheckoutStorage();
        } else {
          toast.error('Payment returned but not verified.');
          payment.setPaymentFailure({ kind: 'not_found' });
        }
      })();
    }
    if (p === 'success' && !oid) {
      toast.success('Payment completed.');
      payment.setPaymentVerified(true);
    }
  }, [searchParams]);

  // Cart sync
  useEffect(() => {
    if (effectiveIsRetry) {
      const persisted = loadCheckoutFromStorage();
      if (persisted?.cart) setOrderItems(persisted.cart);
      if (persisted?.formData)
        setFormData(prev => ({ ...prev, ...persisted.formData }));
      payment.setPaymentMethod('');
      payment.setMobileMoneyPhones({});
      clearCheckoutStorage();
      if (effectiveRetryOrderId) {
        (async () => {
          const resp = await fetch(
            `/api/payments/order/${effectiveRetryOrderId}`
          );
          if (resp.ok) {
            const payments = await resp.json();
            const failed = payments
              ?.filter((x: any) =>
                ['failed', 'cancelled', 'timeout'].includes(x.status)
              )
              .sort(
                (a: any, b: any) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
              )[0];
            if (failed) payment.setPreviousPaymentMethod(failed.payment_method);
          }
        })();
      }
      return;
    }
    if (Array.isArray(cartItems)) {
      setOrderItems(
        cartItems.map((item: any) => ({
          ...item,
          id: String(item.id).replace(/-$/, ''),
          variation_id: String(
            item.product_variation_id || item.variation_id || ''
          ).replace(/-$/, ''),
        }))
      );
      setIsBuyNowFlow(false);
    }
    if (user && !effectiveIsRetry)
      setFormData(prev => ({
        ...prev,
        email: user.email || '',
        fullName: user.user_metadata?.full_name || '',
      }));
  }, [cartItems, user, effectiveIsRetry, effectiveRetryOrderId]);

  // Buy-now sync
  useEffect(() => {
    if (buyNowItem) {
      setOrderItems([
        {
          id: buyNowItem.id,
          product_id: buyNowItem.product_id,
          name: buyNowItem.name,
          price: buyNowItem.price,
          quantity: buyNowItem.quantity || 1,
          variation_name: buyNowItem.variant,
          image: buyNowItem.image,
        } as any,
      ]);
      setIsBuyNowFlow(true);
    } else if (cartItems?.length) {
      setOrderItems(
        cartItems.map((item: any) => ({
          ...item,
          id: String(item.id).replace(/-$/, ''),
        }))
      );
      setIsBuyNowFlow(false);
    }
    setIsLoading(false);
  }, [buyNowItem, cartItems]);

  // Auto-select address
  useEffect(() => {
    if (!savedAddresses?.length || selectedAddress) return;
    if (
      localStorage.getItem('nihemart_explicit_unselect_address_v1') === 'true'
    )
      return;
    const pick =
      savedAddresses.find((a: any) => a.is_default) || savedAddresses[0];
    if (pick) {
      selectAddress(pick.id);
      setFormData(prev => ({
        ...prev,
        address: pick.display_name || prev.address,
        city: pick.city || prev.city,
        phone: pick.phone || prev.phone,
      }));
      const sector = sectors.find((s: any) =>
        [pick.street, pick.display_name, pick.city].includes(s.sct_name)
      );
      if (sector) {
        setSelectedSector(sector.sct_id);
        setSelectedDistrict(sector.sct_district);
        const dist = districts.find(
          (d: any) => d.dst_id === sector.sct_district
        );
        if (dist) setSelectedProvince(dist.dst_province);
      }
    }
  }, [savedAddresses, selectedAddress, sectors, districts]);

  // Empty cart redirect
  useEffect(() => {
    if (
      orderItems.length === 0 &&
      !isRetryMode &&
      !payment.isSubmitting &&
      !isInitiating &&
      !payment.paymentInProgress &&
      !payment.suppressEmptyCartRedirect
    ) {
      const timer = setTimeout(() => router.push('/'), 3000);
      return () => clearTimeout(timer);
    }
  }, [
    orderItems.length,
    isRetryMode,
    payment.isSubmitting,
    isInitiating,
    payment.paymentInProgress,
    payment.suppressEmptyCartRedirect,
  ]);

  // RENDER

  if (isLoading) return <CheckoutSkeleton />;
  if (orderItems.length === 0 && !isRetryMode)
    return <EmptyCartView t={t} onContinueShopping={() => router.push('/')} />;

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-[90vw]">
      <CheckoutHeader
        title={
          isRetryMode
            ? 'Retry Payment with Different Method'
            : t('checkout.title')
        }
        missingSteps={missingSteps}
        t={t}
        isRetryMode={isRetryMode}
        previousPaymentMethod={payment.previousPaymentMethod}
      />
      <FinalizingBanner isFinalizing={payment.isFinalizing} />
      <RetryBanner
        isRetryMode={isRetryMode}
        total={total}
        previousPaymentMethod={payment.previousPaymentMethod}
        loadCheckoutFromStorage={loadCheckoutFromStorage}
      />

      <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
        <div className="space-y-5 sm:space-y-7">
          <AddressSection
            t={t}
            isLoggedIn={isLoggedIn}
            addNewOpen={addNewOpen}
            setAddNewOpen={setAddNewOpen}
            addressOpen={addressOpen}
            setAddressOpen={setAddressOpen}
            savedAddresses={savedAddresses || []}
            tempCheckoutAddress={addressHandlers.tempCheckoutAddress}
            effectiveAddress={addressHandlers.effectiveAddress}
            selectedAddress={selectedAddress}
            provinces={provinces}
            districts={districts}
            sectors={sectors}
            selectedProvince={selectedProvince}
            setSelectedProvince={setSelectedProvince}
            selectedDistrict={selectedDistrict}
            setSelectedDistrict={setSelectedDistrict}
            selectedSector={selectedSector}
            setSelectedSector={setSelectedSector}
            houseNumber={addressHandlers.houseNumber}
            setHouseNumber={addressHandlers.setHouseNumber}
            phoneInput={addressHandlers.phoneInput}
            setPhoneInput={addressHandlers.setPhoneInput}
            editingAddressId={addressHandlers.editingAddressId}
            setEditingAddressId={addressHandlers.setEditingAddressId}
            selectAddress={selectAddress}
            saveAddress={saveAddress}
            updateAddress={updateAddress}
            reloadSaved={reloadSaved}
            setFormData={setFormData}
            setTempCheckoutAddress={addressHandlers.setTempCheckoutAddress}
            handleUseAddressDirectly={addressHandlers.handleUseAddressDirectly}
            handleUpdateTempAddress={addressHandlers.handleUpdateTempAddress}
            handleEditAddressInCheckout={
              addressHandlers.handleEditAddressInCheckout
            }
            handleDeleteAddressInCheckout={
              addressHandlers.handleDeleteAddressInCheckout
            }
            onNavigateToAddresses={() => router.push('/addresses')}
            onNextStep={() => setAddressOpen(false)}
          />

          {!isLoggedIn && (
            <div className="space-y-4 sm:space-y-5 border border-gray-200 rounded-xl p-4 sm:p-5 bg-gradient-to-b from-blue-50 to-white shadow-sm">
              <GuestCheckoutForm
                formData={formData}
                setFormData={setFormData}
                errors={errors}
                onPhoneChange={handleGuestPhoneChange}
                phoneValue={formData.phone}
              />
            </div>
          )}

          <DeliveryInstructionsSection
            t={t}
            deliveryNotes={formData.delivery_notes || ''}
            onDeliveryNotesChange={notes =>
              setFormData(prev => ({ ...prev, delivery_notes: notes }))
            }
          />

          {!isExplicitNonKigaliLocation && (
            <div className="space-y-4 sm:space-y-5 border border-gray-200 rounded-xl p-4 sm:p-5 bg-gradient-to-b from-gray-50 to-white shadow-sm">
              <Collapsible open={paymentOpen} onOpenChange={setPaymentOpen}>
                <CollapsibleTrigger asChild>
                  <button className="w-full text-left p-0 flex items-center justify-between text-gray-700 hover:text-orange-600 transition-colors group">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                        <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                      </div>
                      <span className="text-base sm:text-lg font-semibold text-gray-900">
                        {t('checkout.paymentMethod')}
                      </span>
                    </div>
                    {paymentOpen ? (
                      <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 sm:mt-5">
                  <PaymentSection
                    paymentMethod={payment.paymentMethod}
                    setPaymentMethod={payment.setPaymentMethod}
                    handleMobileMoneyPhoneChange={
                      payment.handleMobileMoneyPhoneChange
                    }
                    mobileMoneyPhones={payment.mobileMoneyPhones}
                    disabled={payment.isSubmitting || isInitiating}
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-4">
          <Card className="border border-gray-200 shadow-sm w-full max-w-full overflow-hidden">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg font-medium text-gray-900">
                {t('checkout.orderSummary')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <OrderItemsList
                orderItems={orderItems}
                onRemove={it => {
                  if (isBuyNowFlow) {
                    clearBuyNowItem();
                    setOrderItems([]);
                    router.push(
                      (it as any).product_id
                        ? `/products/${(it as any).product_id}`
                        : '/'
                    );
                  } else {
                    removeItem((it as any).id);
                    setOrderItems(prev => prev.filter(x => x.id !== it.id));
                  }
                }}
              />
              <Separator className="my-3 sm:my-4" />
              <PriceSummary
                subtotal={subtotal}
                transport={transport}
                total={total}
                t={t}
              />
              <div className="space-y-2 sm:space-y-3 pt-3 sm:pt-4">
                {addressHandlers.effectiveAddress && (
                  <SelectedAddressCard
                    t={t}
                    selectedAddress={addressHandlers.effectiveAddress}
                    isLoggedIn={isLoggedIn}
                    onEdit={() => setAddressOpen(true)}
                  />
                )}
                {ordersEnabled === false && ordersSource === 'schedule' && (
                  <ScheduleConfirmation
                    t={t}
                    scheduleConfirmChecked={scheduleConfirmChecked}
                    onScheduleConfirmChange={setScheduleConfirmChecked}
                    scheduleNotes={scheduleNotes}
                    onScheduleNotesChange={setScheduleNotes}
                  />
                )}
                <div className="pt-1">
                  <CheckoutFooter
                    isKigali={isKigali}
                    isExplicitNonKigaliLocation={isExplicitNonKigaliLocation}
                    isLoggedIn={isLoggedIn}
                    isSubmitting={payment.isSubmitting}
                    isInitiating={isInitiating}
                    hasItems={hasItems}
                    hasAddress={hasAddress}
                    hasEmail={hasEmail}
                    hasValidPhone={hasValidPhone}
                    paymentMethod={payment.paymentMethod}
                    ordersEnabled={ordersEnabled}
                    ordersSource={ordersSource}
                    scheduleConfirmChecked={scheduleConfirmChecked}
                    missingSteps={missingSteps}
                    t={t}
                    onLoginClick={() =>
                      router.push(
                        `/signin?redirect=${encodeURIComponent('/checkout')}`
                      )
                    }
                    onOrderNowClick={handleCreateOrder}
                    onWhatsAppClick={handleWhatsAppCheckout}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <PaymentModal
        key={payment.paymentReference || 'payment-modal'}
        open={payment.paymentModalOpen}
        onOpenChange={payment.setPaymentModalOpen}
        paymentReference={payment.paymentReference}
        checkoutUrl={payment.paymentCheckoutUrl}
        onSuccess={payment.handlePaymentSuccess}
        onClose={payment.handlePaymentModalClose}
      />
      <DeleteAddressDialog
        open={addressHandlers.deleteConfirmOpen}
        onOpenChange={addressHandlers.setDeleteConfirmOpen}
        addressToDelete={addressHandlers.addressToDelete}
        onConfirm={addressHandlers.handleConfirmDelete}
        onCancel={() => addressHandlers.setAddressToDelete(null)}
      />
    </div>
  );
};

export default CheckoutPage;

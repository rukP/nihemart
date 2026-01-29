"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
   Loader2,
   CheckCircle2,
   XCircle,
   Clock,
   CreditCard,
   Smartphone,
   AlertCircle,
   RefreshCw,
   ExternalLink,
   Shield,
   Sparkles,
} from "lucide-react";
import { useKPayPayment } from "@/hooks/useKPayPayment";
import { useAuth } from "@/hooks/useAuth";
import { useOrders } from "@/hooks/useOrders";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import Image from "next/image";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

interface PaymentData {
   id: string;
   order_id: string | null;
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

interface PaymentModalProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   paymentReference: string | null;
   checkoutUrl?: string | null;
   onSuccess: (orderId: string) => void;
   onClose: () => void;
}

type PaymentStep =
   | "initiating"
   | "pending"
   | "processing"
   | "completed"
   | "failed"
   | "timeout";

export default function PaymentModal({
   open,
   onOpenChange,
   paymentReference,
   checkoutUrl,
   onSuccess,
   onClose,
}: PaymentModalProps) {
   const router = useRouter();
   const searchParams = useSearchParams(); // Hook called at top level
   const { checkPaymentStatus, isCheckingStatus } = useKPayPayment();
   const { user } = useAuth();
   const { createOrder } = useOrders();
   const { clearCart } = useCart();

   const [payment, setPayment] = useState<PaymentData | null>(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [paymentCompleted, setPaymentCompleted] = useState(false);
   const [orderCreating, setOrderCreating] = useState(false);
   const [stoppedPolling, setStoppedPolling] = useState(false);
   const [remainingSeconds, setRemainingSeconds] = useState<number | null>(300);
   const [currentStep, setCurrentStep] = useState<PaymentStep>("initiating");
   const timeoutReportedRef = useRef(false);
   const pollingIntervalRef = useRef<number | null>(null);
   const lastStatusCheckRef = useRef<number>(0);
   const countdownIntervalRef = useRef<number | null>(null);
   const deadlineRef = useRef<number | null>(null);
   const statusCheckCountRef = useRef(0);
   const orderCreatedRef = useRef(false); // Prevent duplicate order creation

   // Helper: finalize payment and create order if needed
   const finalizeAndCreateOrder = async (ref: string | undefined) => {
      if (!ref || orderCreatedRef.current) {
         console.log(
            "[PaymentModal] Skipping order creation - already created or no reference",
         );
         return;
      }

      setOrderCreating(true);
      try {
         const finResp = await fetch(`/api/payments/kpay/finalize`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reference: ref }),
         });

         if (!finResp.ok) {
            const errorData = await finResp.json().catch(() => ({}));
            console.error("[PaymentModal] Finalize failed:", errorData);

            // Try fallback order creation only if finalize failed
            await tryFallbackOrderCreation(ref);
            return;
         }

         const finData = await finResp.json();

         // Backend's checkPaymentStatus should have created the order if payment was successful
         if (finData?.success && finData.orderId) {
            orderCreatedRef.current = true;

            // Clean up storage
            cleanupStorage();

            // Small delay for better UX
            await new Promise((resolve) => setTimeout(resolve, 500));

            // Call success callback
            onSuccess(finData.orderId);
            return;
         }

         // If order wasn't created but payment is completed, try fallback
         if (finData?.success && finData.canCreateOrder) {
            await tryFallbackOrderCreation(ref);
         }
      } catch (e) {
         console.error("[PaymentModal] Finalize error:", e);
         toast.error("Failed to finalize payment. Please contact support.");
         await tryFallbackOrderCreation(ref);
      } finally {
         setOrderCreating(false);
      }
   };

   // Fallback order creation from localStorage snapshot
   const tryFallbackOrderCreation = async (ref: string) => {
      if (orderCreatedRef.current) return;

      const snapshot = loadCheckoutSnapshot();
      if (!snapshot || !snapshot.items || snapshot.items.length === 0) {
         console.warn(
            "[PaymentModal] No checkout snapshot available for fallback order creation",
         );
         toast.error(
            "Payment completed but order creation failed. Please contact support with reference: " +
               ref,
         );
         return;
      }

      try {
         const { items: itemsForOrder, formData, paymentMethod } = snapshot;
         const subtotal = itemsForOrder.reduce(
            (sum: number, item: any) => sum + item.price * item.quantity,
            0,
         );
         const transport = snapshot.transport || 0;
         const total = subtotal + transport;

         const fName = formData?.fullName?.split(" ")[0] || "";
         const lName = formData?.fullName?.split(" ").slice(1).join(" ") || "";

         const orderPayload = {
            order: {
               user_id: user?.id,
               subtotal,
               tax: transport,
               total,
               customer_email:
                  (formData?.email || "").trim() ||
                  `guest-${
                     (formData?.phone || "").replace(/\D/g, "") || Date.now()
                  }@nihemart.rw`,
               customer_first_name: (fName || "").trim(),
               customer_last_name: (lName || "").trim(),
               customer_phone: (formData?.phone || undefined) as any,
               delivery_address: (formData?.address || "") as any,
               delivery_city: (formData?.city || "") as any,
               status: "pending",
               payment_method:
                  payment?.payment_method || (paymentMethod as any) || "",
               delivery_notes: (formData?.delivery_notes || undefined) as any,
            },
            items: itemsForOrder,
         } as any;

         if (createOrder && typeof createOrder.mutate === "function") {
            createOrder.mutate(orderPayload, {
               onSuccess: async (createdOrder: any) => {
                  orderCreatedRef.current = true;
                  cleanupStorage();
                  await new Promise((resolve) => setTimeout(resolve, 500));
                  onSuccess(createdOrder.id);
               },
               onError: (err: any) => {
                  console.error("Fallback order creation failed:", err);
                  toast.error(
                     "Payment completed but order creation failed. Please contact support with reference: " +
                        ref,
                  );
               },
            });
         }
      } catch (e) {
         console.error("[PaymentModal] Fallback order creation error:", e);
         toast.error(
            "Failed to create order. Please contact support with reference: " +
               ref,
         );
      }
   };

   const cleanupStorage = () => {
      // Load snapshot to check if this is a Buy Now flow
      const snapshot = loadCheckoutSnapshot();
      const isBuyNowFlow = snapshot?.isBuyNowFlow || false;

      try {
         localStorage.removeItem("nihemart_checkout_v1");
      } catch (e) {}
      try {
         sessionStorage.removeItem("kpay_reference");
      } catch (e) {}

      // CRITICAL: Only clear cart if this is NOT a Buy Now order
      // Buy Now orders must preserve the cart
      try {
         if (!isBuyNowFlow) {
            clearCart();
            console.log("[PaymentModal] Cart cleared (cart order)");
         } else {
            console.log("[PaymentModal] Cart preserved (Buy Now order)");
         }
      } catch (e) {
         console.error("[PaymentModal] Failed to handle cart:", e);
      }
   };

   const loadCheckoutSnapshot = () => {
      try {
         if (typeof window === "undefined") return null;
         const raw = localStorage.getItem("nihemart_checkout_v1");
         if (!raw) return null;
         return JSON.parse(raw);
      } catch (err) {
         console.warn("Failed to load checkout snapshot:", err);
         return null;
      }
   };

   // Fetch payment data
   const fetchPaymentData = async () => {
      if (!paymentReference) {
         setError(
            "Invalid payment reference. Please return to checkout and try again.",
         );
         setLoading(false);
         setCurrentStep("failed");
         return;
      }

      try {
         const response = await fetch(`/api/payments/${paymentReference}`);
         if (!response.ok) {
            throw new Error("Failed to fetch payment data");
         }
         const data = await response.json();
         setPayment(data);

         // Update step based on status
         if (data.status === "completed" || data.status === "successful") {
            setCurrentStep("completed");
            setPaymentCompleted(true);
            if (!data.order_id) {
               await finalizeAndCreateOrder(data.reference);
            } else {
               orderCreatedRef.current = true;
               cleanupStorage();
               await new Promise((resolve) => setTimeout(resolve, 500));
               onSuccess(data.order_id);
            }
            return;
         }

         if (data.status === "failed" || data.status === "cancelled") {
            setCurrentStep("failed");
            setStoppedPolling(true);
            return;
         }

         if (data.status === "timeout") {
            setCurrentStep("timeout");
            setStoppedPolling(true);
            return;
         }

         // For pending/initiated payments
         setCurrentStep("pending");

         // For card payments, redirect directly in main window (not popup)
         // This ensures KPay redirects back to our page properly
         const isCardPayment =
            data.payment_method === "visa_card" ||
            data.payment_method === "mastercard" ||
            data.payment_method?.includes("card");

         const isPendingStatus =
            data.status === "pending" || data.status === "initiated";

         if (
            isCardPayment &&
            (checkoutUrl || data.checkout_url) &&
            isPendingStatus
         ) {
            console.log(
               "[PaymentModal] Card payment detected, redirecting to KPay checkout:",
               checkoutUrl || data.checkout_url,
            );

            try {
               if (data.reference) {
                  sessionStorage.setItem("kpay_reference", data.reference);
               }
            } catch (e) {
               console.warn("[PaymentModal] Failed to store reference:", e);
            }

            const kpayUrl = checkoutUrl || data.checkout_url;
            if (kpayUrl) {
               // Close modal and redirect directly in main window
               // KPay will redirect back to the redirectUrl (payment page)
               onOpenChange(false);
               window.location.href = kpayUrl;
               return;
            }
            return;
         }

         // Check for KPay return params - using searchParams from component level
         const isKPayReturn =
            searchParams &&
            (searchParams.has("refid") ||
               searchParams.has("tid") ||
               searchParams.has("statusid"));

         if (
            isKPayReturn &&
            (data.status === "completed" || data.status === "successful")
         ) {
            if (data.reference) {
               try {
                  const statusResult = await checkPaymentStatus({
                     reference: data.reference,
                     transactionId: data.kpay_transaction_id,
                  });

                  if (
                     statusResult.success &&
                     (statusResult.status === "completed" ||
                        statusResult.status === "successful")
                  ) {
                     if (!data.order_id) {
                        await finalizeAndCreateOrder(data.reference);
                        return;
                     } else {
                        orderCreatedRef.current = true;
                        cleanupStorage();
                        await new Promise((resolve) =>
                           setTimeout(resolve, 500),
                        );
                        onSuccess(data.order_id);
                        return;
                     }
                  }
               } catch (e) {
                  console.error(
                     "[PaymentModal] Failed to check status after KPay return:",
                     e,
                  );
               }
            }
         }
      } catch (err) {
         setError(
            err instanceof Error ? err.message : "Failed to load payment",
         );
         setCurrentStep("failed");
      } finally {
         setLoading(false);
      }
   };

   // Check payment status periodically
   const checkStatus = async () => {
      if (!payment || paymentCompleted || loading || orderCreatedRef.current)
         return;
      if (stoppedPolling || timeoutReportedRef.current) {
         if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current as unknown as number);
            pollingIntervalRef.current = null;
         }
         return;
      }

      const now = Date.now();
      if (now - lastStatusCheckRef.current < 29500) return;
      lastStatusCheckRef.current = now;
      if (isCheckingStatus) return;

      // Store the current payment reference to ensure we're still checking the same payment
      const currentPaymentRef = payment.reference;

      if (
         payment.status === "timeout" ||
         payment.status === "failed" ||
         payment.status === "cancelled"
      ) {
         setStoppedPolling(true);
         timeoutReportedRef.current = true;
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
         setCurrentStep("processing");
         const statusResult = await checkPaymentStatus({
            paymentId: payment.id,
            transactionId: payment.kpay_transaction_id,
            reference: payment.reference,
         });

         // Verify we're still checking the same payment (user might have started a new payment)
         if (!payment || payment.reference !== currentPaymentRef) {
            console.log(
               "[PaymentModal] Payment reference changed, stopping status check",
            );
            return;
         }

         if (statusResult.success) {
            const s = statusResult.status;
            if (s === "completed" || s === "successful") {
               setStoppedPolling(true);
               if (pollingIntervalRef.current) {
                  clearInterval(
                     pollingIntervalRef.current as unknown as number,
                  );
                  pollingIntervalRef.current = null;
               }
               if (countdownIntervalRef.current) {
                  clearInterval(
                     countdownIntervalRef.current as unknown as number,
                  );
                  countdownIntervalRef.current = null;
               }
               setPaymentCompleted(true);
               setCurrentStep("completed");
               setPayment((prev) => (prev ? { ...prev, status: s } : null));

               // Clear any previous errors before showing success
               setError(null);

               toast.success("Payment completed successfully!");

               await finalizeAndCreateOrder(payment.reference);
               return;
            }
            if (s === "failed" || s === "cancelled") {
               // Check if payment was just initiated (within last 60 seconds)
               // If so, ignore "failed" status as it might be a false negative
               const paymentAge = payment
                  ? Date.now() - new Date(payment.created_at).getTime()
                  : 0;
               const isRecentlyInitiated = paymentAge < 60000; // 60 seconds

               // Only treat as failed if payment is not recently initiated
               // This prevents false negatives when checking status too early
               if (!isRecentlyInitiated || s === "cancelled") {
                  // Only show error if this is still the current payment
                  if (payment && payment.reference === currentPaymentRef) {
                     setPayment((prev) =>
                        prev
                           ? {
                                ...prev,
                                status: s,
                                failure_reason: statusResult.error,
                             }
                           : null,
                     );
                     setCurrentStep("failed");
                     setStoppedPolling(true);
                     if (pollingIntervalRef.current) {
                        clearInterval(
                           pollingIntervalRef.current as unknown as number,
                        );
                        pollingIntervalRef.current = null;
                     }
                     toast.error(
                        statusResult.error || "Payment failed or was cancelled",
                        { duration: 5000 },
                     );
                  }
                  return;
               } else {
                  // Payment was just initiated, ignore "failed" status for now
                  // Keep polling to check again later
                  console.log(
                     "[PaymentModal] Ignoring 'failed' status for recently initiated payment, will check again",
                  );
                  return;
               }
            }

            if (
               payment &&
               s &&
               s !== payment.status &&
               payment.reference === currentPaymentRef
            ) {
               setPayment((prev) => (prev ? { ...prev, status: s } : null));
            }
         } else if (statusResult.error) {
            if (stoppedPolling || timeoutReportedRef.current) {
               return;
            }
            // Only log/show errors if this is still the current payment
            if (payment && payment.reference === currentPaymentRef) {
               console.error("Payment status check error:", statusResult.error);
               statusCheckCountRef.current++;
               const NOTICE_THRESHOLD = 3;
               if (statusCheckCountRef.current >= NOTICE_THRESHOLD) {
                  toast.info(
                     "Payment is taking longer than usual. We'll keep checking...",
                     { duration: 4000 },
                  );
               }
            }
         }
      } catch (err) {
         if (stoppedPolling || timeoutReportedRef.current) {
            return;
         }
         // Only log errors if this is still the current payment
         if (payment && payment.reference === currentPaymentRef) {
            console.error("Failed to check payment status:", err);
         }
      }
   };

   // Initialize payment data when modal opens
   useEffect(() => {
      if (open && paymentReference) {
         // Completely reset all state when opening with a new payment reference
         // This ensures previous payment errors don't persist when trying a new payment method
         setLoading(true);
         setError(null);
         setPaymentCompleted(false);
         setOrderCreating(false);
         setStoppedPolling(false);
         setPayment(null);
         setCurrentStep("initiating");
         timeoutReportedRef.current = false;
         statusCheckCountRef.current = 0;
         orderCreatedRef.current = false;

         // Reset deadline for new payment
         deadlineRef.current = null;
         setRemainingSeconds(300);

         // Clear any previous error toasts
         // Note: We can't directly dismiss toasts, but resetting state ensures new errors are fresh

         fetchPaymentData();
      } else if (!open) {
         // Clean up when modal closes
         if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current as unknown as number);
            pollingIntervalRef.current = null;
         }
         if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current as unknown as number);
            countdownIntervalRef.current = null;
         }
      }
   }, [open, paymentReference]);

   // Start polling when payment is loaded
   useEffect(() => {
      if (
         !payment ||
         paymentCompleted ||
         loading ||
         stoppedPolling ||
         orderCreatedRef.current
      )
         return;

      if (!deadlineRef.current) {
         deadlineRef.current = Date.now() + 5 * 60 * 1000;
      }

      // Delay first status check by 10 seconds to avoid checking too early after initiation
      // This prevents false "failed" status when payment is still being processed
      const initialDelay = setTimeout(() => {
         checkStatus();
      }, 10000); // Wait 10 seconds before first check

      setRemainingSeconds((s) => (s == null ? 300 : s));

      pollingIntervalRef.current = window.setInterval(() => {
         checkStatus();
      }, 30000) as unknown as number;

      return () => {
         clearTimeout(initialDelay);
         if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current as unknown as number);
            pollingIntervalRef.current = null;
         }
      };
   }, [payment?.id, paymentCompleted, loading, stoppedPolling]);

   // Countdown timer
   useEffect(() => {
      if (
         !payment ||
         paymentCompleted ||
         loading ||
         stoppedPolling ||
         orderCreatedRef.current
      )
         return;
      if (payment.status !== "pending" && payment.status !== "initiated")
         return;

      if (!deadlineRef.current) {
         deadlineRef.current = Date.now() + 5 * 60 * 1000;
      }

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
            setStoppedPolling(true);
            setCurrentStep("timeout");
            if (pollingIntervalRef.current) {
               clearInterval(pollingIntervalRef.current as unknown as number);
               pollingIntervalRef.current = null;
            }
            if (countdownIntervalRef.current) {
               clearInterval(countdownIntervalRef.current as unknown as number);
               countdownIntervalRef.current = null;
            }
            (async () => {
               try {
                  const resp = await fetch("/api/payments/timeout", {
                     method: "POST",
                     headers: { "Content-Type": "application/json" },
                     body: JSON.stringify({
                        paymentId: payment.id,
                        reason: "Client-side timeout after 5 minutes",
                     }),
                  });
                  const data = await resp.json();
                  if (
                     data?.status === "completed" ||
                     data?.status === "successful"
                  ) {
                     setPaymentCompleted(true);
                     setCurrentStep("completed");
                     setPayment((prev) =>
                        prev ? { ...prev, status: data.status } : null,
                     );
                     toast.success("Payment completed successfully!");
                     await finalizeAndCreateOrder(payment.reference);
                     return;
                  }
                  setPayment((prev) =>
                     prev
                        ? {
                             ...prev,
                             status: "timeout",
                             failure_reason:
                                "Payment took too long to process. You can try again or use a different payment method.",
                          }
                        : null,
                  );
                  toast.error(
                     "Payment timed out. Please try again or use a different payment method.",
                     { duration: 6000 },
                  );
               } catch (e) {
                  console.error("Failed to record timeout:", e);
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
   }, [
      payment?.id,
      payment?.status,
      paymentCompleted,
      loading,
      stoppedPolling,
   ]);

   const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, "0")}`;
   };

   const isCardPayment =
      payment?.payment_method === "visa_card" ||
      payment?.payment_method === "mastercard" ||
      payment?.payment_method?.includes("card");

   const getPaymentMethodName = (method: string) => {
      const methods: Record<string, string> = {
         mtn_momo: "MTN Mobile Money",
         airtel_money: "Airtel Money",
         visa_card: "Visa Card",
         mastercard: "Mastercard",
         cash_on_delivery: "Cash on Delivery",
      };
      return methods[method] || method;
   };

   const getStatusIcon = () => {
      if (currentStep === "completed") {
         return <CheckCircle2 className="h-8 w-8 text-green-500" />;
      }
      if (currentStep === "failed" || currentStep === "timeout") {
         return <XCircle className="h-8 w-8 text-red-500" />;
      }
      if (currentStep === "processing") {
         return <Sparkles className="h-8 w-8 text-purple-500 animate-pulse" />;
      }
      return <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />;
   };

   const getStatusMessage = () => {
      if (currentStep === "completed") {
         return orderCreating
            ? "Creating your order..."
            : "Payment completed successfully!";
      }
      if (currentStep === "failed") {
         return "Payment failed";
      }
      if (currentStep === "timeout") {
         return "Payment timed out";
      }
      if (currentStep === "processing") {
         return "Processing payment...";
      }
      if (currentStep === "pending") {
         return isCardPayment
            ? "Complete payment in popup window"
            : "Complete payment on your phone";
      }
      return "Initializing payment...";
   };

   const getStatusDescription = () => {
      if (currentStep === "completed") {
         return orderCreating
            ? "Your order is being created. Please wait..."
            : "Your order is being processed. Redirecting...";
      }
      if (currentStep === "failed") {
         return (
            payment?.failure_reason ||
            "Your payment could not be processed. Please try again."
         );
      }
      if (currentStep === "timeout") {
         return "Payment took too long to process. Please try again or use a different payment method.";
      }
      if (currentStep === "processing") {
         return "Verifying your payment with the payment gateway...";
      }
      if (currentStep === "pending" && isCardPayment) {
         return "A secure payment window should have opened. Please complete your payment there. Do not close this window.";
      }
      if (currentStep === "pending") {
         return "Please approve the payment request on your mobile device. This window will update automatically when payment is confirmed.";
      }
      return "Setting up your payment...";
   };

   return (
      <Dialog
         open={open}
         onOpenChange={onOpenChange}
      >
         <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
            <div className="bg-gradient-to-br from-orange-50 to-white border-b">
               <DialogHeader className="px-6 pt-6 pb-4">
                  <div className="flex items-center gap-3">
                     <div className="p-2.5 bg-white rounded-xl shadow-sm">
                        <Image
                           src={logo}
                           alt="NiheMart"
                           width={40}
                           height={40}
                           className="rounded-lg"
                        />
                     </div>
                     <div className="flex-1">
                        <DialogTitle className="text-2xl font-bold text-gray-900">
                           Payment Processing
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-600 mt-1">
                           Secure payment via KPay
                        </DialogDescription>
                     </div>
                  </div>
               </DialogHeader>
            </div>

            <div className="px-6 py-6 space-y-6">
               {/* Status Section */}
               <div className="flex items-start gap-4 p-5 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex-shrink-0 mt-1">{getStatusIcon()}</div>
                  <div className="flex-1 min-w-0">
                     <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {getStatusMessage()}
                     </h3>
                     <p className="text-sm text-gray-600 leading-relaxed">
                        {getStatusDescription()}
                     </p>
                  </div>
               </div>

               {/* Payment Details Card */}
               {payment && (
                  <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 shadow-sm">
                     <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">
                           Amount
                        </span>
                        <span className="text-2xl font-bold text-gray-900">
                           {payment.currency} {payment.amount.toLocaleString()}
                        </span>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Payment Method
                           </span>
                           <div className="mt-1.5">
                              <Badge
                                 variant="outline"
                                 className="font-medium text-sm px-3 py-1"
                              >
                                 {getPaymentMethodName(payment.payment_method)}
                              </Badge>
                           </div>
                        </div>

                        {payment.reference && (
                           <div>
                              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                 Reference
                              </span>
                              <div className="mt-1.5">
                                 <span className="font-mono text-xs text-gray-700 bg-gray-50 px-2.5 py-1.5 rounded-md border border-gray-200">
                                    {payment.reference}
                                 </span>
                              </div>
                           </div>
                        )}
                     </div>

                     {remainingSeconds !== null &&
                        (payment.status === "pending" ||
                           payment.status === "initiated") &&
                        !paymentCompleted && (
                           <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100 bg-orange-50 -mx-6 -mb-6 px-6 py-4 rounded-b-xl">
                              <div className="flex items-center gap-2">
                                 <Clock className="h-5 w-5 text-orange-600" />
                                 <span className="text-sm font-medium text-gray-700">
                                    Time remaining
                                 </span>
                              </div>
                              <span className="text-xl font-bold text-orange-600 font-mono">
                                 {formatTime(remainingSeconds)}
                              </span>
                           </div>
                        )}
                  </div>
               )}

               {/* Loading State */}
               {loading && (
                  <div className="text-center py-8">
                     <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-3" />
                     <p className="text-sm text-gray-600">
                        Loading payment information...
                     </p>
                  </div>
               )}

               {/* Error/Failed State */}
               {(currentStep === "failed" || currentStep === "timeout") && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-4">
                     <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                           <p className="text-sm font-medium text-red-900 mb-1">
                              {currentStep === "failed"
                                 ? "Payment Failed"
                                 : "Payment Timed Out"}
                           </p>
                           <p className="text-xs text-red-700 leading-relaxed">
                              {payment?.failure_reason ||
                                 (currentStep === "timeout"
                                    ? "Payment took too long to process. Please try again or use a different payment method."
                                    : "Your payment could not be processed. Please try again.")}
                           </p>
                        </div>
                     </div>
                     <Button
                        onClick={() => {
                           onOpenChange(false);
                           onClose();
                        }}
                        variant="outline"
                        className="w-full border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
                     >
                        Return to Checkout
                     </Button>
                  </div>
               )}
            </div>
         </DialogContent>
      </Dialog>
   );
}

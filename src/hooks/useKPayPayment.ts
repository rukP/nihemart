import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { PAYMENT_METHODS } from "@/lib/services/kpay";

export interface PaymentInitiationRequest {
   // orderId is optional now; callers can initiate a payment session by providing a cart snapshot instead
   orderId?: string;
   amount: number;
   customerName: string;
   customerEmail: string;
   customerPhone: string;
   paymentMethod: keyof typeof PAYMENT_METHODS;
   redirectUrl: string;
   // Optional cart snapshot for session-based payments
   cart?: any;
}

export interface PaymentInitiationResponse {
   success: boolean;
   // paymentId will be present when a payments row was created (order-based flow)
   paymentId?: string;
   // transaction id from KPay
   transactionId?: string;
   // reference generated for the payment/session
   reference?: string;
   // payment session returned by server when initiating without an order
   session?: any;
   // sessionId is returned by server for session-based initiations
   sessionId?: string;
   checkoutUrl?: string;
   status: string;
   message: string;
   error?: string;
}

export interface PaymentStatusResponse {
   success: boolean;
   paymentId: string;
   status: string;
   amount: number;
   currency: string;
   reference: string;
   transactionId?: string;
   message: string;
   needsUpdate: boolean;
   error?: string;
   kpayStatus?: {
      statusId: string;
      statusDescription: string;
      returnCode: number;
      momTransactionId?: string;
   };
}

export function useKPayPayment() {
   const [isInitiating, setIsInitiating] = useState(false);
   const [isCheckingStatus, setIsCheckingStatus] = useState(false);
   // refs to avoid stale closures and prevent concurrent requests
   const initiatingRef = useRef(false);
   const checkingRef = useRef(false);

   const initiatePayment = useCallback(
      async (
         request: PaymentInitiationRequest
      ): Promise<PaymentInitiationResponse> => {
         if (initiatingRef.current) {
            const msg = "A payment is already in progress. Please wait.";
            toast.error(msg);
            return {
               success: false,
               paymentId: "",
               transactionId: "",
               reference: "",
               status: "failed",
               message: msg,
               error: msg,
            };
         }

         initiatingRef.current = true;
         setIsInitiating(true);

         try {
            // If a previous reference exists in sessionStorage, include it so server can reuse/update existing row
            const bodyPayload: any = { ...request };
            try {
               if (typeof window !== "undefined") {
                  const existingRef = sessionStorage.getItem("kpay_reference");
                  if (existingRef) {
                     bodyPayload.clientReference = existingRef;
                  }
               }
            } catch (e) {
               // ignore
            }

            const response = await fetch("/api/payments/kpay/initiate", {
               method: "POST",
               headers: {
                  "Content-Type": "application/json",
               },
               body: JSON.stringify(bodyPayload),
            });

            // Try to parse JSON body, but fall back to raw text for diagnostics
            let data: any;
            try {
               data = await response.json();
            } catch (e) {
               const txt = await response.text();
               data = { error: txt || "Failed to parse response" };
            }

            if (!response.ok) {
               const serverErr =
                  data?.technicalError ||
                  data?.error ||
                  data?.message ||
                  "Failed to initiate payment";
               throw new Error(serverErr);
            }

            if (data.success) {
               toast.success("Payment initiated successfully");
            } else {
               toast.error(data.error || "Payment initiation failed");
            }

            // Normalize response: ensure checkoutUrl and reference are top-level for client convenience
            const rawCheckout =
               data.checkoutUrl ||
               data?.kpayResponse?.url ||
               data?.kpayResponse?.redirecturl ||
               data?.kpayResponse?.redirectUrl ||
               null;
            const checkoutUrl =
               typeof rawCheckout === "string" && rawCheckout.trim().length > 0
                  ? rawCheckout.trim()
                  : null;

            const normalized = {
               ...data,
               checkoutUrl,
               reference: data.reference || data?.kpayResponse?.refid || null,
               // prefer explicit sessionId if server provides it
               sessionId: data.sessionId || data?.session?.id || null,
            } as any;

            return normalized;
         } catch (error) {
            const errorMessage =
               error instanceof Error
                  ? error.message
                  : "Payment initiation failed";
            toast.error(errorMessage);

            return {
               success: false,
               paymentId: "",
               transactionId: "",
               reference: "",
               status: "failed",
               message: errorMessage,
               error: errorMessage,
            };
         } finally {
            initiatingRef.current = false;
            setIsInitiating(false);
         }
      },
      []
   );

   const checkPaymentStatus = useCallback(
      async (params: {
         paymentId?: string;
         transactionId?: string;
         reference?: string;
      }): Promise<PaymentStatusResponse> => {
         // If a check is already running, wait for it to finish (serialize)
         if (checkingRef.current) {
            // wait up to 5s for the existing check to finish
            const start = Date.now();
            while (checkingRef.current && Date.now() - start < 5000) {
               // small sleep
               // eslint-disable-next-line no-await-in-loop
               await new Promise((r) => setTimeout(r, 150));
            }
            // If still running after wait, proceed but allow new check to start
         }

         checkingRef.current = true;
         setIsCheckingStatus(true);

         try {
            const response = await fetch("/api/payments/kpay/status", {
               method: "POST",
               headers: {
                  "Content-Type": "application/json",
               },
               body: JSON.stringify(params),
            });

            const data = await response.json();

            if (!response.ok) {
               throw new Error(data.error || "Failed to check payment status");
            }

            return data;
         } catch (error) {
            const errorMessage =
               error instanceof Error
                  ? error.message
                  : "Failed to check payment status";

            return {
               success: false,
               paymentId: params.paymentId || "",
               status: "unknown",
               amount: 0,
               currency: "RWF",
               reference: params.reference || "",
               transactionId: params.transactionId,
               message: errorMessage,
               needsUpdate: false,
               error: errorMessage,
            };
         } finally {
            checkingRef.current = false;
            setIsCheckingStatus(false);
         }
      },
      []
   );

   const formatPhoneNumber = useCallback((phone: string): string => {
      // Remove all non-digit characters except +
      const cleaned = phone.replace(/[^\d+]/g, "");

      // If already in 07XXXXXXXX format, return as is (preferred by KPay)
      if (/^07\d{8}$/.test(cleaned)) {
         return cleaned;
      }

      // If starts with +250, convert to 07XXXXXXXX
      if (cleaned.startsWith("+250")) {
         const digits = cleaned.substring(4);
         if (digits.length === 9 && digits.startsWith("7")) {
            return `0${digits}`;
         }
      }

      // If starts with 250, convert to 07XXXXXXXX
      if (cleaned.startsWith("250")) {
         const digits = cleaned.substring(3);
         if (digits.length === 9 && digits.startsWith("7")) {
            return `0${digits}`;
         }
      }

      // If 9 digits starting with 7, add 0 prefix
      if (cleaned.length === 9 && cleaned.startsWith("7")) {
         return `0${cleaned}`;
      }

      return cleaned;
   }, []);

   const validatePaymentRequest = useCallback(
      (request: PaymentInitiationRequest): string[] => {
         const errors: string[] = [];

         // Either an orderId (order-based payment) or a cart snapshot (session-based payment)
         if (!request.orderId && !request.cart) {
            errors.push(
               "Either Order ID or cart snapshot is required to initiate a payment"
            );
         }

         if (!request.amount || request.amount <= 0) {
            errors.push("Valid amount is required");
         }

         if (!request.customerName?.trim()) {
            errors.push("Customer name is required");
         }

         // Email is optional for guests - will use placeholder if not provided
         // No validation error if email is missing

         if (!request.customerPhone?.trim()) {
            errors.push("Customer phone is required");
         } else {
            // Validate phone format
            const formattedPhone = formatPhoneNumber(request.customerPhone);
            if (!formattedPhone.match(/^07\d{8}$/)) {
               errors.push(
                  "Phone number must be in Rwanda format (07XXXXXXXX)"
               );
            }
         }

         if (!request.paymentMethod) {
            errors.push("Payment method is required");
         } else if (!PAYMENT_METHODS[request.paymentMethod]) {
            errors.push("Invalid payment method");
         }

         if (!request.redirectUrl?.trim()) {
            errors.push("Redirect URL is required");
         }

         return errors;
      },
      [formatPhoneNumber]
   );

   return {
      initiatePayment,
      checkPaymentStatus,
      formatPhoneNumber,
      validatePaymentRequest,
      isInitiating,
      isCheckingStatus,
   };
}

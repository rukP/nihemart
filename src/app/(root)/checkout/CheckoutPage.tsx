"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";
import type { CreateOrderRequest } from "@/types/orders";
import { useAuth } from "@/hooks/useAuth";
import { useOrders } from "@/hooks/useOrders";
import { useCart } from "@/contexts/CartContext";
import { useBuyNow } from "@/contexts/BuyNowContext";
import { supabase } from "@/integrations/supabase/client";
import {
   Collapsible,
   CollapsibleTrigger,
   CollapsibleContent,
} from "@/components/ui/collapsible";
import { useAddresses } from "@/hooks/useAddresses";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";

// Location data (local JSON)
import provincesJson from "@/lib/data/provinces.json";
import districtsJson from "@/lib/data/districts.json";
import sectorsJson from "@/lib/data/sectors.json";
import sectorsFees from "@/lib/data/sectors_fees.json";
import {
   Loader2,
   ShoppingCart,
   CheckCircle2,
   MapPin,
   Package,
   CreditCard,
   ChevronDown,
   ChevronRight,
   Plus,
   AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import GuestCheckoutForm from "@/components/guest/GuestCheckoutForm";
import { z } from "zod";
import CheckoutHeader from "@/components/checkout/CheckoutHeader";
import OrderItemsList from "@/components/checkout/OrderItemsList";
import PriceSummary from "@/components/checkout/PriceSummary";
import PaymentSection from "@/components/checkout/PaymentSection";
import CheckoutFooter from "@/components/checkout/CheckoutFooter";
import useCheckoutTotals from "@/hooks/useCheckoutTotals";
import useCheckoutFlags from "@/hooks/useCheckoutFlags";
import useSubmitOrder from "@/hooks/useSubmitOrder";
import { useKPayPayment } from "@/hooks/useKPayPayment";
import useGuestInfo from "@/hooks/useGuestInfo";
import { PAYMENT_METHODS } from "@/lib/services/kpay";
import CheckoutAddressForm from "@/components/checkout/CheckoutAddressForm";

interface CartItem {
   id: string;
   name: string;
   price: number;
   quantity: number;
   sku?: string;
   variation_id?: string;
   variation_name?: string;
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

   // Guest checkout allowed — do not force login here. Use middleware for server-side protection when needed.

   const [formData, setFormData] = useState({
      email: "",
      fullName: "",
      address: "",
      city: "",
      phone: "",
      delivery_notes: "",
   });
   // LocalStorage persistence keys and helpers
   const CHECKOUT_STORAGE_KEY = "nihemart_checkout_v1";

   const loadCheckoutFromStorage = () => {
      try {
         if (typeof window === "undefined") return null;
         const raw = localStorage.getItem(CHECKOUT_STORAGE_KEY);
         if (!raw) return null;
         return JSON.parse(raw);
      } catch (err) {
         console.warn("Failed to load checkout from storage:", err);
         return null;
      }
   };

   const saveCheckoutToStorage = (payload: any) => {
      try {
         if (typeof window === "undefined") return;
         localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(payload));
      } catch (err) {
         console.warn("Failed to save checkout to storage:", err);
      }
   };

   const clearCheckoutStorage = () => {
      try {
         if (typeof window === "undefined") return;
         localStorage.removeItem(CHECKOUT_STORAGE_KEY);
      } catch (err) {
         /* ignore */
      }
   };

   // Clear all client-side checkout state after successful order creation
   const clearAllCheckoutClientState = () => {
      console.log("[clearAllCheckoutClientState] Starting cleanup...");
      setPreventPersistence(true);
      console.log("[clearAllCheckoutClientState] ✓ Persistence prevented");
      try {
         console.log(
            "[clearAllCheckoutClientState] Clearing primary checkout storage..."
         );
         // primary checkout storage key
         clearCheckoutStorage();
         console.log(
            "[clearAllCheckoutClientState] ✓ Primary checkout storage cleared"
         );
      } catch (e) {
         console.error(
            "[clearAllCheckoutClientState] Failed to clear checkout storage:",
            e
         );
      }

      try {
         console.log(
            "[clearAllCheckoutClientState] Clearing all localStorage checkout keys..."
         );
         // Make double-sure to remove the key if different casing or older keys exist
         if (typeof window !== "undefined") {
            try {
               localStorage.removeItem("nihemart_checkout_v1");
               console.log(
                  "[clearAllCheckoutClientState] ✓ nihemart_checkout_v1 cleared"
               );
            } catch (e) {
               console.error(
                  "[clearAllCheckoutClientState] Failed to clear nihemart_checkout_v1:",
                  e
               );
            }
            try {
               localStorage.removeItem("checkout");
               console.log(
                  "[clearAllCheckoutClientState] ✓ checkout key cleared"
               );
            } catch (e) {
               console.error(
                  "[clearAllCheckoutClientState] Failed to clear checkout:",
                  e
               );
            }
         }
      } catch (e) {
         console.error(
            "[clearAllCheckoutClientState] Failed to clear primary storage keys:",
            e
         );
      }

      try {
         console.log(
            "[clearAllCheckoutClientState] Clearing sessionStorage..."
         );
         if (typeof window !== "undefined") {
            sessionStorage.removeItem("kpay_reference");
            console.log(
               "[clearAllCheckoutClientState] ✓ kpay_reference cleared from sessionStorage"
            );

            // Clear any other sessionStorage checkout items
            const sessionKeys = Object.keys(sessionStorage);
            const checkoutSessionKeys = sessionKeys.filter(
               (key) =>
                  key.toLowerCase().includes("checkout") ||
                  key.toLowerCase().includes("payment") ||
                  key.toLowerCase().includes("kpay")
            );
            checkoutSessionKeys.forEach((key) => {
               try {
                  sessionStorage.removeItem(key);
                  console.log(
                     `[clearAllCheckoutClientState] ✓ Session key cleared: ${key}`
                  );
               } catch (e) {
                  console.error(
                     `[clearAllCheckoutClientState] Failed to clear session key ${key}:`,
                     e
                  );
               }
            });
         }
      } catch (e) {
         console.error(
            "[clearAllCheckoutClientState] Failed to clear sessionStorage:",
            e
         );
      }

      try {
         console.log(
            "[clearAllCheckoutClientState] Clearing cart from localStorage..."
         );
         if (typeof window !== "undefined") {
            localStorage.removeItem("cart");
            console.log(
               "[clearAllCheckoutClientState] ✓ cart cleared from localStorage"
            );
         }
      } catch (e) {
         console.error(
            "[clearAllCheckoutClientState] Failed to clear cart:",
            e
         );
      }

      console.log(
         "[clearAllCheckoutClientState] ✓ All checkout client state cleared successfully"
      );
   };
   const [orderItems, setOrderItems] = useState<CartItem[]>([]);
   const [isBuyNowFlow, setIsBuyNowFlow] = useState(false);
   const [errors, setErrors] = useState<any>({});

   // Enhanced phone validation for Rwanda
   const phoneSchema = z.object({
      phone: z
         .string()
         .nonempty({
            message: t("checkout.errors.phoneRequired") || "Phone is required",
         })
         .refine(
            (val) => {
               // Clean the input - remove all non-digit characters except +
               const cleaned = val.replace(/[^\d+]/g, "");

               // Pattern 1: +250 followed by 9 digits (total 13 chars including +)
               if (/^\+250\d{9}$/.test(cleaned)) return true;

               // Pattern 2: 07 followed by 8 digits (total 10 digits)
               if (/^07\d{8}$/.test(cleaned)) return true;

               return false;
            },
            {
               message:
                  t("checkout.errors.validPhone") ||
                  "Phone must be in format +250XXXXXXXXX or 07XXXXXXXX",
            }
         ),
   });

   const [isSubmitting, setIsSubmitting] = useState(false);
   const [addressOpen, setAddressOpen] = useState(false);
   const [addNewOpen, setAddNewOpen] = useState(false);
   const [instructionsOpen, setInstructionsOpen] = useState(false);
   const [paymentOpen, setPaymentOpen] = useState(false);

   const {
      saved: savedAddresses,
      selected: selectedAddress,
      selectAddress,
      saveAddress,
      updateAddress,
      removeAddress,
      reloadSaved,
   } = useAddresses();

   // State for temporary address used during checkout (not saved to DB until after order)
   const [tempCheckoutAddress, setTempCheckoutAddress] = useState<any>(null);

   // Use temporary address if available, otherwise use selected saved address
   const effectiveAddress = tempCheckoutAddress || selectedAddress;

   const { items: cartItems, clearCart, removeItem } = useCart();

   // Load temporary address from localStorage on mount
   useEffect(() => {
      try {
         const savedTempAddress = localStorage.getItem('checkout_temp_address');
         if (savedTempAddress) {
            const parsedAddress = JSON.parse(savedTempAddress);
            setTempCheckoutAddress(parsedAddress);
            
            // CRITICAL: Restore province/district/sector selections for Kigali detection
            if (parsedAddress._temp) {
               if (parsedAddress._temp.selectedProvince) {
                  setSelectedProvince(parsedAddress._temp.selectedProvince);
               }
               if (parsedAddress._temp.selectedDistrict) {
                  setSelectedDistrict(parsedAddress._temp.selectedDistrict);
               }
               if (parsedAddress._temp.selectedSector) {
                  setSelectedSector(parsedAddress._temp.selectedSector);
               }
            }
            
            // Also update form data
            setFormData((prev) => ({
               ...prev,
               address: parsedAddress.street || parsedAddress.display_name || "",
               city: parsedAddress.city || "",
               phone: parsedAddress.phone || "",
            }));
         }
      } catch (error) {
         console.error("Error loading temp address from localStorage:", error);
      }
   }, []);

   // Handler for using address directly without saving to DB first
   const handleUseAddressDirectly = (addressData: any) => {
      // Create a temporary address object that matches the saved address structure
      const tempAddress = {
         id: "temp-checkout-address", // Temporary ID
         display_name: addressData.display_name,
         street: addressData.street,
         house_number: addressData.house_number,
         phone: addressData.phone,
         city: addressData.city,
         lat: addressData.lat,
         lon: addressData.lon,
         _isTemp: true, // Flag to identify this as temporary
         ...addressData,
      };

      // CRITICAL: Set province/district/sector selections from the temp address
      // This ensures Kigali detection works properly for temporary addresses
      if (addressData._temp) {
         if (addressData._temp.selectedProvince) {
            setSelectedProvince(addressData._temp.selectedProvince);
         }
         if (addressData._temp.selectedDistrict) {
            setSelectedDistrict(addressData._temp.selectedDistrict);
         }
         if (addressData._temp.selectedSector) {
            setSelectedSector(addressData._temp.selectedSector);
         }
      }

      // Save to state
      setTempCheckoutAddress(tempAddress);
      
      // Save to localStorage for persistence (including _temp data)
      try {
         localStorage.setItem('checkout_temp_address', JSON.stringify(tempAddress));
      } catch (error) {
         console.error("Error saving temp address to localStorage:", error);
      }

      // Update form data
      setFormData((prev) => ({
         ...prev,
         address: addressData.street || addressData.display_name || "",
         city: addressData.city || "",
         phone: addressData.phone || "",
      }));

      // Close the address form
      setAddNewOpen(false);
      setAddressOpen(false);

      toast.success(
         t("checkout.addressReadyForCheckout") || "Address ready for checkout!"
      );
   };

   // Handler to clear temporary address
   const handleClearTempAddress = () => {
      setTempCheckoutAddress(null);
      try {
         localStorage.removeItem('checkout_temp_address');
      } catch (error) {
         console.error("Error removing temp address from localStorage:", error);
      }
      toast.info("Address cleared");
   };

   // KPay payment functionality
   const {
      initiatePayment,
      formatPhoneNumber,
      validatePaymentRequest,
      isInitiating,
   } = useKPayPayment();

   const { formatPhoneInput, normalizePhone, deriveFullName } = useGuestInfo();

   // Location data state
   const [provinces, setProvinces] = useState<any[]>([]);
   const [districts, setDistricts] = useState<any[]>([]);
   const [sectors, setSectors] = useState<any[]>([]);

   // Selected location ids
   const [selectedProvince, setSelectedProvince] = useState<string | null>(
      null
   );
   const [selectedDistrict, setSelectedDistrict] = useState<string | null>(
      null
   );
   const [selectedSector, setSelectedSector] = useState<string | null>(null);

   // Address form fields for new/edit
   const [houseNumber, setHouseNumber] = useState<string>("");
   const [phoneInput, setPhoneInput] = useState<string>("");
   const [editingAddressId, setEditingAddressId] = useState<string | null>(
      null
   );
   // address saving is handled by `CheckoutAddressForm` component now
   // Pre-pay flow state: track when a payment returned to checkout and whether it's verified
   const [paymentReturnedOrderId, setPaymentReturnedOrderId] = useState<
      string | null
   >(null);
   const [paymentVerified, setPaymentVerified] = useState<boolean>(false);
   const [previousPaymentMethod, setPreviousPaymentMethod] = useState<string | null>(null);
   // Track payment failures/timeouts so we can offer retry/alternate method UX
   const [paymentFailure, setPaymentFailure] = useState<{
      kind: "timedout" | "failed" | "not_found";
      message?: string;
      reference?: string;
   } | null>(null);
   const [isFinalizing, setIsFinalizing] = useState(false);
   const [paymentInProgress, setPaymentInProgress] = useState(false);
   const [suppressEmptyCartRedirect, setSuppressEmptyCartRedirect] =
      useState(false);
   const [paymentMethod, setPaymentMethod] = useState<
      keyof typeof PAYMENT_METHODS | "cash_on_delivery" | ""
   >("");
   const [mobileMoneyPhones, setMobileMoneyPhones] = useState<{
      mtn_momo?: string;
      airtel_money?: string;
   }>({});
   const [ordersEnabled, setOrdersEnabled] = useState<boolean | null>(null);
   // track whether the orders_enabled flag came from an admin override or schedule
   const [ordersSource, setOrdersSource] = useState<
      "admin" | "schedule" | null
   >(null);
   const [ordersDisabledMessage, setOrdersDisabledMessage] = useState<
      string | null
   >(null);

   // When orders are disabled by schedule, require a one-time confirmation
   // from the customer to deliver the order the next working day. The input
   // for extra notes is optional.
   const [scheduleConfirmChecked, setScheduleConfirmChecked] = useState(false);
   const [scheduleNotes, setScheduleNotes] = useState<string>("");
   const [preventPersistence, setPreventPersistence] = useState(false);

   // Handle phone input with validation
   const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      const formatted = formatPhoneInput(input);

      // Limit length based on format
      if (formatted.startsWith("+250")) {
         if (formatted.replace(/[^\d]/g, "").length <= 12) {
            setPhoneInput(formatted);
         }
      } else if (formatted.startsWith("07")) {
         if (formatted.replace(/[^\d]/g, "").length <= 10) {
            setPhoneInput(formatted);
         }
      } else {
         // Allow initial typing
         if (input.length <= 15) {
            setPhoneInput(formatted);
         }
      }

      // Clear phone error as user types
      if (errors?.phone) {
         setErrors((prev: any) => ({ ...prev, phone: undefined }));
      }
   };

   // Phone/name helpers provided by `useGuestInfo()`

   // Handle mobile money phone number changes
   const handleMobileMoneyPhoneChange = (
      method: "mtn_momo" | "airtel_money",
      phoneNumber: string
   ) => {
      setMobileMoneyPhones((prev) => ({
         ...prev,
         [method]: phoneNumber,
      }));
   };

   // no hydration debug used

   useEffect(() => {
      try {
         const addr = (
            effectiveAddress?.street ||
            formData.address ||
            ""
         ).trim();
         const cityEmpty = !formData.city || !formData.city.trim();
         if (!addr || !cityEmpty) return;

         const parts = addr
            .split(",")
            .map((p: string) => p.trim())
            .filter(Boolean);
         if (parts.length >= 2) {
            const possibleCity =
               parts.length >= 2 ? parts[parts.length - 2] : parts[0];
            if (possibleCity && possibleCity.length > 1) {
               setFormData((prev) => ({ ...prev, city: possibleCity }));
               return;
            }
         }

         if (/kigali/i.test(addr)) {
            setFormData((prev) => ({ ...prev, city: "Kigali" }));
         }
      } catch (err) {
         console.error("Auto-fill city error:", err);
      }
   }, [formData.address, selectedAddress]);

   // Derive effective retry flags: prefer props, fall back to search params
   // If searchParams is not populated (sometimes Next client hook is empty), fallback to parsing window.location.search
   const fallbackParams =
      typeof window !== "undefined"
         ? new URLSearchParams(window.location.search)
         : null;
   const effectiveIsRetry =
      isRetryMode ||
      searchParams?.get("retry") === "true" ||
      fallbackParams?.get("retry") === "true";

   // Normalize orderId from props/query; treat literal 'null'/'undefined' as null
   const _rawOrderId =
      retryOrderId ??
      searchParams?.get("orderId") ??
      (fallbackParams ? fallbackParams.get("orderId") : null) ??
      null;
   const effectiveRetryOrderId =
      _rawOrderId && _rawOrderId !== "null" && _rawOrderId !== "undefined"
         ? _rawOrderId
         : null;

   // Restore persisted checkout state (if any) on mount
   useEffect(() => {
      try {
         const persisted = loadCheckoutFromStorage();
         if (!persisted) return;

         // Only restore when not in retry mode and when user hasn't already filled fields
         if (!effectiveIsRetry && !isRetryMode) {
            if (persisted.formData) {
               const incoming = { ...persisted.formData } as any;
               // Backwards compatibility: if persisted snapshot has firstName/lastName
               // but not fullName, synthesize fullName.
               if (
                  !incoming.fullName &&
                  (incoming.firstName || incoming.lastName)
               ) {
                  incoming.fullName = `${incoming.firstName || ""} ${
                     incoming.lastName || ""
                  }`.trim();
               }
               setFormData((prev) => ({ ...prev, ...incoming }));
            }
            if (persisted.paymentMethod)
               setPaymentMethod(persisted.paymentMethod);
            if (persisted.mobileMoneyPhones)
               setMobileMoneyPhones(persisted.mobileMoneyPhones);
            if ((!orderItems || orderItems.length === 0) && persisted.cart) {
               // restore lightweight cart snapshot
               try {
                  setOrderItems(persisted.cart);
               } catch (e) {
                  /* ignore */
               }
            }
         }
      } catch (err) {
         console.warn("Failed to restore checkout state:", err);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

   // Persist checkout state when relevant parts change (debounced)
   useEffect(() => {
      // Don't persist if we're preventing it (after successful order creation)
      if (preventPersistence) return;

      const toSave = {
         formData,
         paymentMethod,
         mobileMoneyPhones,
         cart: orderItems,
      };

      const id = setTimeout(() => saveCheckoutToStorage(toSave), 250);
      return () => clearTimeout(id);
   }, [
      formData,
      paymentMethod,
      mobileMoneyPhones,
      orderItems,
      preventPersistence,
   ]);

   // Detect return from payment flow (e.g. ?payment=success&orderId=...)
   useEffect(() => {
      try {
         const p =
            searchParams?.get("payment") ||
            (typeof window !== "undefined"
               ? new URLSearchParams(window.location.search).get("payment")
               : null);
         const oid =
            searchParams?.get("orderId") ||
            (typeof window !== "undefined"
               ? new URLSearchParams(window.location.search).get("orderId")
               : null);
         if (p === "success" && oid) {
            setPaymentReturnedOrderId(oid);

            // verify payment server-side to avoid spoofing
            (async () => {
               try {
                  const resp = await fetch(`/api/payments/order/${oid}`);
                  if (!resp.ok) {
                     setPaymentVerified(false);
                     return;
                  }
                  const payments = await resp.json();
                  const ok =
                     Array.isArray(payments) &&
                     payments.some(
                        (p: any) =>
                           p.status === "completed" || p.status === "successful"
                     );
                  setPaymentVerified(!!ok);
                  if (ok) {
                     toast.success(
                        "Payment completed successfully. You can now finalize your order."
                     );
                     setPaymentFailure(null);
                     // Cleanup any stored payment/session data now that the order is verified
                     try {
                        if (typeof window !== "undefined") {
                           sessionStorage.removeItem("kpay_reference");
                           clearCheckoutStorage();
                        }
                     } catch (e) {}
                  } else {
                     const msg =
                        "Payment returned but no successful payment was found. You can retry or choose another payment method.";
                     toast.error(msg);
                     setPaymentFailure({
                        kind: "not_found",
                        message: msg,
                        reference: undefined,
                     });
                  }
               } catch (e) {
                  console.error("Failed to verify returned payment:", e);
                  setPaymentOpen(true);
                  setPaymentFailure(null);
               }
            })();
         }

         // If payment succeeded but no orderId (session-based), attempt finalize immediately
         if (p === "success" && !oid) {
            (async () => {
               try {
                  const ref =
                     typeof window !== "undefined"
                        ? sessionStorage.getItem("kpay_reference")
                        : null;
                  if (ref) {
                     setIsFinalizing(true);
                     const finResp = await fetch(
                        `/api/payments/kpay/finalize`,
                        {
                           method: "POST",
                           headers: { "Content-Type": "application/json" },
                           body: JSON.stringify({ reference: ref }),
                        }
                     );
                     if (finResp.ok) {
                        const finData = await finResp.json();

                        // If the finalize endpoint returned an orderId, go to it
                        if (finData?.success && finData.orderId) {
                           setIsFinalizing(false);
                           try {
                              sessionStorage.removeItem("kpay_reference");
                           } catch (e) {}
                           try {
                              clearCheckoutStorage();
                           } catch (e) {}
                           toast.success(
                              "Payment verified and order created. Redirecting..."
                           );
                           router.push(`/orders/${finData.orderId}`);
                           return;
                        }

                        // If the payment is completed but webhook didn't create an order,
                        // the finalize endpoint will report canCreateOrder: true.
                        // In that case, create the order now on behalf of the user using
                        // the persisted checkout snapshot (or in-memory state as a fallback),
                        // then attempt to link the completed payment to the newly created order.
                        if (finData?.success && finData.canCreateOrder) {
                           try {
                              // Prevent the empty-cart redirect while creating the order
                              setSuppressEmptyCartRedirect(true);
                              // Build order payload from persisted snapshot or current state
                              const persisted =
                                 typeof window !== "undefined"
                                    ? loadCheckoutFromStorage()
                                    : null;

                              // In retry mode, always use current payment method, not persisted one
                              const snapshot = persisted ? {
                                 ...persisted,
                                 paymentMethod: paymentMethod,  // Override with current selection
                                 mobileMoneyPhones: mobileMoneyPhones,  // Override with current phones
                              } : {
                                 formData,
                                 paymentMethod,
                                 mobileMoneyPhones,
                                 cart: orderItems,
                              };

                              const derivedCityNow = deriveCity();
                              const derivedFullNameNow =
                                 user?.user_metadata?.full_name?.trim() ||
                                 `${
                                    (snapshot.formData?.fullName as string) ||
                                    formData.fullName ||
                                    ""
                                 }`.trim();

                              const [fNameNow, ...lPartsNow] = (
                                 derivedFullNameNow || ""
                              ).split(" ");
                              const lNameNow = lPartsNow.join(" ");

                              const itemsForOrder = (
                                 snapshot.cart && Array.isArray(snapshot.cart)
                                    ? snapshot.cart
                                    : orderItems
                              ).map((it: any) => ({
                                 product_id: it.product_id || it.id,
                                 product_variation_id:
                                    it.variation_id || undefined,
                                 product_name: it.name,
                                 product_sku: it.sku || undefined,
                                 variation_name: it.variation_name || undefined,
                                 price: it.price,
                                 quantity: it.quantity,
                                 total: it.price * it.quantity,
                              }));

                              const orderPayload: CreateOrderRequest = {
                                 order: {
                                    user_id: user!.id,
                                    subtotal: subtotal,
                                    tax: transport,
                                    total: total,
                                    customer_email:
                                       (snapshot.formData?.email as string) ||
                                       formData.email ||
                                       "",
                                    customer_first_name: (
                                       fNameNow || ""
                                    ).trim(),
                                    customer_last_name: (lNameNow || "").trim(),
                                    customer_phone:
                                       (
                                          selectedAddress?.phone ||
                                          (snapshot.formData
                                             ?.phone as string) ||
                                          formData.phone ||
                                          ""
                                       ).trim() || undefined,
                                    delivery_address: (
                                       (selectedAddress?.street ??
                                          selectedAddress?.display_name ??
                                          (snapshot.formData
                                             ?.address as string)) ||
                                       formData.address ||
                                       ""
                                    ).trim(),
                                    delivery_city: (
                                       derivedCityNow ||
                                       selectedAddress?.city ||
                                       (snapshot.formData?.city as string) ||
                                       formData.city ||
                                       ""
                                    ).trim(),
                                    status: "pending",
                                    payment_method:
                                       (snapshot.paymentMethod as any) ||
                                       paymentMethod ||
                                       "cash_on_delivery",
                                    delivery_notes:
                                       (snapshot.formData
                                          ?.delivery_notes as string) ||
                                       formData.delivery_notes ||
                                       "" ||
                                       undefined,
                                 },
                                 items: itemsForOrder,
                              } as CreateOrderRequest;

                              // Create the order now
                              createOrder.mutate(
                                 orderPayload as CreateOrderRequest,
                                 {
                                    onSuccess: async (createdOrder: any) => {
                                       try {
                                          // Attempt to link payment to order
                                          const ref =
                                             typeof window !== "undefined"
                                                ? sessionStorage.getItem(
                                                     "kpay_reference"
                                                  )
                                                : null;

                                          let linkSucceeded = false;
                                          if (!ref) {
                                             linkSucceeded = true;
                                          } else {
                                             try {
                                                const linkResp = await fetch(
                                                   "/api/payments/link",
                                                   {
                                                      method: "POST",
                                                      headers: {
                                                         "Content-Type":
                                                            "application/json",
                                                      },
                                                      body: JSON.stringify({
                                                         orderId:
                                                            createdOrder.id,
                                                         reference: ref,
                                                      }),
                                                   }
                                                );
                                                if (linkResp.ok) {
                                                   linkSucceeded = true;
                                                }
                                             } catch (linkErr) {
                                                console.error(
                                                   "Linking payment failed during finalize auto-create:",
                                                   linkErr
                                                );
                                             }
                                          }

                                          if (linkSucceeded) {
                                             try {
                                                clearAllCheckoutClientState();
                                             } catch (e) {}
                                          } else {
                                             toast(
                                                "Order created but payment linking did not complete. Your checkout data has been preserved — please check your orders page or retry linking from the payment page."
                                             );
                                          }

                                          toast.success(
                                             `Order #${createdOrder.order_number} has been created successfully!`
                                          );
                                          router.push(
                                             `/orders/${createdOrder.id}`
                                          );
                                       } catch (outerErr) {
                                          console.error(
                                             "Error after auto-create order:",
                                             outerErr
                                          );
                                          router.push(
                                             `/orders/${createdOrder.id}`
                                          );
                                       }
                                    },
                                    onError: (err: any) => {
                                       console.error(
                                          "Auto-create order failed:",
                                          err
                                       );
                                       setSuppressEmptyCartRedirect(false);
                                       setIsFinalizing(false);
                                       toast.error(
                                          "Failed to create order automatically. Please contact support with your payment reference."
                                       );
                                    },
                                    onSettled: () => {
                                       setIsFinalizing(false);
                                       setSuppressEmptyCartRedirect(false);
                                    },
                                 }
                              );

                              return;
                           } catch (e) {
                              console.error("Auto-finalize/create failed:", e);
                           }
                        }
                     }
                     setIsFinalizing(false);
                  }
               } catch (e) {
                  console.error("Finalize attempt failed on return:", e);
                  setIsFinalizing(false);
               }
            })();
         }
      } catch (e) {
         // ignore
      }
   }, [searchParams]);

   useEffect(() => {
      let mounted = true;

      const checkReference = async (reference: string) => {
         try {
            // Poll with exponential backoff up to ~12s
            const maxAttempts = 6;
            for (let attempt = 0; attempt < maxAttempts && mounted; attempt++) {
               const resp = await fetch(`/api/payments/kpay/status`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ reference }),
               });

               if (!resp.ok) {
                  // wait and retry
                  await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
                  continue;
               }

               const data = await resp.json();

               if (data.orderId) {
                  // Verify payments for the order
                  try {
                     const paymentsResp = await fetch(
                        `/api/payments/order/${data.orderId}`
                     );
                     if (paymentsResp.ok) {
                        const payments = await paymentsResp.json();
                        const ok =
                           Array.isArray(payments) &&
                           payments.some(
                              (p: any) =>
                                 p.status === "completed" ||
                                 p.status === "successful"
                           );
                        setPaymentReturnedOrderId(data.orderId);
                        setPaymentVerified(!!ok);
                        if (ok) {
                           toast.success(
                              "Payment completed successfully. You can now finalize your order."
                           );
                        } else {
                           const msg =
                              "Payment returned but no successful payment was found. You can retry or choose another payment method.";
                           toast.error(msg);
                           setPaymentFailure({
                              kind: "not_found",
                              message: msg,
                              reference,
                           });
                        }
                        try {
                           sessionStorage.removeItem("kpay_reference");
                        } catch (e) {}
                        try {
                           clearCheckoutStorage();
                        } catch (e) {}
                        return;
                     }
                  } catch (e) {
                     // continue polling
                  }
               }

               if (!data.orderId && data.status === "completed") {
                  try {
                     // Call finalize endpoint with the reference
                     const finResp = await fetch(
                        `/api/payments/kpay/finalize`,
                        {
                           method: "POST",
                           headers: { "Content-Type": "application/json" },
                           body: JSON.stringify({ reference }),
                        }
                     );

                     if (finResp.ok) {
                        const finData = await finResp.json();
                        if (finData?.success && finData.orderId) {
                           setPaymentReturnedOrderId(finData.orderId);
                           // Verify payments for the created order
                           try {
                              const paymentsResp2 = await fetch(
                                 `/api/payments/order/${finData.orderId}`
                              );
                              if (paymentsResp2.ok) {
                                 const payments2 = await paymentsResp2.json();
                                 const ok2 =
                                    Array.isArray(payments2) &&
                                    payments2.some(
                                       (p: any) =>
                                          p.status === "completed" ||
                                          p.status === "successful"
                                    );
                                 setPaymentVerified(!!ok2);
                                 if (ok2) {
                                    toast.success(
                                       "Payment verified and order created. Redirecting to order..."
                                    );
                                    // Clear reference and navigate to order
                                    try {
                                       sessionStorage.removeItem(
                                          "kpay_reference"
                                       );
                                    } catch (e) {}
                                    try {
                                       clearCheckoutStorage();
                                    } catch (e) {}
                                    setTimeout(
                                       () =>
                                          router.push(
                                             `/orders/${finData.orderId}`
                                          ),
                                       250
                                    );
                                    return;
                                 }
                              }
                           } catch (e) {
                              // ignore verification error
                           }
                        }
                     }
                  } catch (err) {
                     console.error("Failed to finalize session:", err);
                  }
               }

               // If not found yet, wait then retry
               await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
            }

            if (mounted) {
               const msg =
                  "Payment verification timed out. You can retry or choose another payment method.";
               toast.error(msg);
               setPaymentFailure({ kind: "timedout", message: msg, reference });
               try {
                  // keep the reference in storage so finalize can still pick it up if webhook runs later
                  // sessionStorage.removeItem("kpay_reference");
               } catch (e) {}
            }
         } catch (err) {
            console.error("Failed to poll payment status by reference:", err);
         }
      };

      try {
         const p =
            searchParams?.get("payment") ||
            (typeof window !== "undefined"
               ? new URLSearchParams(window.location.search).get("payment")
               : null);
         const oid =
            searchParams?.get("orderId") ||
            (typeof window !== "undefined"
               ? new URLSearchParams(window.location.search).get("orderId")
               : null);

         // If already handled by the orderId-based flow above, skip
         if (p === "success" && oid) return;

         if (p === "success" && !oid) {
            try {
               const ref =
                  typeof window !== "undefined"
                     ? sessionStorage.getItem("kpay_reference")
                     : null;
               if (ref) {
                  // trigger a best-effort status check so DB may be up-to-date
                  fetch(`/api/payments/kpay/status`, {
                     method: "POST",
                     headers: { "Content-Type": "application/json" },
                     body: JSON.stringify({ reference: ref }),
                  }).catch(() => {});
               }
            } catch (e) {}

            // Inform the user that payment was successful and they can place order
            toast.success(
               "Payment completed successfully. You can now finalize your order on this page."
            );
            // Mark payment as verified for session-based flows so the Place Order button becomes enabled
            try {
               setPaymentVerified(true);
            } catch (e) {}
            // Do not clear paymentReturnedOrderId - allow user to create order which will trigger linking
            return;
         }

         // Check for stored reference and start polling by reference only if present
         const ref =
            typeof window !== "undefined"
               ? sessionStorage.getItem("kpay_reference")
               : null;
         if (ref) {
            // start polling
            checkReference(ref);
         }
      } catch (e) {
         /* ignore */
      }

      return () => {
         mounted = false;
      };
   }, [searchParams]);

   useEffect(() => {
      try {
         // If there are no saved addresses, nothing to do
         if (!Array.isArray(savedAddresses) || savedAddresses.length === 0)
            return;
         if (effectiveIsRetry) {
            const persisted = loadCheckoutFromStorage();
            if (persisted && persisted.formData) {
               const orderAddrRaw = (
                  persisted.formData.address || ""
               ).toLowerCase();
               const orderCity = (persisted.formData.city || "").toLowerCase();
               const orderPhone = persisted.formData.phone || "";

               const match = savedAddresses.find((addr: any) => {
                  const addrStr = [addr.display_name, addr.street, addr.city]
                     .filter(Boolean)
                     .join(" ")
                     .toLowerCase();

                  return (
                     (orderAddrRaw &&
                        orderAddrRaw.length > 0 &&
                        addrStr.includes(orderAddrRaw)) ||
                     (orderCity &&
                        orderCity.length > 0 &&
                        addrStr.includes(orderCity)) ||
                     (addr.phone && orderPhone && addr.phone === orderPhone)
                  );
               });

               if (match) {
                  if (selectedAddress?.id !== match.id) {
                     selectAddress(match.id);
                     const foundSector = sectors.find(
                        (s: any) =>
                           s.sct_name === match.street ||
                           s.sct_name === match.display_name ||
                           s.sct_name === match.city
                     );
                     if (foundSector) {
                        setSelectedSector(foundSector.sct_id);
                        setSelectedDistrict(foundSector.sct_district);
                        const foundDistrict = districts.find(
                           (d) => d.dst_id === foundSector.sct_district
                        );
                        if (foundDistrict)
                           setSelectedProvince(foundDistrict.dst_province);
                     }

                     setFormData((prev) => ({
                        ...prev,
                        address: match.display_name || prev.address,
                        city: match.city || prev.city,
                        phone: match.phone || prev.phone,
                     }));
                  }
               }
            }

            return;
         }

         // If not in retry mode, do nothing here.
      } catch (err) {
         console.error("Address preselect error:", err);
      }
   }, [effectiveIsRetry, savedAddresses, selectedAddress, sectors, districts]);

   useEffect(() => {
      try {
         if (!Array.isArray(savedAddresses) || savedAddresses.length === 0) {
            return;
         }

         // If there is already a selected address, do not override it
         if (selectedAddress) return;

         // Prefer the explicit default
         let pick = savedAddresses.find((a: any) => a.is_default);

         // If none marked default, but there's only one address, pick it
         if (!pick && savedAddresses.length === 1) pick = savedAddresses[0];

         // Otherwise fall back to the first address in the list
         if (!pick) pick = savedAddresses[0];

         if (pick) {
            // capture values locally to avoid TS complaints about possibly undefined pick within closures
            const _pick = pick as any;
            selectAddress(_pick.id);

            // Populate form fields with picked address
            setFormData((prev) => ({
               ...prev,
               address: _pick.display_name || prev.address,
               city: _pick.city || prev.city,
               phone: _pick.phone || prev.phone,
            }));

            // Try to match location selections based on picked address
            const foundSector = sectors.find(
               (s: any) =>
                  s.sct_name === _pick.street ||
                  s.sct_name === _pick.display_name ||
                  s.sct_name === _pick.city
            );
            if (foundSector) {
               setSelectedSector(foundSector.sct_id);
               setSelectedDistrict(foundSector.sct_district);
               const foundDistrict = districts.find(
                  (d) => d.dst_id === foundSector.sct_district
               );
               if (foundDistrict)
                  setSelectedProvince(foundDistrict.dst_province);
            }
         }
      } catch (err) {
         console.error("Auto-select address error:", err);
      }
   }, [savedAddresses, selectedAddress, sectors, districts, selectAddress]);

   // If a saved address is selected but location lists (sectors/districts)
   // were not available at the time of selection, attempt to derive the
   // corresponding sector/district/province once those lists load.
   useEffect(() => {
      try {
         if (!selectedAddress) return;
         // If province already set, nothing to do
         if (selectedProvince) return;
         if (!Array.isArray(sectors) || sectors.length === 0) return;

         const foundSector = sectors.find(
            (s: any) =>
               s.sct_name === selectedAddress.street ||
               s.sct_name === selectedAddress.display_name ||
               s.sct_name === selectedAddress.city
         );
         if (foundSector) {
            setSelectedSector(foundSector.sct_id);
            setSelectedDistrict(foundSector.sct_district);
            const foundDistrict = districts.find(
               (d: any) => d.dst_id === foundSector.sct_district
            );
            if (foundDistrict) setSelectedProvince(foundDistrict.dst_province);
         }
      } catch (err) {
         console.error("Address -> location post-sync error:", err);
      }
   }, [selectedAddress, selectedProvince, sectors, districts]);

   // Show a small banner when retrying due to timeout
   const retryTimedOut = Boolean(searchParams?.get("timedout"));

   // Fetch orders_enabled flag and subscribe for realtime changes
   useEffect(() => {
      let mounted = true;
      (async () => {
         try {
            const res = await fetch("/api/admin/settings/orders-enabled");
            if (!res.ok) {
               if (mounted) {
                  setOrdersEnabled(null);
                  setOrdersSource(null);
                  setOrdersDisabledMessage(null);
               }
            } else {
               const j = await res.json();
               if (mounted) {
                  setOrdersEnabled(Boolean(j.enabled));
                  setOrdersSource(j.source || null);
                  setOrdersDisabledMessage(j.message || null);
               }
            }
         } catch (err) {
            console.warn("Failed to fetch orders_enabled flag:", err);
            if (mounted) {
               setOrdersEnabled(null);
               setOrdersSource(null);
               setOrdersDisabledMessage(null);
            }
         }
      })();

      // Realtime subscription to site_settings changes
      const channel = supabase
         .channel("site_settings_orders_enabled")
         .on(
            "postgres_changes",
            {
               event: "*",
               schema: "public",
               table: "site_settings",
               filter: "key=eq.orders_enabled",
            },
            (payload: any) => {
               try {
                  const next = payload?.new?.value;
                  const enabled =
                     next === true ||
                     String(next) === "true" ||
                     (next && next === "true");
                  setOrdersEnabled(Boolean(enabled));
               } catch (e) {}
            }
         )
         .subscribe();

      return () => {
         mounted = false;
         try {
            supabase.removeChannel(channel);
         } catch (e) {}
      };
   }, []);

   // Keep local orderItems in sync with cart context
   useEffect(() => {
      try {
         // If in retry mode, try to restore a persisted lightweight checkout snapshot
         if (effectiveIsRetry) {
            const persisted = loadCheckoutFromStorage();
            if (persisted) {
               if (persisted.cart && Array.isArray(persisted.cart)) {
                  try {
                     setOrderItems(persisted.cart);
                  } catch (e) {
                     console.warn("Failed to restore persisted cart:", e);
                  }
               }

               if (persisted.formData) {
                  setFormData((prev) => ({ ...prev, ...persisted.formData }));
               }

               // reset certain transient UI state when restoring
               setPaymentMethod("");
               setMobileMoneyPhones({});

               // Clear the persisted checkout data to prevent old payment method from being restored
               clearCheckoutStorage();

               // Fetch previous payment method for retry notice
               if (effectiveRetryOrderId) {
                  (async () => {
                     try {
                        const resp = await fetch(`/api/payments/order/${effectiveRetryOrderId}`);
                        if (resp.ok) {
                           const payments = await resp.json();
                           if (Array.isArray(payments) && payments.length > 0) {
                              // Get the most recent failed payment
                              const failedPayment = payments
                                 .filter((p: any) => p.status === 'failed' || p.status === 'cancelled' || p.status === 'timeout')
                                 .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

                              if (failedPayment) {
                                 setPreviousPaymentMethod(failedPayment.payment_method);
                              }
                           }
                        }
                     } catch (e) {
                        console.warn("Failed to fetch previous payment method:", e);
                     }
                  })();
               }

               return;
            }
         }

         // Normal path: sync from CartContext items into local orderItems
         if (Array.isArray(cartItems)) {
            console.debug("CheckoutPage: Syncing cart items to order items");
            const cleaned = cartItems.map((item: any) => ({
               ...item,
               id:
                  typeof item.id === "string"
                     ? item.id.replace(/-$/, "")
                     : item.id,
               variation_id:
                  typeof item.product_variation_id === "string"
                     ? item.product_variation_id.replace(/-$/, "")
                     : item.variation_id || item.product_variation_id,
            }));
            setOrderItems(cleaned);
            setIsBuyNowFlow(false);
         }
      } catch (err) {
         console.error(
            "CheckoutPage: Error syncing/restoring cart items:",
            err
         );
      }

      // Pre-fill user data if logged in (only when not in retry mode)
      if (user && !effectiveIsRetry) {
         console.debug("CheckoutPage: Pre-filling user data");
         setFormData((prev) => ({
            ...prev,
            email: user.email || "",
            fullName: user.user_metadata?.full_name || "",
         }));
      }
   }, [cartItems, user, effectiveIsRetry]);

   // Buy-now sync: prefer buy-now item over cart when present
   const { item: buyNowItem, clearBuyNowItem } = useBuyNow();

   useEffect(() => {
      try {
         if (buyNowItem) {
            // adapt shape to CartItem
            const mapped: any = {
               id: buyNowItem.id,
               product_id: buyNowItem.product_id,
               name: buyNowItem.name,
               price: buyNowItem.price,
               quantity: buyNowItem.quantity || 1,
               variation_name: buyNowItem.variant,
            };
            setOrderItems([mapped]);
            setIsBuyNowFlow(true);
         } else {
            // If buyNow cleared and cart has items, restore cart sync
            if (Array.isArray(cartItems) && cartItems.length > 0) {
               const cleaned = cartItems.map((item: any) => ({
                  ...item,
                  id:
                     typeof item.id === "string"
                        ? item.id.replace(/-$/, "")
                        : item.id,
                  variation_id:
                     typeof item.product_variation_id === "string"
                        ? item.product_variation_id.replace(/-$/, "")
                        : item.variation_id || item.product_variation_id,
               }));
               setOrderItems(cleaned);
               setIsBuyNowFlow(false);
            }
         }
      } catch (e) {
         console.error("BuyNow sync failed:", e);
      }
   }, [buyNowItem, cartItems]);

   // Load location data from JSON imports
   useEffect(() => {
      try {
         const extract = (j: any, namePart: string) => {
            if (!j) return [];
            if (Array.isArray(j)) {
               const table = j.find(
                  (x) => x.type === "table" && x.name?.includes(namePart)
               );
               return table?.data || [];
            }
            if (j.type === "table" && j.data) return j.data;
            return [];
         };

         setProvinces(extract(provincesJson, "1_provinces"));
         setDistricts(extract(districtsJson, "2_districts"));
         setSectors(extract(sectorsJson, "3_sectors"));
      } catch (err) {
         console.error("Failed to load location data:", err);
      }
   }, []);

   // Update dependent lists when selections change
   useEffect(() => {
      if (!selectedProvince) return;
      setSelectedDistrict(null);
      setSelectedSector(null);
   }, [selectedProvince]);

   useEffect(() => {
      if (!selectedDistrict) return;
      setSelectedSector(null);
   }, [selectedDistrict]);

   // Redirect if cart is empty (but not in retry mode or while submitting/initiating payment)
   useEffect(() => {
      if (
         orderItems.length === 0 &&
         !isRetryMode &&
         !isSubmitting &&
         !isInitiating &&
         !paymentInProgress &&
         !suppressEmptyCartRedirect
      ) {
         const timer = setTimeout(() => {
            router.push("/");
         }, 3000);
         return () => clearTimeout(timer);
      }
      return;
   }, [
      orderItems.length,
      router,
      isRetryMode,
      isSubmitting,
      isInitiating,
      paymentInProgress,
   ]);

   const { subtotal, selectedSectorObj, transport, total } = useCheckoutTotals({
      orderItems,
      sectors,
      sectorsFees,
      selectedAddress,
      selectedSector,
      hasAddress: Boolean(
         // Determine isKigali and hasAddress inline to keep behavior identical
         (selectedAddress &&
            (selectedAddress.display_name || selectedAddress.city)) ||
            (formData.address && formData.address.trim())
      ),
   });

   const {
      hasItems,
      isKigali,
      hasAddress,
      hasEmail,
      hasValidPhone,
      paymentRequiresVerification,
      missingSteps,
      allStepsCompleted,
      selectedProvinceObj,
   } = useCheckoutFlags({
      orderItemsCount: orderItems.length,
      selectedAddress: effectiveAddress,
      formData,
      selectedProvince,
      provinces,
      selectedSector,
      sectors,
      formatPhoneNumber,
      paymentMethod: paymentMethod as any,
      paymentVerified,
      effectiveIsRetry,
      ordersEnabled,
      ordersSource,
      scheduleConfirmChecked,
   });

   // payment URL/session helpers
   const urlPaymentParam =
      typeof window !== "undefined"
         ? new URLSearchParams(window.location.search).get("payment")
         : null;
   const urlOrderIdParam =
      typeof window !== "undefined"
         ? new URLSearchParams(window.location.search).get("orderId")
         : null;
   const sessionPaymentSuccess =
      urlPaymentParam === "success" && !urlOrderIdParam;

   const getProvinceLabel = (p: any) => {
      const raw = String(p?.prv_name || "").toLowerCase();
      if (
         raw.includes("south") ||
         raw.includes("majyepfo") ||
         raw.includes("amajyepfo")
      )
         return t("province.south");
      if (
         raw.includes("north") ||
         raw.includes("amajyaruguru") ||
         raw.includes("amajyaruguru")
      )
         return t("province.north");
      if (raw.includes("east") || raw.includes("iburasirazuba"))
         return t("province.east");
      if (raw.includes("west") || raw.includes("iburengerazuba"))
         return t("province.west");

      const slug = raw.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      const tryKey = `province.${slug}`;
      const resolved = t(tryKey);
      if (resolved !== tryKey) return resolved;
      return p?.prv_name || tryKey;
   };

   // Form validation
   // Helper to derive a reasonable city value from selected location or saved address
   const deriveCity = () => {
      // Priority: selectedSector (sector name) -> selectedDistrict (district name) -> selectedProvince (province name) -> selectedAddress.city -> formData.city
      try {
         if (selectedSector) {
            const s = sectors.find(
               (x) => String(x.sct_id) === String(selectedSector)
            );
            if (s && s.sct_name) return s.sct_name;
         }

         if (selectedDistrict) {
            const d = districts.find(
               (x) => String(x.dst_id) === String(selectedDistrict)
            );
            if (d && d.dst_name) return d.dst_name;
         }

         if (selectedProvince) {
            const p = provinces.find(
               (x) => String(x.prv_id) === String(selectedProvince)
            );
            if (p && p.prv_name) return p.prv_name;
         }

         if (selectedAddress?.city) return selectedAddress.city;

         if (formData.city && formData.city.trim()) return formData.city.trim();
      } catch (err) {
         console.error("deriveCity error:", err);
      }

      return "";
   };

   const validateForm = () => {
      const formErrors: any = {};
      const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

      // First/last name are optional on the checkout form because the
      // customer's name should be derived from their user profile when
      // they're logged in. If not logged in, fallback to form values.

      // For logged in users, validate email if provided
      if (isLoggedIn && formData.email && formData.email.trim()) {
         if (!emailPattern.test(formData.email)) {
            formErrors.email =
               t("checkout.errors.validEmailRequired") ||
               "Please enter a valid email";
         }
      }
      // For guest users, email is no longer required (removed from form)

      // When placing an order as a guest require the customer's name and phone
      if (!isLoggedIn) {
         if (!formData.fullName || !String(formData.fullName).trim()) {
            formErrors.fullName =
               t("checkout.errors.fullNameRequired") || "Full name is required";
         }

         try {
            // Phone may come from the selected address; prefer that when present
            const phoneToValidate =
               (selectedAddress && selectedAddress.phone) ||
               formData.phone ||
               "";
            phoneSchema.parse({ phone: phoneToValidate });
         } catch (ve: any) {
            const first =
               ve?.errors?.[0]?.message || t("checkout.errors.validPhone");
            formErrors.phone = first;
         }
      }

      const hasAddressValue =
         (formData.address && formData.address.trim()) || selectedAddress;
      if (!hasAddressValue)
         formErrors.address =
            t("checkout.errors.addressRequired") ||
            "Delivery address is required";

      // City is derived from selected location (sector/district/province) or saved address.
      // Do not require the user to enter a separate `city` value.

      return formErrors;
   };

   const handleGuestPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      const formatted = formatPhoneInput(input);
      setFormData((prev) => ({ ...prev, phone: formatted }));
      if (errors?.phone)
         setErrors((prev: any) => ({ ...prev, phone: undefined }));
   };

   // NOTE: Retry flows no longer rely on fetching existing orders server-side.
   // We removed server-order-dependent retry logic. The checkout now uses the
   // persisted local storage snapshot (CHECKOUT_STORAGE_KEY) and the current
   // in-memory cart to initiate a new payment session.

   // Handle order creation or retry payment (moved into hook)
   const handleCreateOrder = useSubmitOrder({
      isSubmitting,
      setPaymentFailure,
      validateForm,
      orderItems,
      t,
      toast,
      setIsSubmitting,
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
      setSuppressEmptyCartRedirect,
      setPreventPersistence,
      clearCart,
      setOrderItems,
      clearAllCheckoutClientState,
      router,
      setPaymentInProgress,
      mobileMoneyPhones,
      initiatePayment,
      formatPhoneNumber,
      validatePaymentRequest,
      paymentVerified,
      selectedAddress: effectiveAddress,
      scheduleNotes,
      ordersDisabledMessage,
      paymentMethod,
      effectiveIsRetry,
      effectiveRetryOrderId,
   });

   const generateWhatsAppMessage = () => {
      const productDetails = orderItems
         .map((item) => {
            // Prefer explicit product_id when available, otherwise use item.id
            const productId = (item as any).product_id || item.id || "";
            const productLink = `https://nihemart.rw/products/${productId}`;

            const lines: string[] = [];
            // Line 1: product name (variation) x qty - total
            lines.push(
               `${item.name}${
                  item.variation_name ? ` (${item.variation_name})` : ""
               } x${item.quantity} - ${(
                  item.price * item.quantity
               ).toLocaleString()} RWF`
            );

            // SKU line if available
            if (item.sku) lines.push(`SKU: ${item.sku}`);

            // Variation id if present
            if ((item as any).variation_id)
               lines.push(`Variation ID: ${(item as any).variation_id}`);

            // Product link
            lines.push(`Link: ${productLink}`);

            return lines.join("\n");
         })
         .join("\n\n");

      const derivedCity = deriveCity();

      const message = `
*New Order Request*

*Customer Details:*
   Name: ${formData.fullName}
Email: ${formData.email}
Phone: ${formData.phone}
Address: ${formData.address}, ${derivedCity || formData.city}

*Products:*
${productDetails}

*Order Summary:*
Subtotal: ${subtotal.toLocaleString()} RWF
Transport: ${transport.toLocaleString()} RWF
Total: ${total.toLocaleString()} RWF
    `;
      // If schedule notes exist (customer confirmed outside working hours), append them
      let final = message;
      if (
         ordersEnabled === false &&
         ordersSource === "schedule" &&
         scheduleNotes
      ) {
         final = final + `\n\nSchedule notes:\n${scheduleNotes}`;
      }
      return encodeURIComponent(final);
   };

   const handleWhatsAppCheckout = () => {
      const formErrors = validateForm();
      if (Object.keys(formErrors).length > 0) {
         setErrors(formErrors);
         return;
      }

      if (orderItems.length === 0) {
         toast.error("Your cart is empty");
         return;
      }

      // Respect orders-enabled flag for WhatsApp flow as well
      if (ordersEnabled === false) {
         if (ordersSource === "admin") {
            toast.error(
               ordersDisabledMessage ||
                  t("checkout.ordersDisabledMessage") ||
                  "Ordering is currently disabled by the admin."
            );
            return;
         }

         if (ordersSource === "schedule" && !scheduleConfirmChecked) {
            // Prompt the user to check the confirmation checkbox
            toast.info(
               t("checkout.confirmScheduleDelivery") ||
                  "Please confirm you want this order delivered tomorrow during working hours by checking the box below."
            );
            return;
         }
      }

      // Updated WhatsApp number (international format without +)
      const phoneNumber = "250792412177";
      const message = generateWhatsAppMessage();
      const url = `https://wa.me/${phoneNumber}?text=${message}`;
      window.open(url, "_blank");
   };

   // Show empty cart message (but not in retry mode)
   if (orderItems.length === 0 && !isRetryMode) {
      return (
         <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="text-center py-12">
               <ShoppingCart className="h-16 w-16 sm:h-24 sm:w-24 text-muted-foreground mx-auto mb-4 sm:mb-6" />
               <h1 className="text-xl sm:text-3xl font-bold mb-3 sm:mb-4 px-2">
                  {t("checkout.cartEmptyTitle")}
               </h1>
               <p className="text-muted-foreground mb-6 sm:mb-8 px-4 text-sm sm:text-base">
                  {t("checkout.cartEmptyInfo")}
               </p>
               <Button
                  onClick={() => router.push("/")}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-sm sm:text-base"
               >
                  {t("checkout.continueShopping")}
               </Button>
            </div>
         </div>
      );
   }

   return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-[90vw]">
         <CheckoutHeader
            title={
               isRetryMode
                  ? "Retry Payment with Different Method"
                  : t("checkout.title")
            }
            missingSteps={missingSteps}
            t={t}
            isRetryMode={isRetryMode}
            previousPaymentMethod={previousPaymentMethod}
         />

         {/* Payment failure banner removed - redundant in retry mode */}

         {/* Finalizing banner shown while attempting to finalize a returned session */}
         {isFinalizing && (
            <div className="sticky top-16 z-40 mb-4">
               <div className="mx-auto max-w-[90vw] sm:max-w-7xl px-2 sm:px-0">
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 shadow-sm">
                     <div className="flex items-center gap-3">
                        <Loader2 className="animate-spin h-4 w-4" />
                        <div className="text-sm">
                           Finalizing payment, please wait...
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* Retry mode banner with previous payment method info */}
         {isRetryMode && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
               <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-blue-600 mr-3" />
                  <div className="flex-1">
                     <p className="text-sm font-medium text-blue-900">
                        Retry Payment
                     </p>
                     <p className="text-xs text-blue-700 mt-1">
                        Previous payment failed or timed out. Choose a different
                        payment method below. Your cart and delivery details
                        were restored from your browser.
                     </p>
                     <div className="mt-2 text-xs text-blue-800 space-y-1">
                        <div>Amount: RWF {Number(total).toLocaleString()}</div>
                        {(() => {
                           const persisted = loadCheckoutFromStorage();
                           const oldMethod = persisted?.paymentMethod;
                           if (oldMethod) {
                              const methodName = 
                                 oldMethod === "mtn_momo" ? "MTN Mobile Money" :
                                 oldMethod === "airtel_money" ? "Airtel Money" :
                                 oldMethod === "visa_card" ? "Visa Card" :
                                 oldMethod === "mastercard" ? "MasterCard" :
                                 oldMethod === "cash_on_delivery" ? "Cash on Delivery" :
                                 oldMethod;
                              return (
                                 <div className="flex items-center gap-2">
                                    <span>Previous method:</span>
                                    <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-medium">
                                       {methodName}
                                    </span>
                                 </div>
                              );
                           }
                           return null;
                        })()}
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* Retry timeout banner removed - redundant, user already knows */}

         {/* Loading existing order */}
         {/* No server-side order loading in retry mode; state is restored from localStorage */}

         <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
            {/* Left Column - Forms */}
            <div className="space-y-5 sm:space-y-7">
               {/* Add delivery address section */}
               <div className="space-y-4 sm:space-y-5 border border-gray-200 rounded-xl p-4 sm:p-5 bg-gradient-to-b from-gray-50 to-white shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                     <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                           <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                        </div>
                        <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                           {t("checkout.addDeliveryAddress")}
                        </h2>
                     </div>
                     {isLoggedIn ? (
                        <Button
                           onClick={() => {
                              setAddNewOpen(true);
                              setAddressOpen(false);
                              setSelectedProvince(null);
                              setSelectedDistrict(null);
                              setSelectedSector(null);
                              setHouseNumber("");
                              setPhoneInput("");
                              setEditingAddressId(null);
                           }}
                           size="sm"
                           variant="outline"
                           className="border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-400 w-full sm:w-auto text-xs sm:text-sm"
                        >
                           <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                           {t("checkout.addNewAddress")}
                        </Button>
                     ) : (
                        <Button
                           onClick={() => {
                              setAddNewOpen(true);
                              setAddressOpen(false);
                              setSelectedProvince(null);
                              setSelectedDistrict(null);
                              setSelectedSector(null);
                              setHouseNumber("");
                              setPhoneInput("");
                              setEditingAddressId(null);
                           }}
                           size="sm"
                           variant="outline"
                           className="border-gray-300 text-gray-700 hover:bg-gray-50 w-full sm:w-auto text-xs sm:text-sm"
                        >
                           <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                           {t("checkout.addAddress")}
                        </Button>
                     )}

                     {/* Guest details form removed from address header; shown below payment section for guests only */}
                  </div>

                  {/* Add New Address (collapsible) */}
                  <Collapsible
                     open={addNewOpen}
                     onOpenChange={setAddNewOpen}
                  >
                     <CollapsibleTrigger asChild>
                        <div className="mt-2"></div>
                     </CollapsibleTrigger>
                     <CollapsibleContent className="mt-3 sm:mt-4">
                        <CheckoutAddressForm
                           provinces={provinces}
                           districts={districts}
                           sectors={sectors}
                           selectedProvince={selectedProvince}
                           setSelectedProvince={setSelectedProvince}
                           selectedDistrict={selectedDistrict}
                           setSelectedDistrict={setSelectedDistrict}
                           selectedSector={selectedSector}
                           setSelectedSector={setSelectedSector}
                           houseNumber={houseNumber}
                           setHouseNumber={setHouseNumber}
                           phoneInput={phoneInput}
                           setPhoneInput={setPhoneInput}
                           editingAddressId={editingAddressId}
                           setEditingAddressId={setEditingAddressId}
                           saveAddress={saveAddress}
                           updateAddress={updateAddress}
                           reloadSaved={reloadSaved}
                           setAddNewOpen={setAddNewOpen}
                           setAddressOpen={setAddressOpen}
                           onUseDirectly={handleUseAddressDirectly}
                           isLoggedIn={isLoggedIn}
                           t={t}
                        />
                     </CollapsibleContent>
                  </Collapsible>

                  {/* Select delivery address */}
                  <Collapsible
                     open={addressOpen}
                     onOpenChange={setAddressOpen}
                  >
                     <CollapsibleTrigger asChild>
                        <button className="w-full text-left p-3 sm:p-3.5 flex items-center justify-between text-gray-700 hover:text-orange-600 hover:bg-orange-50/50 transition-all rounded-lg border border-gray-200 bg-white">
                           <span className="text-xs sm:text-sm font-medium">
                              {t("checkout.selectDeliveryAddress")}
                           </span>
                           {addressOpen ? (
                              <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 transition-transform" />
                           ) : (
                              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 transition-transform" />
                           )}
                        </button>
                     </CollapsibleTrigger>
                     <CollapsibleContent className="mt-3 sm:mt-4">
                        <div className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50">
                           {(() => {
                              // Combine saved addresses with temp address
                              const allAddresses = [];
                              
                              // Add temp address first if it exists
                              if (tempCheckoutAddress) {
                                 allAddresses.push(tempCheckoutAddress);
                              }
                              
                              // Add saved addresses
                              if (savedAddresses && savedAddresses.length > 0) {
                                 allAddresses.push(...savedAddresses);
                              }
                              
                              return allAddresses.length > 0 ? (
                              <div className="space-y-2 sm:space-y-3">
                                 {allAddresses.map((addr) => (
                                    <div
                                       key={addr.id}
                                       role="button"
                                       tabIndex={0}
                                       onClick={() => {
                                          // Handle temp address differently
                                          if (addr._isTemp) {
                                             // Just select it, don't clear it
                                             setFormData((prev) => ({
                                                ...prev,
                                                address: addr.street || addr.display_name || "",
                                                city: addr.city || "",
                                                phone: addr.phone || "",
                                             }));
                                             setAddressOpen(false);
                                             toast.success("Address selected");
                                             return;
                                          }

                                          // Clear temp address when selecting a saved one
                                          setTempCheckoutAddress(null);
                                          try {
                                             localStorage.removeItem('checkout_temp_address');
                                          } catch (error) {
                                             console.error("Error clearing temp address:", error);
                                          }

                                          selectAddress(addr.id);
                                          const foundSector = sectors.find(
                                             (s) =>
                                                s.sct_name === addr.street ||
                                                s.sct_name ===
                                                   addr.display_name ||
                                                s.sct_name === addr.city
                                          );
                                          if (foundSector) {
                                             setSelectedSector(
                                                foundSector.sct_id
                                             );
                                             setSelectedDistrict(
                                                foundSector.sct_district
                                             );
                                             const foundDistrict =
                                                districts.find(
                                                   (d) =>
                                                      d.dst_id ===
                                                      foundSector.sct_district
                                                );
                                             if (foundDistrict)
                                                setSelectedProvince(
                                                   foundDistrict.dst_province
                                                );
                                          }
                                          const streetOrName =
                                             addr.street ??
                                             addr.display_name ??
                                             "";
                                          const firstSegment =
                                             streetOrName
                                                .split(",")
                                                .map((p: string) => p.trim())
                                                .filter(Boolean)[0] ||
                                             streetOrName;
                                          setFormData((prev) => ({
                                             ...prev,
                                             address:
                                                firstSegment || prev.address,
                                             city: addr.city ?? prev.city,
                                             phone: addr.phone ?? prev.phone,
                                          }));

                                          // Close the address selection
                                          setAddressOpen(false);
                                          toast.success("Address selected");
                                       }}
                                       onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                             // Handle temp address differently
                                             if (addr._isTemp) {
                                                setFormData((prev) => ({
                                                   ...prev,
                                                   address: addr.street || addr.display_name || "",
                                                   city: addr.city || "",
                                                   phone: addr.phone || "",
                                                }));
                                                setAddressOpen(false);
                                                toast.success("Address selected");
                                                return;
                                             }

                                             // Clear temp address when selecting a saved one
                                             setTempCheckoutAddress(null);
                                             try {
                                                localStorage.removeItem('checkout_temp_address');
                                             } catch (error) {
                                                console.error("Error clearing temp address:", error);
                                             }

                                             selectAddress(addr.id);
                                             const foundSector = sectors.find(
                                                (s) =>
                                                   s.sct_name === addr.street ||
                                                   s.sct_name ===
                                                      addr.display_name ||
                                                   s.sct_name === addr.city
                                             );
                                             if (foundSector) {
                                                setSelectedSector(
                                                   foundSector.sct_id
                                                );
                                                setSelectedDistrict(
                                                   foundSector.sct_district
                                                );
                                                const foundDistrict =
                                                   districts.find(
                                                      (d) =>
                                                         d.dst_id ===
                                                         foundSector.sct_district
                                                   );
                                                if (foundDistrict)
                                                   setSelectedProvince(
                                                      foundDistrict.dst_province
                                                   );
                                             }
                                             const streetOrName =
                                                addr.street ??
                                                addr.display_name ??
                                                "";
                                             const firstSegment =
                                                streetOrName
                                                   .split(",")
                                                   .map((p: string) => p.trim())
                                                   .filter(Boolean)[0] ||
                                                streetOrName;

                                             setFormData((prev) => ({
                                                ...prev,
                                                address:
                                                   firstSegment || prev.address,
                                                city: addr.city ?? prev.city,
                                                phone: addr.phone ?? prev.phone,
                                             }));

                                             // Close the address selection
                                             setAddressOpen(false);
                                             toast.success("Address selected");
                                          }
                                       }}
                                       className={`p-3 sm:p-4 rounded-lg cursor-pointer transition-all duration-200 border-2 bg-white hover:border-orange-300 hover:shadow-sm ${
                                          (addr._isTemp && tempCheckoutAddress) || selectedAddress?.id === addr.id
                                             ? "border-orange-400 bg-orange-50 shadow-sm"
                                             : "border-gray-200"
                                       }`}
                                    >
                                       <div className="flex items-start">
                                          <div className="flex items-center mr-2 sm:mr-3 mt-0.5">
                                             <div
                                                className={`h-3 w-3 sm:h-4 sm:w-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                                                   (addr._isTemp && tempCheckoutAddress) || selectedAddress?.id === addr.id
                                                      ? "bg-orange-500 border-orange-500"
                                                      : "border-gray-300"
                                                }`}
                                             >
                                                {((addr._isTemp && tempCheckoutAddress) || selectedAddress?.id === addr.id) && (
                                                   <div className="h-1 w-1 sm:h-2 sm:w-2 bg-white rounded-full" />
                                                )}
                                             </div>
                                          </div>
                                          <div className="flex-1 min-w-0">
                                             <div className="flex items-center gap-2 mb-0.5">
                                                <p className="font-medium text-xs sm:text-sm text-gray-800 truncate">
                                                   {addr.display_name}
                                                </p>
                                                {addr._isTemp && (
                                                   <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                                                      {t("checkout.tempAddress") || "Temporary"}
                                                   </span>
                                                )}
                                             </div>
                                             <p className="text-xs text-gray-600 mt-0.5">
                                                {addr.city}
                                             </p>
                                             {addr.phone && (
                                                <p className="text-xs text-orange-600 mt-1">
                                                   {t(
                                                      "checkout.contactPhoneLabel"
                                                   )}{" "}
                                                   {addr.phone}
                                                </p>
                                             )}
                                          </div>
                                       </div>
                                    </div>
                                 ))}
                                 <div className="flex flex-col sm:flex-row justify-between pt-3 sm:pt-4 gap-2 sm:gap-0">
                                    {isLoggedIn && (
                                       <Button
                                          variant="outline"
                                          className="border-orange-300 text-orange-600 hover:bg-orange-50 text-xs sm:text-sm h-9 sm:h-10"
                                          onClick={() =>
                                             router.push("/addresses")
                                          }
                                       >
                                          Manage Addresses
                                       </Button>
                                    )}
                                    <Button
                                       className="bg-orange-500 hover:bg-orange-600 text-white px-4 text-xs sm:text-sm h-9 sm:h-10"
                                       onClick={() => {
                                          setAddressOpen(false);
                                          setInstructionsOpen(true);
                                       }}
                                    >
                                       {t("common.next")}
                                    </Button>
                                 </div>
                              </div>
                           ) : (
                              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
                                 <div className="flex items-start gap-2">
                                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                       <p className="text-xs sm:text-sm font-semibold text-orange-900">
                                          {t("checkout.noSavedAddresses") ||
                                             "No saved addresses"}
                                       </p>
                                       <p className="text-xs text-orange-700 mt-1">
                                          Please add a delivery address above to
                                          continue with your order.
                                       </p>
                                    </div>
                                 </div>
                              </div>
                           );
                           })()}
                        </div>
                     </CollapsibleContent>
                  </Collapsible>
               </div>

               {/* Guest details (for unauthenticated users) - displayed explicitly without collapsible */}
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

               {/* Delivery instructions section - simplified, no collapse/expand required */}
               <div className="space-y-4 sm:space-y-5 border border-gray-200 rounded-xl p-4 sm:p-5 bg-gradient-to-b from-gray-50 to-white shadow-sm">
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-2">
                     <div className="p-2 bg-blue-100 rounded-lg">
                        <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                     </div>
                     <span className="text-base sm:text-lg font-semibold text-gray-900">
                        {t("checkout.deliveryInstructions")}
                     </span>
                     <span className="text-xs text-gray-500">
                        ({t("common.optional") || "Optional"})
                     </span>
                  </div>
                  <div>
                     <textarea
                        id="delivery_notes"
                        rows={3}
                        placeholder={
                           t("checkout.writeDeliveryInstructions") ||
                           "Enter any special delivery instructions..."
                        }
                        value={formData.delivery_notes || ""}
                        onChange={(e) =>
                           setFormData((prev) => ({
                              ...prev,
                              delivery_notes: e.target.value,
                           }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none transition-colors text-xs sm:text-sm"
                     />
                     <p className="mt-2 text-xs text-gray-500">
                        {t("checkout.deliveryInstructionsHelper") ||
                           "Add any special instructions for delivery (e.g., landmarks, preferred time)"}
                     </p>
                  </div>
               </div>

               {/* Payment Method section */}
               <div className="space-y-4 sm:space-y-5 border border-gray-200 rounded-xl p-4 sm:p-5 bg-gradient-to-b from-gray-50 to-white shadow-sm">
                  <Collapsible
                     open={paymentOpen}
                     onOpenChange={setPaymentOpen}
                  >
                     <CollapsibleTrigger asChild>
                        <button className="w-full text-left p-0 flex items-center justify-between text-gray-700 hover:text-orange-600 transition-colors group">
                           <div className="flex items-center space-x-2 sm:space-x-3">
                              <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                                 <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                              </div>
                              <span className="text-base sm:text-lg font-semibold text-gray-900">
                                 {t("checkout.paymentMethod")}
                              </span>
                           </div>
                           {paymentOpen ? (
                              <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 transition-transform text-gray-500" />
                           ) : (
                              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 transition-transform text-gray-500" />
                           )}
                        </button>
                     </CollapsibleTrigger>
                     <CollapsibleContent className="mt-4 sm:mt-5">
                        <PaymentSection
                           paymentMethod={paymentMethod}
                           setPaymentMethod={setPaymentMethod}
                           handleMobileMoneyPhoneChange={
                              handleMobileMoneyPhoneChange
                           }
                           mobileMoneyPhones={mobileMoneyPhones}
                           disabled={isSubmitting || isInitiating}
                        />
                     </CollapsibleContent>
                  </Collapsible>
               </div>
            </div>

            {/* Order Summary - Right Side */}
            <div className="lg:sticky lg:top-4">
               <Card className="border border-gray-200 shadow-sm w-full max-w-full overflow-hidden">
                  <CardHeader className="pb-3 sm:pb-4">
                     <CardTitle className="text-base sm:text-lg font-medium text-gray-900">
                        {t("checkout.orderSummary")}
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                     <OrderItemsList
                        orderItems={orderItems}
                        onRemove={(it) => {
                           try {
                              if (isBuyNowFlow) {
                                 // clearing buy-now session and return user
                                 clearBuyNowItem();
                                 setOrderItems([]);
                                 // navigate back to product page if possible
                                 const pid =
                                    (it as any).product_id || (it as any).id;
                                 if (pid) {
                                    router.push(`/products/${pid}`);
                                 } else {
                                    router.push(`/`);
                                 }
                              } else {
                                 // remove from main cart and update view
                                 if ((it as any).id) {
                                    removeItem((it as any).id);
                                 }
                                 // update local list immediately
                                 setOrderItems((prev) =>
                                    prev.filter((x) => x.id !== it.id)
                                 );
                              }
                           } catch (e) {
                              console.error(
                                 "Failed to remove checkout item:",
                                 e
                              );
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

                     {/* Delivery Address & Order Buttons */}
                     <div className="space-y-2 sm:space-y-3 pt-3 sm:pt-4">
                        {selectedAddress && (
                           <div className="border-2 border-orange-200 p-3 sm:p-4 rounded-lg bg-gradient-to-r from-orange-50 to-white shadow-sm">
                              <div className="flex items-start justify-between gap-2">
                                 <div className="flex items-start min-w-0 flex-1">
                                    <div className="mr-2 sm:mr-3 mt-0.5 flex-shrink-0">
                                       <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                       <p className="text-xs sm:text-sm font-medium text-gray-900">
                                          {t("checkout.deliveringTo")}
                                       </p>
                                       <p className="text-xs sm:text-sm font-semibold text-gray-800 break-words">
                                          {selectedAddress.display_name}
                                       </p>
                                       <p className="text-xs text-gray-600 break-words">
                                          {selectedAddress.city}
                                          {selectedAddress.phone
                                             ? ` • ${selectedAddress.phone}`
                                             : ""}
                                       </p>
                                    </div>
                                 </div>
                                 {isLoggedIn && (
                                    <Button
                                       size="sm"
                                       variant="outline"
                                       onClick={() => setAddressOpen(true)}
                                       className="border-orange-300 text-orange-600 hover:bg-orange-50 flex-shrink-0 text-xs h-7 sm:h-9 whitespace-nowrap"
                                    >
                                       {t("common.edit")}
                                    </Button>
                                 )}
                              </div>
                           </div>
                        )}

                        {ordersEnabled === false &&
                           ordersSource === "schedule" && (
                              <div className="mt-3 p-3 border rounded-md bg-yellow-50 border-yellow-200 space-y-3">
                                 <p className="text-sm text-yellow-900 font-medium">
                                    {t(
                                       "checkout.ordersDisabledScheduleMessage"
                                    )}
                                 </p>

                                 <label className="flex items-start gap-2">
                                    <Checkbox
                                       checked={scheduleConfirmChecked}
                                       onCheckedChange={(v: any) =>
                                          setScheduleConfirmChecked(Boolean(v))
                                       }
                                    />
                                    <span className="text-sm text-yellow-900">
                                       {t("checkout.scheduleConfirmLabel") ||
                                          "I agree this order can be delivered tomorrow during working hours (9:30am - 9:00pm)."}
                                    </span>
                                 </label>

                                 <div>
                                    <Label
                                       htmlFor="schedule_notes_inline"
                                       className="text-xs text-yellow-900"
                                    >
                                       {t("checkout.scheduleNotesLabel") || "Notes"} ({t("common.optional") || "Optional"})
                                    </Label>
                                    <textarea
                                       id="schedule_notes_inline"
                                       rows={3}
                                       value={scheduleNotes}
                                       onChange={(e) => setScheduleNotes(e.target.value)}
                                       placeholder={
                                          t("checkout.scheduleNotesPlaceholder") ||
                                          "Optional notes about delivery"
                                       }
                                       className="mt-1 w-full px-3 py-2 border border-yellow-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                                    />
                                 </div>
                              </div>
                           )}

                        {/* Order buttons */}
                        <div className="pt-1">
                           <CheckoutFooter
                              isKigali={isKigali}
                              isLoggedIn={isLoggedIn}
                              isSubmitting={isSubmitting}
                              isInitiating={isInitiating}
                              hasItems={hasItems}
                              hasAddress={hasAddress}
                              hasEmail={hasEmail}
                              hasValidPhone={hasValidPhone}
                              paymentMethod={paymentMethod}
                              ordersEnabled={ordersEnabled}
                              ordersSource={ordersSource}
                              scheduleConfirmChecked={scheduleConfirmChecked}
                              missingSteps={missingSteps}
                              t={t}
                              onLoginClick={() =>
                                 router.push(
                                    `/signin?redirect=${encodeURIComponent(
                                       "/checkout"
                                    )}`
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
      </div>
   );
};

export default CheckoutPage;

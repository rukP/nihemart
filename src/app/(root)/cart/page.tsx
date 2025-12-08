"use client";

import { Minus, Plus, Trash2, ShoppingBag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Image from "next/image";
import { optimizeImageUrl } from "@/lib/utils";

const Cart = () => {
   const { t, language } = useLanguage();
   const {
      items,
      updateQuantity,
      removeItem,
      itemsCount,
      total,
      subtotal,
      // transport,
   } = useCart();
   // Calculate unique product count
   const uniqueProductCount = items.length;

   const [isLoading, setIsLoading] = useState(true);
   const [updatingItem, setUpdatingItem] = useState<string | null>(null);
   const [removingItem, setRemovingItem] = useState<string | null>(null);

   // Orders feature flag from server: admin-controlled vs schedule-controlled
   // - `adminEnabled === false` => admin explicitly disabled orders (block checkout)
   // - `adminEnabled === true` => admin explicitly enabled orders (allow checkout)
   // - `adminEnabled === null` => schedule controls availability; users SHOULD be
   //    allowed to proceed to checkout even during non-working hours (to order for next day)
   const [adminEnabled, setAdminEnabled] = useState<boolean | null>(null);
   const [scheduleDisabled, setScheduleDisabled] = useState<boolean | null>(
      null
   );
   const [ordersDisabledMessage, setOrdersDisabledMessage] = useState<
      string | null
   >(null);

   // Simulate loading state to prevent flash of empty content
   useEffect(() => {
      const timer = setTimeout(() => {
         setIsLoading(false);
      }, 500); // Short delay to show loading state

      return () => clearTimeout(timer);
   }, []);

   // Fetch whether orders are enabled (admin-controlled) and subscribe to
   // realtime updates so the UI reflects changes immediately.
   useEffect(() => {
      let mounted = true;

      const fetchOrdersEnabled = async () => {
         try {
            const res = await fetch("/api/admin/settings/orders-enabled");
            if (!res.ok) throw new Error("Failed to fetch setting");
            const json = await res.json();
            if (!mounted) return;
            // store admin-controlled flag separately from schedule state
            setAdminEnabled(
               typeof json.adminEnabled === "undefined"
                  ? null
                  : json.adminEnabled
            );
            setScheduleDisabled(
               typeof json.scheduleDisabled === "undefined"
                  ? null
                  : Boolean(json.scheduleDisabled)
            );
            setOrdersDisabledMessage(json.message || null);
         } catch (err) {
            console.warn("Failed to load orders_enabled setting", err);
            // Do not assume orders are enabled on fetch error; prefer schedule-managed default
            if (!mounted) return;
            setAdminEnabled(null);
            setScheduleDisabled(null);
         }
      };

      fetchOrdersEnabled();

      // Realtime subscription to update banner and button state immediately
      // when `site_settings.key = 'orders_enabled'` changes.
      const channel = supabase
         .channel("cart_site_settings_orders_enabled")
         .on(
            "postgres_changes",
            {
               event: "*",
               schema: "public",
               table: "site_settings",
               filter: "key=eq.orders_enabled",
            },
            (payload: any) => {
               // On any change to `site_settings` rows related to orders we re-fetch
               // the canonical combined state from the server so we don't try to
               // reconstruct schedule/admin logic from a single row's payload.
               try {
                  fetchOrdersEnabled();
               } catch (e) {
                  // ignore
               }
            }
         )
         .subscribe();

      return () => {
         mounted = false;
         try {
            supabase.removeChannel(channel);
         } catch (e) {
            // ignore
         }
      };
   }, []);

   const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
      if (newQuantity < 1) return;

      setUpdatingItem(itemId);
      try {
         await updateQuantity(itemId, newQuantity);
      } catch (error) {
         console.error("Failed to update quantity:", error);
      } finally {
         setUpdatingItem(null);
      }
   };

   const handleRemoveItem = async (itemId: string) => {
      setRemovingItem(itemId);
      try {
         await removeItem(itemId);
      } catch (error) {
         console.error("Failed to remove item:", error);
      } finally {
         setRemovingItem(null);
      }
   };

   // Banner text and visibility derived from admin/schedule state
   const showDisabledBanner =
      adminEnabled === false || (adminEnabled === null && scheduleDisabled);
   // Whether checkout should be blocked for navigation.
   // Only block when admin explicitly disabled orders (adminEnabled === false).
   // Schedule-based disabling (adminEnabled === null && scheduleDisabled)
   // should show a banner but must NOT prevent navigating to checkout
   // (customers can place orders for next-day delivery).
   const checkoutBlocked = adminEnabled === false;

   const disabledBannerText = (() => {
      if (language !== "en") {
         return (
            t("checkout.ordersDisabledMessage") ||
            ordersDisabledMessage ||
            t("checkout.ordersDisabledBanner")
         );
      }
      return (
         ordersDisabledMessage ||
         t("checkout.ordersDisabledMessage") ||
         t("checkout.ordersDisabledBanner") ||
         "We are currently not allowing orders, please try again later"
      );
   })();

   // Loading state
   if (isLoading) {
      return (
         <div className="container mx-auto px-3 sm:px-4 py-8 sm:py-12 max-w-6xl">
            <div className="text-center py-12 sm:py-16">
               <div className="flex justify-center mb-4">
                  <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 text-orange-500 animate-spin" />
               </div>
               <h2 className="text-xl sm:text-2xl font-bold mb-3 text-gray-900">
                  Loading your cart...
               </h2>
               <p className="text-gray-600 text-sm sm:text-base max-w-md mx-auto">
                  Getting your items ready
               </p>
            </div>
         </div>
      );
   }

   // Empty cart state
   if (items.length === 0) {
      return (
         <div className="container mx-auto px-3 sm:px-4 py-8 sm:py-16 max-w-4xl">
            <div className="text-center max-w-md mx-auto">
               <ShoppingBag className="h-16 w-16 sm:h-24 sm:w-24 text-muted-foreground mx-auto mb-4 sm:mb-6" />
               <h2 className="text-xl sm:text-2xl font-bold mb-3 text-gray-900">
                  {t("cart.empty")}
               </h2>
               <p className="text-muted-foreground mb-6 sm:mb-8 text-sm sm:text-base">
                  {t("cart.addProducts")}
               </p>
               <Button
                  asChild
                  className="bg-orange-500 hover:bg-orange-600 text-white text-sm sm:text-base"
               >
                  <Link href={"/products"}>{t("cart.continue")}</Link>
               </Button>
            </div>
         </div>
      );
   }

   return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-[90vw] pb-28 lg:pb-0">
         <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 text-gray-900">
               {t("cart.title")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("cart.text")}</p>
            <p className="text-sm text-muted-foreground">
               {t("cart.help")}{" "}
               <span className="text-orange-500">0792412177</span>
            </p>
            <div className="flex items-center mt-2">
               <span className="text-sm text-gray-600 bg-orange-50 px-2 py-1 rounded-full">
                  {uniqueProductCount} product
                  {uniqueProductCount !== 1 ? "s" : ""} in cart
               </span>
            </div>
         </div>

         <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Cart Items (compact list on mobile) */}
            <div className="lg:col-span-2 space-y-3 sm:space-y-6 max-h-[60vh] overflow-y-auto lg:overflow-visible lg:max-h-full pr-1">
               {items.map((item) => (
                  <Card
                     key={item.id}
                     className="hover:shadow-md transition-shadow duration-200"
                  >
                     <CardContent className="p-2 sm:p-4">
                        <div className="flex flex-row items-center gap-3">
                           {/* Image */}
                           <div className="flex-shrink-0">
                              <Image
                                 src={optimizeImageUrl(
                                    item.image || "/placeholder-image.jpg",
                                    {
                                       width: 400,
                                       quality: 75,
                                    }
                                 )}
                                 alt={item.name}
                                 className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-md"
                                 onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                       "/placeholder-image.jpg";
                                 }}
                              />
                           </div>

                           {/* Details */}
                           <div className="flex-1 min-w-0 flex items-center justify-between">
                              <div className="truncate">
                                 <h3 className="font-semibold text-sm text-gray-900 truncate">
                                    {item.name}
                                 </h3>
                                 {item.variant && (
                                    <p className="text-xs text-muted-foreground truncate">
                                       {item.variant}
                                    </p>
                                 )}
                                 <p className="text-xs text-orange-500 font-semibold mt-1">
                                    {item.price.toLocaleString()} RWF
                                 </p>
                              </div>

                              {/* Quantity & Remove (compact) */}
                              <div className="flex flex-col items-end gap-2">
                                 <div className="flex items-center space-x-2">
                                    <Button
                                       variant="outline"
                                       size="sm"
                                       onClick={() =>
                                          handleUpdateQuantity(
                                             item.id,
                                             item.quantity - 1
                                          )
                                       }
                                       disabled={
                                          item.quantity <= 1 ||
                                          updatingItem === item.id
                                       }
                                       className="h-7 w-7 p-0"
                                       aria-label="Decrease quantity"
                                    >
                                       {updatingItem === item.id ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                       ) : (
                                          <Minus className="h-3 w-3" />
                                       )}
                                    </Button>
                                    <span className="w-6 text-center text-sm font-medium">
                                       {item.quantity}
                                    </span>
                                    <Button
                                       variant="outline"
                                       size="sm"
                                       onClick={() =>
                                          handleUpdateQuantity(
                                             item.id,
                                             item.quantity + 1
                                          )
                                       }
                                       disabled={updatingItem === item.id}
                                       className="h-7 w-7 p-0"
                                       aria-label="Increase quantity"
                                    >
                                       {updatingItem === item.id ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                       ) : (
                                          <Plus className="h-3 w-3" />
                                       )}
                                    </Button>
                                 </div>
                                 <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRemoveItem(item.id)}
                                    disabled={removingItem === item.id}
                                    className="text-destructive hover:text-destructive hover:bg-red-50 h-7 w-7 p-0"
                                    aria-label="Remove item"
                                 >
                                    {removingItem === item.id ? (
                                       <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                       <Trash2 className="h-3 w-3" />
                                    )}
                                 </Button>
                              </div>
                           </div>
                        </div>

                        {/* Item Total (compact) */}
                        <div className="mt-3 pt-2 border-t border-gray-100">
                           <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">
                                 Item total:
                              </span>
                              <span className="font-semibold text-sm text-gray-900">
                                 {(item.price * item.quantity).toLocaleString()}{" "}
                                 RWF
                              </span>
                           </div>
                        </div>
                     </CardContent>
                  </Card>
               ))}
            </div>

            {/* Order Summary (hidden on small screens - sticky mobile bar will be used) */}
            <div className="lg:sticky lg:top-4 hidden lg:block">
               <Card className="border border-gray-200 shadow-sm">
                  <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                     <h3 className="text-lg font-semibold text-gray-900">
                        Order Summary
                     </h3>

                     <div className="space-y-3">
                        <div className="flex justify-between text-sm sm:text-base">
                           <span className="text-gray-600">
                              Subtotal ({uniqueProductCount} product
                              {uniqueProductCount !== 1 ? "s" : ""})
                           </span>
                           <span className="font-medium">
                              {subtotal.toLocaleString()} RWF
                           </span>
                        </div>

                        {/* <div className="flex justify-between text-sm sm:text-base">
                           <span className="text-gray-600">Transport fee</span>
                           <span>{transport.toLocaleString()} RWF</span>
                        </div> */}

                        <Separator />

                        <div className="flex justify-between font-bold text-base sm:text-lg">
                           <span className="text-gray-900">
                              {t("cart.total")}
                           </span>
                           <span className="text-orange-600">
                              {total.toLocaleString()} RWF
                           </span>
                        </div>
                     </div>

                     <div className="space-y-3">
                        {showDisabledBanner && (
                           <div className="p-3 rounded bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
                              {disabledBannerText}
                           </div>
                        )}

                        {/* Place Order button: when admin has disabled orders we stop
                            users at the cart and render an accessible disabled button so
                            they cannot navigate to checkout. When the flag is unknown
                            (null) or enabled we show the normal checkout link. */}
                        {checkoutBlocked ? (
                           <Button
                              className="w-full text-sm sm:text-base h-11 sm:h-12 bg-gray-300 text-gray-700 cursor-not-allowed"
                              size="lg"
                              disabled
                              aria-disabled="true"
                              title={
                                 ordersDisabledMessage ||
                                 t("checkout.ordersDisabledBanner") ||
                                 "Orders are currently disabled"
                              }
                           >
                              {t("cart.order")}
                           </Button>
                        ) : (
                           <Button
                              className={
                                 `w-full text-white text-sm sm:text-base h-11 sm:h-12 ` +
                                 (adminEnabled === null
                                    ? "bg-orange-400 hover:bg-orange-500"
                                    : "bg-orange-500 hover:bg-orange-600")
                              }
                              size="lg"
                              asChild
                           >
                              <Link href={"/checkout"}>{t("cart.order")}</Link>
                           </Button>
                        )}

                        {/* Note: message shown above in banner; avoid duplicate small text here */}

                        <Button
                           variant="outline"
                           className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 text-sm sm:text-base h-11 sm:h-12"
                           asChild
                        >
                           <Link href={"/products"}>{t("cart.continue")}</Link>
                        </Button>
                     </div>
                  </CardContent>
               </Card>
            </div>
         </div>

         {/* Sticky mobile checkout bar */}
         <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
            <div className="max-w-[90vw] mx-auto px-3 sm:px-4 py-3 bg-white/95 backdrop-blur border-t border-gray-200 rounded-t-xl shadow-xl">
               <div className="flex items-center justify-between gap-3">
                  <div>
                     <div className="text-xs text-gray-500">
                        {t("cart.total")}
                     </div>
                     <div className="text-lg font-semibold text-orange-600">
                        {total.toLocaleString()} RWF
                     </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <Button
                        variant="outline"
                        className="hidden sm:inline-flex border-gray-300 text-gray-700 hover:bg-gray-50 text-sm h-10"
                        asChild
                     >
                        <Link href="/products">{t("cart.continue")}</Link>
                     </Button>
                     {checkoutBlocked ? (
                        <Button
                           className="bg-gray-300 text-gray-700 h-10 text-sm"
                           disabled
                        >
                           {t("cart.order")}
                        </Button>
                     ) : (
                        <Button
                           className="bg-orange-500 hover:bg-orange-600 text-white h-10 text-sm"
                           asChild
                        >
                           <Link href="/checkout">{t("cart.order")}</Link>
                        </Button>
                     )}
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};

export default Cart;

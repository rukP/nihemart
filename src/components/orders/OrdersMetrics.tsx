"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
   MoreHorizontal,
   PlusCircle,
   TrendingUp,
   TrendingDown,
   Loader2,
   Clock,
} from "lucide-react";
import { useOrders } from "@/hooks/useOrders";
import { Order } from "@/types/orders";
import Link from "next/link";
import { useEffect, useState } from "react";

interface OrderMetric {
   title: string;
   value: string;
   change: string;
   isPositive: boolean;
   period: string;
}

export default function OrdersMetrics() {
   const { useAllOrders } = useOrders();
   const {
      data: allOrdersResponse,
      isLoading,
      isError,
      error,
      refetch,
   } = useAllOrders();

   // Calculate metrics from actual orders data
   const getOrderMetrics = (): OrderMetric[] => {
      // Extract the orders array from the response object
      const orders: Order[] = allOrdersResponse?.data || [];

      if (orders.length === 0) {
         return [
            {
               title: "Total Orders",
               value: "0",
               change: "0%",
               isPositive: true,
               period: "Last 7 days",
            },
            {
               title: "New Orders",
               value: "0",
               change: "0%",
               isPositive: true,
               period: "Last 7 days",
            },
            {
               title: "Completed Orders",
               value: "0",
               change: "0%",
               isPositive: true,
               period: "Last 7 days",
            },
            {
               title: "Canceled Orders",
               value: "0",
               change: "0%",
               isPositive: false,
               period: "Last 7 days",
            },
         ];
      }

      // Calculate totals by status
      const totalOrders = orders.length;
      const pendingOrders = orders.filter(
         (order) => order.status === "pending"
      ).length;
      const processingOrders = orders.filter(
         (order) => order.status === "processing"
      ).length;
      const deliveredOrders = orders.filter(
         (order) => order.status === "delivered"
      ).length;
      const cancelledOrders = orders.filter(
         (order) => order.status === "cancelled"
      ).length;
      const shippedOrders = orders.filter(
         (order) => order.status === "shipped"
      ).length;

      // Calculate completion rate (delivered + shipped orders)
      const completedOrders = deliveredOrders + shippedOrders;
      const completionRate =
         totalOrders > 0
            ? Math.round((completedOrders / totalOrders) * 100)
            : 0;

      // Calculate cancellation rate
      const cancellationRate =
         totalOrders > 0
            ? Math.round((cancelledOrders / totalOrders) * 100)
            : 0;

      // Calculate some mock growth rates (you can replace this with actual calculation)
      const totalGrowth =
         Math.random() > 0.5 ? Math.random() * 20 + 5 : -(Math.random() * 10);
      const pendingGrowth =
         Math.random() > 0.5 ? Math.random() * 25 + 10 : -(Math.random() * 15);

      return [
         {
            title: "Total Orders",
            value: totalOrders.toLocaleString(),
            change: `${totalGrowth > 0 ? "+" : ""}${totalGrowth.toFixed(1)}%`,
            isPositive: totalGrowth > 0,
            period: "Last 7 days",
         },
         {
            title: "New Orders",
            value: (pendingOrders + processingOrders).toLocaleString(),
            change: `${pendingGrowth > 0 ? "+" : ""}${pendingGrowth.toFixed(
               1
            )}%`,
            isPositive: pendingGrowth > 0,
            period: "Last 7 days",
         },
         {
            title: "Completed Orders",
            value: completedOrders.toLocaleString(),
            change: `${completionRate}%`,
            isPositive: true,
            period: "Completion Rate",
         },
         {
            title: "Canceled Orders",
            value: cancelledOrders.toLocaleString(),
            change: `${cancellationRate}%`,
            isPositive: false,
            period: "Cancellation Rate",
         },
      ];
   };

   const orderMetrics = getOrderMetrics();

   // Orders enabled toggle
   const [ordersEnabled, setOrdersEnabled] = useState<boolean | null>(null);
   const [ordersSource, setOrdersSource] = useState<
      "admin" | "schedule" | null
   >(null);
   const [toggling, setToggling] = useState(false);
   const [ordersDisabledMessage, setOrdersDisabledMessage] = useState<
      string | null
   >(null);
   const [ordersScheduleDisabled, setOrdersScheduleDisabled] = useState<
      boolean | null
   >(null);
   const { t } = useLanguage();
   // Customer-friendly localized fallback message. Prefer localized keys
   const CUSTOMER_FALLBACK_MSG =
      t("checkout.ordersDisabledBanner") ||
      t("checkout.ordersDisabledMessage") ||
      "We are currently not allowing orders, please try again later";

   const fetchOrdersEnabled = async () => {
      try {
         const res = await fetch("/api/admin/settings/orders-enabled");
         if (!res.ok) throw new Error("Failed to fetch setting");
         const json = await res.json();
         setOrdersEnabled(Boolean(json.enabled));
         setOrdersSource(json.source || null);
         setOrdersDisabledMessage(json.message || null);
         setOrdersScheduleDisabled(Boolean(json.scheduleDisabled));

         // If server returned nextToggleAt, schedule a refetch at that time so UI updates automatically
         if (json.nextToggleAt) {
            try {
               const next = new Date(json.nextToggleAt).getTime();
               const now = Date.now();
               const delay = Math.max(0, next - now + 500); // small buffer
               setTimeout(
                  () => fetchOrdersEnabled(),
                  Math.min(delay, 24 * 60 * 60 * 1000)
               );
            } catch (e) {}
         }
      } catch (err) {
         console.warn("Failed to load orders_enabled setting", err);
         // Prefer leaving state null so UI treats missing admin setting as schedule-controlled (auto)
         setOrdersEnabled(null);
      }
   };

   useEffect(() => {
      fetchOrdersEnabled();
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

   const toggleOrders = async (next: boolean | "auto") => {
      setToggling(true);
      try {
         if (next === "auto") {
            // Use DELETE method to clear admin override
            const res = await fetch("/api/admin/settings/orders-enabled", {
               method: "DELETE",
            });
            if (!res.ok) throw new Error("Failed to update setting");
            const json = await res.json();
            setOrdersEnabled(Boolean(json.enabled));
            setOrdersSource(json.source || null);
            setOrdersDisabledMessage(json.message || null);
            setOrdersScheduleDisabled(Boolean(json.scheduleDisabled));
         } else {
            const res = await fetch("/api/admin/settings/orders-enabled", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ enabled: next }),
            });
            if (!res.ok) throw new Error("Failed to update setting");
            const json = await res.json();
            setOrdersEnabled(Boolean(json.enabled));
            setOrdersSource(json.source || null);
            setOrdersDisabledMessage(json.message || null);
            setOrdersScheduleDisabled(Boolean(json.scheduleDisabled));
         }
      } catch (err) {
         console.error("Failed to toggle orders setting", err);
      } finally {
         setToggling(false);
      }
   };

   if (isError) {
      return (
         <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-7 sm:gap-2">
               <div className="flex flex-col">
                  <h1 className="text-2xl font-bold text-[#023337]">
                     Order List
                  </h1>
                  <p className="text-zinc-500 sm:hidden">
                     Track orders list across your store.
                  </p>
               </div>
               <div className="flex items-center gap-3">
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                     <PlusCircle className="h-4 w-4" />
                     Add Order
                  </Button>
                  <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                           More Action
                           <MoreHorizontal className="h-4 w-4 ml-2" />
                        </Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent align="end">
                        <DropdownMenuItem>Export Orders</DropdownMenuItem>
                        <DropdownMenuItem>Import Orders</DropdownMenuItem>
                        <DropdownMenuItem>Settings</DropdownMenuItem>
                     </DropdownMenuContent>
                  </DropdownMenu>
               </div>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
               <p className="text-red-600">
                  Error loading order metrics: {error?.message}
               </p>
            </div>
         </div>
      );
   }

   return (
      <div className="space-y-6">
         {/* Show banner when orders are disabled */}
         {ordersEnabled === false && (
            <div className="p-3 rounded bg-yellow-50 border border-yellow-200 text-yellow-800">
               <div className="flex items-start gap-2">
                  <Clock className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div>
                     <p className="font-medium">
                        {ordersDisabledMessage || CUSTOMER_FALLBACK_MSG}
                     </p>
                     {ordersSource === "schedule" && (
                        <p className="text-xs mt-1">
                           Orders are automatically controlled by schedule (9 AM
                           - 9:30 PM Kigali time)
                        </p>
                     )}
                  </div>
               </div>
            </div>
         )}

         {/* Show info when in schedule mode and enabled */}
         {ordersSource === "schedule" && ordersEnabled === true && (
            <div className="p-3 rounded bg-blue-50 border border-blue-200 text-blue-800">
               <div className="flex items-start gap-2">
                  <Clock className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">
                     Orders are automatically controlled by schedule (9 AM -
                     9:30 PM Kigali time)
                  </p>
               </div>
            </div>
         )}

         {/* Header */}
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-7 sm:gap-2">
            <div className="flex flex-col">
               <h1 className="text-2xl font-bold text-[#023337]">Order List</h1>
               <p className="text-zinc-500 sm:hidden">
                  Track orders list across your store.
               </p>
            </div>
            <div className="flex items-center gap-3">
               <Link href="/admin/orders/add">
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                     <PlusCircle className="h-4 w-4 mr-2" />
                     Add Order
                  </Button>
               </Link>
               <Link href="/admin/orders/external">
                  <Button variant="outline">External Orders</Button>
               </Link>

               {/* Orders control dropdown with 3 options */}
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                     <Button
                        variant="outline"
                        disabled={toggling || ordersEnabled === null}
                        className={
                           ordersSource === "admin" && ordersEnabled === false
                              ? "border-red-500 text-red-600"
                              : ordersSource === "admin" &&
                                ordersEnabled === true
                              ? "border-green-500 text-green-600"
                              : "border-blue-500 text-blue-600"
                        }
                     >
                        {toggling ? (
                           <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : ordersSource === "schedule" ? (
                           <Clock className="h-4 w-4 mr-2" />
                        ) : null}
                        {ordersSource === "schedule"
                           ? "Auto Mode"
                           : ordersEnabled
                           ? "Orders Enabled"
                           : "Orders Disabled"}
                        <MoreHorizontal className="h-4 w-4 ml-2" />
                     </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                     <DropdownMenuItem
                        onClick={() => toggleOrders(true)}
                        disabled={toggling}
                        className="text-green-600"
                     >
                        Enable Orders (Manual)
                     </DropdownMenuItem>
                     <DropdownMenuItem
                        onClick={() => toggleOrders(false)}
                        disabled={toggling}
                        className="text-red-600"
                     >
                        Disable Orders (Manual)
                     </DropdownMenuItem>
                     <DropdownMenuItem
                        onClick={() => toggleOrders("auto")}
                        disabled={toggling}
                        className="text-blue-600"
                     >
                        <Clock className="h-4 w-4 mr-2" />
                        Auto (Follow Schedule)
                     </DropdownMenuItem>
                  </DropdownMenuContent>
               </DropdownMenu>
            </div>
         </div>

         {/* Metrics Cards */}
         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {isLoading
               ? // Loading skeleton
                 Array.from({ length: 4 }).map((_, index) => (
                    <Card
                       key={index}
                       className="relative"
                    >
                       <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <div className="h-5 bg-gray-200 rounded w-24 animate-pulse"></div>
                          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                       </CardHeader>
                       <CardContent>
                          <div className="space-y-2">
                             <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
                             <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                             <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                          </div>
                       </CardContent>
                    </Card>
                 ))
               : orderMetrics.map((metric, index) => (
                    <Card
                       key={index}
                       className="relative"
                    >
                       <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <h3 className="text-lg text-[#23272E] font-semibold">
                             {metric.title}
                          </h3>
                          <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                                <Button
                                   variant="ghost"
                                   size="sm"
                                   className="h-8 w-8 p-0"
                                >
                                   <MoreHorizontal className="h-4 w-4" />
                                </Button>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                   onClick={() => refetch && refetch()}
                                >
                                   Refresh
                                </DropdownMenuItem>
                             </DropdownMenuContent>
                          </DropdownMenu>
                       </CardHeader>
                       <CardContent>
                          <div className="space-y-2 flex items-end gap-2">
                             <div className="text-3xl font-bold text-[#023337]">
                                {metric.value}
                             </div>
                             <div className="flex items-center gap-2 text-sm">
                                <div
                                   className={`flex items-center gap-1 ${
                                      metric.isPositive
                                         ? "text-green-600"
                                         : "text-red-600"
                                   }`}
                                >
                                   {metric.isPositive ? (
                                      <TrendingUp className="h-3 w-3" />
                                   ) : (
                                      <TrendingDown className="h-3 w-3" />
                                   )}
                                   <span>
                                      {metric.isPositive ? "↑" : "↓"}{" "}
                                      {metric.change}
                                   </span>
                                </div>
                             </div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                             {metric.period}
                          </div>
                       </CardContent>
                    </Card>
                 ))}
         </div>
      </div>
   );
}

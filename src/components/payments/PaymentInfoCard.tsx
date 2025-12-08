"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
   CheckCircle,
   XCircle,
   Clock,
   CreditCard,
   Smartphone,
   AlertCircle,
   RefreshCw,
   Loader2,
} from "lucide-react";
import { useKPayPayment } from "@/hooks/useKPayPayment";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

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
   failure_reason?: string;
}

interface PaymentInfoCardProps {
   orderId: string;
}

export default function PaymentInfoCard({ orderId }: PaymentInfoCardProps) {
   const [payments, setPayments] = useState<PaymentData[]>([]);
   const [loading, setLoading] = useState(true);
   const [refreshing, setRefreshing] = useState(false);
   const [orderRefundStatus, setOrderRefundStatus] = useState<string | null>(
      null
   );
   const { checkPaymentStatus } = useKPayPayment();
   const { t } = useLanguage();

   const fetchPayments = async (showLoading = false) => {
      if (showLoading) setRefreshing(true);

      try {
         const response = await fetch(`/api/payments/order/${orderId}`);
         if (response.ok) {
            const data = await response.json();
            setPayments(Array.isArray(data) ? data : []);
         } else {
            setPayments([]);
         }

         // Also fetch order refund status
         const orderResponse = await fetch(`/api/orders/${orderId}`);
         if (orderResponse.ok) {
            const orderData = await orderResponse.json();
            setOrderRefundStatus(orderData.refund_status || null);
         }
      } catch (error) {
         console.error("Failed to fetch payments:", error);
         setPayments([]);
      } finally {
         setLoading(false);
         if (showLoading) setRefreshing(false);
      }
   };

   const refreshPaymentStatus = async (payment: PaymentData) => {
      try {
         const statusResult = await checkPaymentStatus({
            paymentId: payment.id,
            transactionId: payment.kpay_transaction_id,
            reference: payment.reference,
         });

         if (statusResult.success && statusResult.status !== payment.status) {
            toast.success("Payment status updated");
            fetchPayments(false);
         }
      } catch (error) {
         console.error("Failed to refresh payment status:", error);
         toast.error("Failed to refresh payment status");
      }
   };

   useEffect(() => {
      fetchPayments();
   }, [orderId]);

   const getStatusIcon = (status: string) => {
      switch (status) {
         case "completed":
         case "successful":
            return <CheckCircle className="h-4 w-4 text-green-500" />;
         case "failed":
         case "cancelled":
            return <XCircle className="h-4 w-4 text-red-500" />;
         case "pending":
            return <Clock className="h-4 w-4 text-yellow-500" />;
         default:
            return <AlertCircle className="h-4 w-4 text-gray-500" />;
      }
   };

   const getStatusColor = (status: string) => {
      switch (status) {
         case "completed":
         case "successful":
            return "bg-green-100 text-green-800";
         case "failed":
         case "cancelled":
            return "bg-red-100 text-red-800";
         case "pending":
            return "bg-yellow-100 text-yellow-800";
         default:
            return "bg-gray-100 text-gray-800";
      }
   };

   const getPaymentMethodIcon = (method: string) => {
      if (
         method.includes("momo") ||
         method.includes("mtn") ||
         method.includes("airtel")
      ) {
         return <Smartphone className="h-4 w-4" />;
      }
      return <CreditCard className="h-4 w-4" />;
   };

   const getPaymentMethodName = (method: string) => {
      const names: Record<string, string> = {
         mtn_momo: "MTN Mobile Money",
         airtel_money: "Airtel Money",
         visa_card: "Visa Card",
         mastercard: "MasterCard",
         spenn: "SPENN",
         cash_on_delivery: "Cash on Delivery",
      };
      return names[method] || method.replace("_", " ").toUpperCase();
   };

   if (loading) {
      return (
         <Card className="border-orange-200">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-25 py-4 sm:py-5">
               <CardTitle className="text-orange-800 text-lg sm:text-xl">
                  Payment Information
               </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
               <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-sm">
                     Loading payment information...
                  </span>
               </div>
            </CardContent>
         </Card>
      );
   }

   if (payments.length === 0) {
      return (
         <Card className="border-orange-200">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-25 py-4 sm:py-5">
               <CardTitle className="text-orange-800 text-lg sm:text-xl">
                  Payment Information
               </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
               <div className="text-center py-4">
                  <CreditCard className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                     No payment information available
                  </p>
               </div>
            </CardContent>
         </Card>
      );
   }

   // Show the most recent payment prominently
   const latestPayment = payments.sort(
      (a, b) =>
         new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
   )[0];

   return (
      <Card className="border-orange-200">
         <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-25 py-4 sm:py-5">
            <div className="flex items-center justify-between">
               <CardTitle className="text-orange-800 text-lg sm:text-xl">
                  Payment Information
               </CardTitle>
               <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchPayments(true)}
                  disabled={refreshing}
                  className="h-8 w-8 p-0"
               >
                  <RefreshCw
                     className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
               </Button>
            </div>
         </CardHeader>
         <CardContent className="p-4 sm:p-6 space-y-4">
            {/* Latest Payment */}
            <div className="border rounded-lg p-4 bg-gray-50">
               <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                     {getPaymentMethodIcon(latestPayment.payment_method)}
                     <span className="font-medium text-sm">
                        {getPaymentMethodName(latestPayment.payment_method)}
                     </span>
                  </div>
                  <div className="flex items-center space-x-2">
                     <Badge className={getStatusColor(latestPayment.status)}>
                        <span className="flex items-center space-x-1">
                           {getStatusIcon(latestPayment.status)}
                           <span>
                              {latestPayment.status.charAt(0).toUpperCase() +
                                 latestPayment.status.slice(1)}
                           </span>
                        </span>
                     </Badge>
                  </div>
               </div>

               <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                     <span className="text-gray-600">Amount</span>
                     <span className="font-semibold">
                        {latestPayment.amount.toLocaleString()}{" "}
                        {latestPayment.currency}
                     </span>
                  </div>

                  {latestPayment.reference && (
                     <div className="flex justify-between">
                        <span className="text-gray-600">Reference</span>
                        <span className="font-mono text-xs">
                           {latestPayment.reference}
                        </span>
                     </div>
                  )}

                  {latestPayment.kpay_transaction_id && (
                     <div className="flex justify-between">
                        <span className="text-gray-600">Transaction ID</span>
                        <span className="font-mono text-xs">
                           {latestPayment.kpay_transaction_id}
                        </span>
                     </div>
                  )}

                  <div className="flex justify-between">
                     <span className="text-gray-600">Date</span>
                     <span>
                        {new Date(
                           latestPayment.created_at
                        ).toLocaleDateString()}
                     </span>
                  </div>

                  {latestPayment.failure_reason && (
                     <div className="pt-2 border-t">
                        <span className="text-red-600 text-xs">
                           <strong>Failure Reason:</strong>{" "}
                           {latestPayment.failure_reason}
                        </span>
                     </div>
                  )}
               </div>

               {/* Refund Status Section - Based on Order Status */}
               {orderRefundStatus && latestPayment.status === "successful" && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                     <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-gray-700">
                           Refund Status
                        </h4>
                        <Badge
                           variant={
                              orderRefundStatus === "approved"
                                 ? "default"
                                 : "secondary"
                           }
                           className="text-xs"
                        >
                           {orderRefundStatus === "requested" && (
                              <Clock className="h-3 w-3 mr-1" />
                           )}
                           {orderRefundStatus === "approved" && (
                              <CheckCircle className="h-3 w-3 mr-1" />
                           )}
                           {orderRefundStatus === "rejected" && (
                              <XCircle className="h-3 w-3 mr-1" />
                           )}
                           {orderRefundStatus.charAt(0).toUpperCase() +
                              orderRefundStatus.slice(1)}
                        </Badge>
                     </div>

                     <div className="text-sm text-gray-600 mb-1">
                        <strong>Payment Amount:</strong>{" "}
                        {latestPayment.amount.toLocaleString()}{" "}
                        {latestPayment.currency}
                     </div>

                     {orderRefundStatus === "requested" && (
                        <div className="bg-blue-50 border border-blue-200 rounded p-2 mt-2">
                           <p className="text-xs text-blue-800">
                              🔄 Your refund request is being reviewed. Once
                              approved, the refund will be processed back to
                              your original payment method.
                           </p>
                        </div>
                     )}

                     {orderRefundStatus === "approved" && (
                        <div className="bg-green-50 border border-green-200 rounded p-2 mt-2">
                           <p className="text-xs text-green-800">
                              ✅ Refund approved! {t("refundApprovedMessage")}
                           </p>
                        </div>
                     )}

                     {orderRefundStatus === "rejected" && (
                        <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
                           <p className="text-xs text-red-800">
                              ❌ Refund request was not approved. If you have
                              questions, please contact our support team.
                           </p>
                        </div>
                     )}
                  </div>
               )}

               {/* Action buttons */}
               <div className="flex gap-2 mt-3">
                  {latestPayment.status === "pending" && (
                     <Button
                        size="sm"
                        variant="outline"
                        onClick={() => refreshPaymentStatus(latestPayment)}
                        className="text-xs"
                     >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Refresh Status
                     </Button>
                  )}

                  {latestPayment.status === "pending" && (
                     <Button
                        size="sm"
                        onClick={() =>
                           window.open(
                              `/payment/${latestPayment.id}?orderId=${orderId}`,
                              "_blank"
                           )
                        }
                        className="text-xs"
                     >
                        View Payment
                     </Button>
                  )}
               </div>
            </div>

            {/* Show other payment attempts if any */}
            {payments.length > 1 && (
               <div>
                  <h4 className="font-medium text-sm mb-2 text-gray-700">
                     Previous Attempts ({payments.length - 1})
                  </h4>
                  <div className="space-y-2">
                     {payments.slice(1).map((payment) => (
                        <div
                           key={payment.id}
                           className="border rounded p-3 bg-white"
                        >
                           <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 text-sm">
                                 {getPaymentMethodIcon(payment.payment_method)}
                                 <span>
                                    {getPaymentMethodName(
                                       payment.payment_method
                                    )}
                                 </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                 <Badge
                                    variant="outline"
                                    className={getStatusColor(payment.status)}
                                 >
                                    {payment.status}
                                 </Badge>
                                 <span className="text-xs text-gray-500">
                                    {new Date(
                                       payment.created_at
                                    ).toLocaleDateString()}
                                 </span>
                              </div>
                           </div>
                           <div className="text-xs text-gray-600 mt-1">
                              {payment.amount.toLocaleString()}{" "}
                              {payment.currency}
                              {payment.reference && ` • ${payment.reference}`}
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            )}
         </CardContent>
      </Card>
   );
}

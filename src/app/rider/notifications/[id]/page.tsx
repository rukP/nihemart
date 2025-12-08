import React from "react";
import { notFound } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
// Render order details inline (server-side). No client wrapper needed.

interface NotificationPageProps {
   params: Promise<{ id: string }>;
}

export default async function NotificationPage({
   params,
}: NotificationPageProps) {
   const { id } = await params;

   // Pass the `cookies` accessor as a function. This defers accessing the
   // underlying cookie store until the Supabase helper needs it and avoids
   // calling `cookies()` synchronously in the route (per Next.js App Router).
   const supabase = createServerComponentClient({ cookies: () => cookies() });

   // fetch notification by id
   const { data: notifRows, error: notifErr } = await supabase
      .from("notifications")
      .select("*")
      .eq("id", id)
      .limit(1);

   if (notifErr) {
      console.error("Failed to fetch notification", notifErr);
      return notFound();
   }

   const notif = notifRows && notifRows[0];
   if (!notif) return notFound();

   // Try to fetch the related order if meta includes one or meta.order_id
   let order = null;
   try {
      const meta = notif.meta || {};
      const orderId =
         meta?.order?.id || meta?.order_id || meta?.orderId || null;
      if (orderId) {
         const { data: orderRows } = await supabase
            .from("orders")
            .select("*")
            .eq("id", orderId)
            .limit(1);
         order = orderRows && orderRows[0];
      }
   } catch (e) {
      // ignore
   }

   const orderNumber =
      (notif.meta &&
         (notif.meta.order?.order_number || notif.meta.order_number)) ||
      null;
   const deliveryAddress =
      notif.meta?.order?.delivery_address ||
      notif.meta?.delivery_address ||
      "Not provided";
   const deliveryCity =
      notif.meta?.order?.delivery_city || notif.meta?.delivery_city || null;
   const deliveryNotes =
      notif.meta?.order?.delivery_notes || notif.meta?.delivery_notes || null;

   return (
      <div className="p-6">
         <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-semibold">{notif.title}</h1>
            {notif.body && (
               <p className="mt-2 text-sm text-muted-foreground">
                  {notif.body}
               </p>
            )}
            <div className="mt-4 text-xs text-muted-foreground">
               Received: {new Date(notif.created_at).toLocaleString()}
            </div>

            <div className="mt-6 p-4 border rounded-lg bg-white">
               <h2 className="font-semibold">Delivery details</h2>
               <div className="mt-2 text-sm space-y-2">
                  <p>
                     <strong>Order:</strong>{" "}
                     {orderNumber ||
                        (notif.meta?.order?.id ?? notif.meta?.order_id ?? "—")}
                  </p>
                  <p>
                     <strong>Address:</strong> {deliveryAddress}
                  </p>
                  {deliveryCity && (
                     <p>
                        <strong>City:</strong> {deliveryCity}
                     </p>
                  )}
                  {deliveryNotes && (
                     <p className="italic">Note: {deliveryNotes}</p>
                  )}
               </div>

               <div className="mt-4">
                  {order ? (
                     <div className="space-y-6">
                        <div className="flex justify-between items-start">
                           <div>
                              <h3 className="text-lg font-semibold">
                                 Order #{order.order_number}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                 {new Date(order.created_at).toLocaleString()}
                              </p>
                           </div>
                           <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gray-100">
                              {order.status}
                           </span>
                        </div>

                        <div className="p-4 border rounded">
                           <h4 className="font-semibold mb-2">Customer</h4>
                           <p className="text-sm">{`${order.customer_first_name} ${order.customer_last_name}`}</p>
                           <p className="text-sm text-muted-foreground">
                              {order.customer_email}
                           </p>
                           {order.customer_phone && (
                              <p className="text-sm text-muted-foreground">
                                 {order.customer_phone}
                              </p>
                           )}
                        </div>

                        <div className="p-4 border rounded">
                           <h4 className="font-semibold mb-2">
                              Delivery Address
                           </h4>
                           <p className="text-sm text-muted-foreground">
                              {order.delivery_address}
                           </p>
                           <p className="text-sm text-muted-foreground">
                              {order.delivery_city}
                           </p>
                           {order.delivery_notes && (
                              <p className="text-sm italic">
                                 Note: {order.delivery_notes}
                              </p>
                           )}
                        </div>

                        <div className="p-4 border rounded">
                           <h4 className="font-semibold mb-2">Items</h4>
                           <div className="space-y-4">
                              {order.items?.map((item: any, idx: number) => (
                                 <div
                                    key={item.id}
                                    className={`${
                                       idx !== 0 ? "border-t pt-4" : ""
                                    } flex justify-between`}
                                 >
                                    <div>
                                       <p className="font-medium">
                                          {item.product_name}
                                       </p>
                                       {item.variation_name && (
                                          <p className="text-sm text-muted-foreground">
                                             Variation: {item.variation_name}
                                          </p>
                                       )}
                                       <p className="text-sm text-muted-foreground">
                                          Quantity: {item.quantity}
                                       </p>
                                       {item.refund_reason && (
                                          <p className="text-xs italic">
                                             Reason: {item.refund_reason}
                                          </p>
                                       )}
                                    </div>
                                    <div className="font-medium">
                                       {item.total.toLocaleString()} RWF
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>

                        <div className="p-4 border rounded">
                           <h4 className="font-semibold mb-2">Summary</h4>
                           <div className="space-y-2">
                              <div className="flex justify-between">
                                 <p className="text-muted-foreground">
                                    Subtotal
                                 </p>
                                 <p>{order.subtotal.toLocaleString()} RWF</p>
                              </div>
                              <div className="flex justify-between">
                                 <p className="text-muted-foreground">
                                    Transport fee
                                 </p>
                                 <p>
                                    {Number(order.tax || 0).toLocaleString()}{" "}
                                    RWF
                                 </p>
                              </div>
                              <div className="flex justify-between font-semibold border-t pt-2">
                                 <p>Total</p>
                                 <p>{order.total.toLocaleString()} RWF</p>
                              </div>
                           </div>
                        </div>
                     </div>
                  ) : (
                     <a
                        href="/rider/orders"
                        className="inline-block mt-2 bg-orange-500 text-white px-4 py-2 rounded"
                     >
                        Open orders
                     </a>
                  )}
               </div>
            </div>
         </div>
      </div>
   );
}

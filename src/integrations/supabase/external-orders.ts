import { supabase } from "@/integrations/supabase/client";
import { Order } from "@/types/orders";

const sb = supabase as any;

export interface ExternalOrderItemInput {
   product_name: string;
   quantity: number;
   price: number;
   product_id?: string;
   variation_name?: string;
}

export interface ExternalOrderInput {
   customer_name: string;
   customer_email?: string;
   customer_phone: string;
   delivery_address: string;
   delivery_city: string;
   delivery_notes?: string;
   status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
   source: "whatsapp" | "phone" | "other";
   // `total` here represents the items subtotal. Transport (tax) can be
   // supplied separately and will be added to compute the final order total.
   total: number;
   transport?: number;
   items: ExternalOrderItemInput[];
   is_external: boolean;
   is_paid: boolean;
}

export async function createExternalOrder(
   data: ExternalOrderInput
): Promise<Order> {
   const {
      customer_name,
      customer_email,
      customer_phone,
      delivery_address,
      delivery_city,
      delivery_notes,
      status,
      source,
      total,
      transport = 0,
      items,
      is_external,
      is_paid,
   } = data;
   // Validate input
   if (!customer_name || !customer_phone || !delivery_address) {
      throw new Error("Missing required fields");
   }

   if (!items || items.length === 0) {
      throw new Error("Order must have at least one item");
   }

   // Determine whether there's a logged-in user on the client.
   // If there is, attach their id to satisfy common RLS policies
   // that allow inserts when user_id = auth.uid.
   let userId: string | null = null;
   try {
      // supabase-js v2
      const userResult = await sb.auth.getUser();
      // userResult may contain { data: { user } }
      // defensively read the id
      // @ts-ignore
      userId = userResult?.data?.user?.id ?? null;
   } catch (err) {
      // ignore - we'll just insert with null user_id if no session
      userId = null;
   }

   // Create the order in the database
   const { data: orderData, error: orderError } = await sb
      .from("orders")
      .insert([
         {
            status,
            subtotal: total,
            // store transport fee in `tax` (existing checkout uses tax for transport)
            tax: transport,
            total: Number(total || 0), // For external orders, total is just items subtotal
            currency: "RWF",
            user_id: userId, // attach user id when available to satisfy RLS
            customer_email: customer_email || "",
            customer_first_name: customer_name.split(" ")[0],
            customer_last_name: customer_name.split(" ").slice(1).join(" "),
            customer_phone,
            delivery_address,
            delivery_city,
            delivery_notes,
            source,
            is_external: true,
            is_paid: is_paid ?? true,
         },
      ])
      .select()
      .single();

   if (orderError) {
      console.error("Order creation error:", orderError);
      // Common cause: row-level security prevents anonymous inserts. Provide a clearer message.
      if (orderError.code === "42501") {
         throw new Error(
            "Row-level security prevented inserting the order. Ensure you're authenticated or use a server endpoint with service role privileges."
         );
      }
      throw new Error(`Failed to create order: ${orderError.message}`);
   }

   // Create order items
   const orderItems = items.map((item: ExternalOrderItemInput) => ({
      order_id: orderData.id,
      product_id: item.product_id,
      product_name: item.product_name,
      variation_name: item.variation_name,
      price: item.price,
      quantity: item.quantity,
      total: item.price * item.quantity,
   }));

   const { error: itemsError, data: insertedItems } = await sb
      .from("order_items")
      .insert(orderItems)
      .select();

   if (itemsError) {
      // Try to rollback the order
      await sb.from("orders").delete().eq("id", orderData.id);
      console.error("Order items creation error:", itemsError);
      throw new Error(`Failed to create order items: ${itemsError.message}`);
   }

   // Decrement stock immediately when external order is created
   // This ensures stock is reserved as soon as an order is placed
   (async () => {
      try {
         if (!insertedItems || !Array.isArray(insertedItems)) return;

         await Promise.all(
            insertedItems.map(async (item: any) => {
               try {
                  const qty = Number(item.quantity || 0);
                  if (qty <= 0) return;

                  // Handle variation stock first (if variation exists)
                  if (item.product_variation_id) {
                     const { data: varRow, error: varErr } = await sb
                        .from("product_variations")
                        .select("id, stock")
                        .eq("id", item.product_variation_id)
                        .maybeSingle();
                     if (varErr) {
                        console.warn(
                           "Failed to fetch product_variation for stock decrement (external order):",
                           varErr
                        );
                     } else if (varRow && typeof varRow.stock === "number") {
                        const newStock = Math.max(0, Number(varRow.stock) - qty);
                        const { error: upErr } = await sb
                           .from("product_variations")
                           .update({ stock: newStock })
                           .eq("id", item.product_variation_id);
                        if (upErr) {
                           console.warn(
                              "Failed to update variation stock on external order creation:",
                              upErr
                           );
                        } else {
                           console.log(
                              `Stock decremented for variation ${item.product_variation_id} (external order): ${varRow.stock} -> ${newStock}`
                           );
                        }
                     }
                  }

                  // Handle product stock (if product_id exists and track_quantity is enabled)
                  if (item.product_id) {
                     const { data: pRow, error: pErr } = await sb
                        .from("products")
                        .select("id, stock, track_quantity")
                        .eq("id", item.product_id)
                        .maybeSingle();
                     if (pErr) {
                        console.warn(
                           "Failed to fetch product for stock decrement (external order):",
                           pErr
                        );
                     } else if (
                        pRow &&
                        pRow.track_quantity &&
                        typeof pRow.stock === "number"
                     ) {
                        const newStock = Math.max(0, Number(pRow.stock) - qty);
                        const { error: upErr } = await sb
                           .from("products")
                           .update({ stock: newStock })
                           .eq("id", item.product_id);
                        if (upErr) {
                           console.warn(
                              "Failed to update product stock on external order creation:",
                              upErr
                           );
                        } else {
                           console.log(
                              `Stock decremented for product ${item.product_id} (external order): ${pRow.stock} -> ${newStock}`
                           );
                        }
                     }
                  }
               } catch (innerErr) {
                  console.warn(
                     "Error decrementing stock for external order item:",
                     innerErr
                  );
               }
            })
         );
      } catch (stockErr) {
         console.warn(
            "Error running stock decrement on external order creation:",
            stockErr
         );
      }
   })().catch((bgErr) =>
      console.warn("Background stock decrement on external order creation failed:", bgErr)
   );

   // If this external order was paid at creation time, create a payments row
   // so admin can later process refunds using the existing payments/refunds flows.
   if (is_paid) {
      try {
         const reference = `EXT_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 8)}`;

         const paymentRow: any = {
            order_id: orderData.id,
            // Payment amount should include transport
            amount: Number(
               (Number(total || 0) + Number(transport || 0)).toFixed(2)
            ),
            currency: "RWF",
            payment_method: "manual",
            status: "completed",
            reference,
            customer_name: customer_name,
            customer_email: customer_email || "",
            customer_phone: customer_phone,
            completed_at: new Date().toISOString(),
         };

         const { error: paymentError } = await sb
            .from("payments")
            .insert([paymentRow]);

         if (paymentError) {
            // Log but do not fail — order and items were created; admin can still
            // create the payment manually if necessary. However, surface a clear
            // error for debugging.
            console.error(
               "Failed to create payment row for external order:",
               paymentError
            );
         }
      } catch (err) {
         console.error(
            "Unexpected error creating payment row for external order:",
            err
         );
      }
   }

   return orderData;
}

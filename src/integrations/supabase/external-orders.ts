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

   const { error: itemsError } = await sb
      .from("order_items")
      .insert(orderItems);

   if (itemsError) {
      // Try to rollback the order
      await sb.from("orders").delete().eq("id", orderData.id);
      console.error("Order items creation error:", itemsError);
      throw new Error(`Failed to create order items: ${itemsError.message}`);
   }

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

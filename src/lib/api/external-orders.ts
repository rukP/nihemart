import { authorizedAPI } from "@/lib/api";
import handleApiRequest from "@/lib/handleApiRequest";
import { Order } from "@/types/orders";

export interface ExternalOrderItemInput {
   product_name: string;
   quantity: number;
   price: number;
   product_id?: string | null;
   variation_name?: string | null;
   product_variation_id?: string | null;
   product_sku?: string | null;
   product_image_url?: string | null;
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

   // Calculate final total: subtotal (items) + transport (delivery fee)
   const itemsSubtotal = Number(total || 0);
   const transportFee = Number(transport || 0);
   const finalTotal = itemsSubtotal + transportFee;

   // Split customer name into first and last name
   const nameParts = customer_name.split(" ");
   const customer_first_name = nameParts[0] || "";
   const customer_last_name = nameParts.slice(1).join(" ") || "";

   // Create order using backend API
   const orderRequest = {
      order: {
         status: status || "pending",
         subtotal: itemsSubtotal, // Items subtotal only
         tax: transportFee, // Store transport fee in tax field
         total: finalTotal, // Total = subtotal + transport (delivery fee)
         currency: "RWF",
         payment_method: is_paid ? "manual" : "cash_on_delivery",
         is_external: true,
         is_paid: is_paid ?? true,
         customer_email: customer_email || "",
         customer_first_name,
         customer_last_name,
         customer_phone,
         delivery_address,
         delivery_city,
         delivery_notes,
         source,
      },
      items: items.map((item: ExternalOrderItemInput) => ({
         product_id: item.product_id || null,
         product_variation_id: item.product_variation_id || null,
         product_name: item.product_name,
         product_sku: item.product_sku || null,
         variation_name: item.variation_name || null,
         price: item.price,
         quantity: item.quantity,
         total: item.price * item.quantity,
         product_image_url: item.product_image_url || null,
      })),
   };

   // Create order via backend API
   const orderData = await handleApiRequest(() =>
      authorizedAPI.post("/orders", orderRequest)
   );

   // Stock deduction and email notifications are handled by the backend
   return orderData;
}

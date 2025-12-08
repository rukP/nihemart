import { Order, OrderItem } from "@/types/orders";

export interface NotificationMeta {
   order?: Order;
   order_id?: string;
   order_number?: string;
   status?: string;
   rider_name?: string;
   rider_phone?: string;
   rider?: {
      name?: string;
      full_name?: string;
      phone?: string;
   };
   delivery_address?: string;
   details?: string;
   items?: OrderItem[];
   user_id?: string;
   recipient_user_id?: string;
   rider_id?: string;
   [key: string]: any;
}

/**
 * Format currency amount for display
 */
export const formatCurrency = (amount: number, currency = "RWF"): string => {
   return new Intl.NumberFormat("en-RW", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
   }).format(amount);
};

/**
 * Format order items for notification display
 */
export const formatOrderItems = (items: OrderItem[] | undefined): string => {
   if (!items || items.length === 0) return "";

   const itemsList = items
      .map((item) => {
         const itemName = item.variation_name
            ? `${item.product_name} (${item.variation_name})`
            : item.product_name;
         const unitPrice = formatCurrency(item.price);
         return `${item.quantity}x ${itemName} ${unitPrice}`;
      })
      .join(", ");

   return itemsList;
};

/**
 * Get order total from items or order
 */
export const getOrderTotal = (order?: Order, items?: OrderItem[]): number => {
   if (order?.total) return order.total;
   if (items && items.length > 0) {
      return items.reduce((sum, item) => sum + item.total, 0);
   }
   return 0;
};

/**
 * Format rider information for display
 */
export const formatRiderInfo = (meta: NotificationMeta): string => {
   const riderName =
      meta.rider_name ||
      meta.rider?.name ||
      meta.rider?.full_name ||
      "Your Delivery Rider";
   const riderPhone = meta.rider_phone || meta.rider?.phone || null;

   if (riderPhone) {
      return `${riderName} (${riderPhone})`;
   }
   return `${riderName}`;
};

/**
 * Get user-friendly order number (avoid UUIDs)
 */
export const getOrderNumber = (meta: NotificationMeta): string => {
   // Prefer an explicit order_number when present — many systems use
   // user-friendly order numbers like 'ORD1761498863014'. Always favour
   // that value rather than trying to generate a short id from UUIDs.
   const orderNumber = meta.order_number || meta.order?.order_number;
   const orderId = meta.order_id || meta.order?.id;

   if (orderNumber) {
      // If the order number already includes a leading '#', keep it.
      // Otherwise prefix with '#'. Preserve whatever format the backend
      // provided (e.g. ORD..., INV..., etc.).
      return orderNumber.startsWith("#") ? orderNumber : `#${orderNumber}`;
   }

   // If no explicit order_number is available, fall back to using order_id
   // in a readable way. Prefer non-UUID short ids if possible.
   if (orderId && !orderId.includes("-") && orderId.length <= 20) {
      return orderId.startsWith("#") ? orderId : `#${orderId}`;
   }

   // For UUID-style ids, generate a short, stable readable id with NH prefix.
   if (orderId && orderId.includes("-") && orderId.length > 20) {
      const shortId = orderId.replace(/-/g, "").slice(0, 8).toUpperCase();
      return `#NH${shortId}`;
   }

   // Last-resort fallback
   return "your order";
};

/**
 * Format delivery address for display
 */
export const formatDeliveryAddress = (meta: NotificationMeta): string => {
   const address = meta.delivery_address || meta.order?.delivery_address;
   if (!address) return "";

   // Truncate long addresses for notifications
   if (address.length > 50) {
      return address.substring(0, 47) + "...";
   }

   return address;
};

/**
 * Get status display text
 */
export const getStatusDisplayText = (status?: string): string => {
   if (!status) return "updated";

   const statusMap: Record<string, string> = {
      pending: "pending confirmation",
      processing: "being prepared",
      assigned: "assigned to a rider",
      shipped: "on the way",
      delivered: "delivered successfully",
      cancelled: "cancelled",
      refunded: "refunded",
   };

   return statusMap[status.toLowerCase()] || status;
};

/**
 * Create detailed order summary for notifications
 */
export const createOrderSummary = (meta: NotificationMeta): string => {
   const orderNumber = getOrderNumber(meta);
   const items = meta.items || meta.order?.items || [];
   const total = getOrderTotal(meta.order, items);

   let summary = `Order ${orderNumber}`;

   // Add items if available
   if (items && items.length > 0) {
      const itemsText = formatOrderItems(items);
      if (itemsText) {
         summary += `\n\nItems:\n${itemsText}`;
      }
   }

   // Add total if available
   if (total > 0) {
      summary += `\n\nTotal: ${formatCurrency(total)}`;
   } else if (meta.order?.total && meta.order.total > 0) {
      summary += `\n\nTotal: ${formatCurrency(meta.order.total)}`;
   }

   // Add delivery address if available
   const address = formatDeliveryAddress(meta);
   if (address) {
      summary += `\n\nDelivery to: ${address}`;
   }

   // Add customer name if available
   const customerName =
      meta.order?.customer_first_name && meta.order?.customer_last_name
         ? `${meta.order.customer_first_name} ${meta.order.customer_last_name}`
         : meta.order?.customer_first_name || null;

   if (customerName) {
      summary += `\n\nCustomer: ${customerName}`;
   }

   return summary;
};

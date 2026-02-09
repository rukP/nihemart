// ============================================================================
// WHATSAPP CHECKOUT UTILITIES
// Handles WhatsApp message generation and checkout for non-Kigali locations.
// ============================================================================

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sku?: string;
  variation_id?: string;
  variation_name?: string;
  product_id?: string;
}

export interface CheckoutFormData {
  email: string;
  fullName: string;
  address: string;
  city: string;
  phone: string;
  delivery_notes: string;
}

export interface GenerateWhatsAppMessageOptions {
  orderItems: CartItem[];
  formData: CheckoutFormData;
  derivedCity: string;
  subtotal: number;
  transport: number;
  total: number;
  ordersEnabled: boolean | null;
  ordersSource: 'admin' | 'schedule' | null;
  scheduleNotes: string;
}

// WhatsApp number for NiheMart
export const NIHEMART_WHATSAPP_NUMBER = '250792412177';

/**
 * Generate a WhatsApp message for checkout
 */
export function generateWhatsAppMessage({
  orderItems,
  formData,
  derivedCity,
  subtotal,
  transport,
  total,
  ordersEnabled,
  ordersSource,
  scheduleNotes,
}: GenerateWhatsAppMessageOptions): string {
  const productDetails = orderItems
    .map(item => {
      // Prefer explicit product_id when available, otherwise use item.id
      const productId = item.product_id || item.id || '';
      const productLink = `https://nihemart.rw/products/${productId}`;

      const lines: string[] = [];
      // Line 1: product name (variation) x qty - total
      lines.push(
        `${item.name}${
          item.variation_name ? ` (${item.variation_name})` : ''
        } x${item.quantity} - ${(
          item.price * item.quantity
        ).toLocaleString()} RWF`
      );

      // SKU line if available
      if (item.sku) lines.push(`SKU: ${item.sku}`);

      // Variation id if present
      if (item.variation_id) lines.push(`Variation ID: ${item.variation_id}`);

      // Product link
      lines.push(`Link: ${productLink}`);

      return lines.join('\n');
    })
    .join('\n\n');

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
  if (ordersEnabled === false && ordersSource === 'schedule' && scheduleNotes) {
    final = final + `\n\nSchedule notes:\n${scheduleNotes}`;
  }

  return encodeURIComponent(final);
}

/**
 * Open WhatsApp with the generated message
 */
export function openWhatsAppCheckout(encodedMessage: string): void {
  const url = `https://wa.me/${NIHEMART_WHATSAPP_NUMBER}?text=${encodedMessage}`;
  window.open(url, '_blank');
}

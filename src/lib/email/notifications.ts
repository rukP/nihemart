import { BrandEmailOptions } from "./templates";
import { optimizeImageUrl } from "@/lib/utils";

type OrderItem = {
  product_name: string;
  variation_name?: string | null;
  quantity: number;
  price: number;
  total?: number;
};

export type OrderMeta = {
  order_id?: string;
  order_number?: string;
  items?: OrderItem[];
  total?: number;
  currency?: string;
  customer_name?: string;
  customer_phone?: string;
  delivery_address?: string;
  delivery_time?: string;
  schedule_notes?: string;
};

function formatCurrency(amount: number, currency = "RWF"): string {
  try {
    return new Intl.NumberFormat("en-RW", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function orderItemsTable(items: OrderItem[] = []): string {
  if (!items || items.length === 0) return "";
  const rows = items
    .map((it) => {
      const name = it.variation_name
        ? `${it.product_name} (${it.variation_name})`
        : it.product_name;
      const unit = formatCurrency(it.price);
      return `<tr><td style=\"padding:8px 0;color:#333\">${name}</td><td style=\"padding:8px 0;color:#555;text-align:center\">${it.quantity}</td><td style=\"padding:8px 0;color:#111;text-align:right\">${unit}</td></tr>`;
    })
    .join("");
  return `<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\" style=\"margin-top:8px\"><thead><tr><th style=\"text-align:left;color:#888;font-weight:500;padding-bottom:6px\">Item</th><th style=\"text-align:center;color:#888;font-weight:500;padding-bottom:6px\">Qty</th><th style=\"text-align:right;color:#888;font-weight:500;padding-bottom:6px\">Price</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function wrapBranded(
  subject: string,
  bodyHtml: string,
  brand: BrandEmailOptions = {}
) {
  const appName = brand.appName || "Nihemart";
  const primaryBlue = brand.primaryColorHex || "#1DB4E7";
  const accentOrange = brand.secondaryColorHex || "#FF6B35";
  const logoUrl =
    brand.logoUrl ||
    process.env.NEXT_PUBLIC_LOGO_URL ||
    process.env.NEXT_PUBLIC_EMAIL_LOGO ||
    (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "") + "/logo.png";

  const optimizedLogo = logoUrl
    ? optimizeImageUrl(logoUrl, { width: 160, quality: 80 })
    : null;

  return `<!DOCTYPE html><html><head><meta charSet=\"utf-8\" /><title>${subject}</title></head><body style=\"margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif\"><table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\" style=\"background:#f5f5f5\"><tr><td align=\"center\" style=\"padding:40px 20px\"><table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\" style=\"max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08)\"><tr><td style=\"padding:28px 28px 20px 28px;text-align:center;background:linear-gradient(135deg, ${primaryBlue} 0%, #1ac4f7 100%)\">${
    optimizedLogo
      ? `<Image src=\"${optimizedLogo}\" alt=\"${appName}\" width=\"80\" height=\"80\" style=\"display:inline-block;border-radius:16px;background:#ffffff;padding:8px;box-shadow:0 2px 8px rgba(0,0,0,0.15)\" />`
      : ``
  }<div style=\"font-size:26px;font-weight:700;color:#ffffff;margin-top:12px\">Nihe<span style=\"color:${accentOrange}\">Mart</span></div></td></tr><tr><td style=\"padding:28px\">${bodyHtml}</td></tr><tr><td style=\"background:linear-gradient(90deg, ${primaryBlue} 0%, ${accentOrange} 100%);padding:14px 28px;text-align:center\"><div style=\"font-size:12px;color:#ffffff;font-weight:500\">© ${new Date().getFullYear()} NiheMart</div></td></tr></table></td></tr></table></body></html>`;
}

export function buildOrderConfirmationEmail(
  meta: OrderMeta,
  brand?: BrandEmailOptions
) {
  const orderNo = meta.order_number
    ? `#${meta.order_number.replace(/^#/, "")}`
    : meta.order_id || "your order";
  const total = typeof meta.total === "number" ? meta.total : 0;
  const currency = meta.currency || "RWF";
  const body = `
      <div style=\"font-size:18px;color:#1a1a1a;font-weight:600;\">Order confirmed — ${orderNo}</div>
      <div style=\"font-size:14px;color:#444;margin-top:6px\">Thank you for shopping with Nihemart${
        meta.customer_name ? ", " + meta.customer_name : ""
      }. Below is a summary of your order.</div>
      ${orderItemsTable(meta.items)}
      <div style=\"border-top:1px solid #eee;margin:12px 0\"></div>
      <div style=\"display:flex;justify-content:space-between;font-size:14px;color:#1a1a1a;font-weight:600\">
        <span>Total</span>
        <span>${formatCurrency(total, currency)}</span>
      </div>
      ${
        meta.delivery_address
          ? `<div style=\\"font-size:12px;color:#666;margin-top:6px\\">Deliver to: ${meta.delivery_address}</div>`
          : ""
      }
         ${
           meta.delivery_time
             ? (() => {
                 try {
                   const d = new Date(meta.delivery_time as string);
                   const fmt = d.toLocaleString("en-RW", {
                     timeZone: "Africa/Kigali",
                     year: "numeric",
                     month: "short",
                     day: "numeric",
                     hour: "numeric",
                     minute: "numeric",
                   } as any);
                   return `<div style=\"font-size:12px;color:#666;margin-top:6px\">Requested delivery time: ${fmt} (Kigali)</div>`;
                 } catch (e) {
                   return `<div style=\"font-size:12px;color:#666;margin-top:6px\">Requested delivery time: ${meta.delivery_time}</div>`;
                 }
               })()
             : ""
         }
            ${
              meta.schedule_notes
                ? `<div style="font-size:12px;color:#666;margin-top:6px">Schedule notes: ${String(
                    meta.schedule_notes
                  )}</div>`
                : ""
            }
      <div style=\"text-align:center;margin-top:18px\"><a href=\"${
        process.env.NEXT_PUBLIC_APP_URL || "#"
      }/orders\" style=\"background:#1DB4E7;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;font-weight:600\">View your order</a></div>
   `;
  const subject = `Order confirmed — ${orderNo}`;
  return { subject, html: wrapBranded(subject, body, brand) };
}

export function buildOrderDeliveredEmail(
  meta: OrderMeta,
  brand?: BrandEmailOptions
) {
  const orderNo = meta.order_number
    ? `#${meta.order_number.replace(/^#/, "")}`
    : meta.order_id || "your order";
  const body = `
      <div style=\"font-size:18px;color:#1a1a1a;font-weight:600;\">Delivered — ${orderNo}</div>
      <div style=\"font-size:14px;color:#444;margin-top:6px\">Your package has been delivered successfully. We hope you enjoy your purchase!</div>
      ${orderItemsTable(meta.items)}
      <div style=\"text-align:center;margin-top:18px\"><a href=\"${
        process.env.NEXT_PUBLIC_APP_URL || "#"
      }/orders\" style=\"background:#FF6B35;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;font-weight:600\">Rate your experience</a></div>
   `;
  const subject = `Delivered — ${orderNo}`;
  return { subject, html: wrapBranded(subject, body, brand) };
}

export function buildRiderAssignmentEmail(
  meta: OrderMeta,
  brand?: BrandEmailOptions
) {
  const orderNo = meta.order_number
    ? `#${meta.order_number.replace(/^#/, "")}`
    : meta.order_id || "an order";
  const customer = meta.customer_name || "Customer";
  const phone = meta.customer_phone || "";
  const total = typeof meta.total === "number" ? meta.total : 0;
  const currency = meta.currency || "RWF";

  const body = `
      <div style=\"font-size:18px;color:#1a1a1a;font-weight:600;\">New delivery assignment — ${orderNo}</div>
      <div style=\"font-size:14px;color:#444;margin-top:6px\">You have been assigned a new delivery. Please see the details below and contact the customer if needed.</div>
      <div style=\"margin-top:12px;font-size:14px;color:#333\"><strong>Order:</strong> ${orderNo}</div>
      <div style=\"margin-top:6px;font-size:14px;color:#333\"><strong>Customer:</strong> ${customer}${
        phone ? ` (${phone})` : ""
      }</div>
      ${orderItemsTable(meta.items)}
      <div style=\"border-top:1px solid #eee;margin:12px 0\"></div>
      <div style=\"display:flex;justify-content:space-between;font-size:14px;color:#1a1a1a;font-weight:600\">
        <span>Total</span>
        <span>${formatCurrency(total, currency)}</span>
      </div>
      ${
        meta.delivery_address
          ? `<div style=\\\"font-size:12px;color:#666;margin-top:6px\\\">Deliver to: ${meta.delivery_address}</div>`
          : ""
      }
      <div style=\"text-align:center;margin-top:18px\"><a href=\"${
        process.env.NEXT_PUBLIC_APP_URL || "#"
      }/orders\" style=\"background:#FF6B35;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;font-weight:600\">View order</a></div>
   `;
  const subject = `New delivery assignment — ${orderNo}`;
  return { subject, html: wrapBranded(subject, body, brand) };
}

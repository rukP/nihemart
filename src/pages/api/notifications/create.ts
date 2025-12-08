import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import {
   getOrderNumber,
   formatDeliveryAddress,
   getStatusDisplayText,
   createOrderSummary,
   formatCurrency,
   getOrderTotal,
   type NotificationMeta,
} from "@/utils/notification-formatters";

const supabase =
   process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createClient(
           process.env.NEXT_PUBLIC_SUPABASE_URL,
           process.env.SUPABASE_SERVICE_ROLE_KEY
        )
      : (null as any);

export default async function handler(
   req: NextApiRequest,
   res: NextApiResponse
) {
   if (!supabase)
      return res.status(500).json({ error: "Supabase not configured" });
   if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });

   let { recipient_user_id, recipient_role, type, title, body, meta } =
      req.body || {};
   // If a recipient_user_id is provided but no explicit role, treat as a customer/user
   if (recipient_user_id && !recipient_role) recipient_role = "user";
   if (!type) return res.status(400).json({ error: "type required" });

   // Generate meaningful title and body if not provided
   let finalTitle = title;
   let finalBody = body;
   try {
      const metaTyped = meta as NotificationMeta;
      const isAdmin = recipient_role === "admin";

      switch (type) {
         case "order_status_update": {
            const orderNumber = getOrderNumber(metaTyped);
            const status = getStatusDisplayText(
               metaTyped.status || metaTyped.order?.status
            );
            const items = metaTyped.items || metaTyped.order?.items || [];
            const total = getOrderTotal(metaTyped.order, items);
            const address = formatDeliveryAddress(metaTyped);

            if (isAdmin) {
               finalTitle = `Order Status Updated - ${orderNumber}`;
               finalBody = `Order ${orderNumber} status changed to ${status}`;
            } else {
               finalTitle = `Status Update - ${orderNumber}`;
               let detailedBody = `Your order status has been updated!\n\n`;
               detailedBody += `New Status: ${
                  status.charAt(0).toUpperCase() + status.slice(1)
               }\n\n`;
               detailedBody += `Order ${orderNumber}\n\n`;
               if (items && items.length > 0) {
                  detailedBody += `Items:\n`;
                  items.forEach((item) => {
                     const itemName = item.variation_name
                        ? `${item.product_name} (${item.variation_name})`
                        : item.product_name;
                     const unitPrice = formatCurrency(item.price || 0);
                     detailedBody += `${item.quantity}x ${itemName} ${unitPrice}`;
                     if (items.indexOf(item) < items.length - 1)
                        detailedBody += `, `;
                  });
                  detailedBody += `\n\n`;
               }
               if (total > 0)
                  detailedBody += `Total: ${formatCurrency(total)}\n\n`;
               if (address) detailedBody += `Delivery to: ${address}\n\n`;
               detailedBody += `We'll keep you updated as your order progresses. Thank you for your patience!`;
               finalBody = detailedBody;
            }
            break;
         }
         case "assignment_created": {
            const orderNumber = getOrderNumber(metaTyped);
            const address = formatDeliveryAddress(metaTyped);
            const total = getOrderTotal(metaTyped.order, metaTyped.items);
            const items = metaTyped.items || metaTyped.order?.items || [];
            const customerName =
               metaTyped.customer_name ||
               `${metaTyped.order?.customer_first_name || ""} ${
                  metaTyped.order?.customer_last_name || ""
               }`.trim() ||
               "Customer";

            if (isAdmin) {
               finalTitle = `Assignment Created - ${orderNumber}`;
               finalBody = `New delivery assignment created for ${orderNumber}`;
            } else {
               finalTitle = `You have a new delivery assignment!`;
               let detailedBody = `You have a new delivery assignment!\n\n`;
               detailedBody += `Order ${orderNumber}\n\n`;
               if (items && items.length > 0) {
                  detailedBody += `Items:\n`;
                  items.forEach((item) => {
                     const itemName = item.variation_name
                        ? `${item.product_name} (${item.variation_name})`
                        : item.product_name;
                     const unitPrice = formatCurrency(item.price || 0);
                     detailedBody += `${item.quantity}x ${itemName} ${unitPrice}\n`;
                  });
                  detailedBody += `\n`;
               }
               if (total > 0)
                  detailedBody += `Total: ${formatCurrency(total)}\n\n`;
               detailedBody += `Delivery to: ${
                  address || "Address not specified"
               }\n\n`;
               detailedBody += `Customer: ${customerName}\n\n`;
               detailedBody += `📍 Delivery Address: ${
                  address || "Address not specified"
               }\n\n`;
               if (total > 0)
                  detailedBody += `💰 Order Value: ${formatCurrency(
                     total
                  )}\n\n`;
               if (metaTyped.notes)
                  detailedBody += `📋 Note: ${metaTyped.notes}\n\n`;
               detailedBody += `⏰ Please accept or reject this assignment promptly to ensure timely delivery.`;
               finalBody = detailedBody;
            }
            break;
         }
         case "order_created": {
            const orderNumber = getOrderNumber(metaTyped);
            const items = metaTyped.items || metaTyped.order?.items || [];
            const total = getOrderTotal(metaTyped.order, items);
            const customerName =
               metaTyped.customer_name ||
               `${metaTyped.order?.customer_first_name || ""} ${
                  metaTyped.order?.customer_last_name || ""
               }`.trim() ||
               "Customer";

            if (isAdmin) {
               finalTitle = `New Order - ${orderNumber}`;
               finalBody = `${customerName} placed an order (${items
                  .map((it: any) => it.product_name || it.name || "item")
                  .slice(0, 5)
                  .join(", ")}${
                  items.length > 5 ? ` and ${items.length - 5} more` : ""
               })`;
            } else {
               finalTitle = `Order Confirmed - ${orderNumber}`;
               let detailedBody = `Thank you ${customerName}! Your order has been placed successfully.\n\n`;
               detailedBody += `Order ${orderNumber}\n\n`;
               if (items && items.length > 0) {
                  detailedBody += `Items:\n`;
                  items.forEach((item: any, idx: number) => {
                     const itemName = item.variation_name
                        ? `${item.product_name} (${item.variation_name})`
                        : item.product_name || item.name || `Item ${idx + 1}`;
                     const unitPrice = formatCurrency(item.price || 0);
                     detailedBody += `${
                        item.quantity || 1
                     }x ${itemName} ${unitPrice}`;
                     if (idx < items.length - 1) detailedBody += `, `;
                  });
                  detailedBody += `\n\n`;
               }
               if (total > 0)
                  detailedBody += `Total: ${formatCurrency(total)}\n\n`;
               const address = formatDeliveryAddress(metaTyped);
               if (address) detailedBody += `Delivery to: ${address}\n\n`;
               detailedBody += `We'll let you know when a rider is assigned and when your order is out for delivery. Thank you for shopping with Nihemart!`;
               finalBody = detailedBody;
            }

            break;
         }
         case "assignment_created": {
            const orderNumber = getOrderNumber(metaTyped);
            const address = formatDeliveryAddress(metaTyped);
            const total = getOrderTotal(metaTyped.order, metaTyped.items);
            const items = metaTyped.items || metaTyped.order?.items || [];
            const customerName =
               metaTyped.customer_name ||
               `${metaTyped.order?.customer_first_name || ""} ${
                  metaTyped.order?.customer_last_name || ""
               }`.trim() ||
               "Customer";

            if (isAdmin) {
               // Short notification for admin
               finalTitle = `Assignment Created - ${orderNumber}`;
               finalBody = `New delivery assignment created for ${orderNumber}`;
            } else {
               // Detailed notification for riders
               finalTitle = `You have a new delivery assignment!`;

               let detailedBody = `You have a new delivery assignment!\n\n`;
               detailedBody += `Order ${orderNumber}\n\n`;

               // Add items if available
               if (items && items.length > 0) {
                  detailedBody += `Items:\n`;
                  items.forEach((item) => {
                     const itemName = item.variation_name
                        ? `${item.product_name} (${item.variation_name})`
                        : item.product_name;
                     const unitPrice = formatCurrency(item.price || 0);
                     detailedBody += `${item.quantity}x ${itemName} ${unitPrice}\n`;
                  });
                  detailedBody += `\n`;
               }

               // Add total if available
               if (total > 0) {
                  detailedBody += `Total: ${formatCurrency(total)}\n\n`;
               }

               // Add customer and delivery info
               detailedBody += `Delivery to: ${
                  address || "Address not specified"
               }\n\n`;
               detailedBody += `Customer: ${customerName}\n\n`;

               // Add delivery address again for clarity
               detailedBody += `📍 Delivery Address: ${
                  address || "Address not specified"
               }\n\n`;

               // Add order value
               if (total > 0) {
                  detailedBody += `💰 Order Value: ${formatCurrency(
                     total
                  )}\n\n`;
               }

               // Add notes if available
               if (metaTyped.notes) {
                  detailedBody += `📋 Note: ${metaTyped.notes}\n\n`;
               }

               detailedBody += `⏰ Please accept or reject this assignment promptly to ensure timely delivery.`;

               finalBody = detailedBody;
            }
            break;
         }
         case "order_created": {
            const orderNumber = getOrderNumber(metaTyped);
            const items = metaTyped.items || metaTyped.order?.items || [];
            const total = getOrderTotal(metaTyped.order, items);
            const customerName =
               metaTyped.customer_name ||
               `${metaTyped.order?.customer_first_name || ""} ${
                  metaTyped.order?.customer_last_name || ""
               }`.trim() ||
               "Customer";

            if (isAdmin) {
               // Short but informative admin notification
               finalTitle = `New Order - ${orderNumber}`;
               finalBody = `${customerName} placed an order (${items
                  .map((it: any) => it.product_name || it.name || "item")
                  .slice(0, 5)
                  .join(", ")}${
                  items.length > 5 ? ` and ${items.length - 5} more` : ""
               })`;
            } else {
               // Detailed customer confirmation
               finalTitle = `Order Confirmed - ${orderNumber}`;
               let detailedBody = `Thank you ${customerName}! Your order has been placed successfully.\n\n`;
               detailedBody += `Order ${orderNumber}\n\n`;

               if (items && items.length > 0) {
                  detailedBody += `Items:\n`;
                  items.forEach((item: any, idx: number) => {
                     const itemName = item.variation_name
                        ? `${item.product_name} (${item.variation_name})`
                        : item.product_name || item.name || `Item ${idx + 1}`;
                     const unitPrice = formatCurrency(item.price || 0);
                     detailedBody += `${
                        item.quantity || 1
                     }x ${itemName} ${unitPrice}`;
                     if (idx < items.length - 1) detailedBody += `, `;
                  });
                  detailedBody += `\n\n`;
               }

               if (total > 0) {
                  detailedBody += `Total: ${formatCurrency(total)}\n\n`;
               }

               const address = formatDeliveryAddress(metaTyped);
               if (address) {
                  detailedBody += `Delivery to: ${address}\n\n`;
               }

               detailedBody += `We'll let you know when a rider is assigned and when your order is out for delivery. Thank you for shopping with Nihemart!`;
               finalBody = detailedBody;
            }

            break;
         }
         case "assignment_accepted": {
            const orderNumber = getOrderNumber(metaTyped);
            const riderName =
               metaTyped.rider_name ||
               metaTyped.rider?.name ||
               metaTyped.rider?.full_name ||
               "Your Delivery Rider";
            const riderPhone =
               metaTyped.rider_phone || metaTyped.rider?.phone || null;
            const address = formatDeliveryAddress(metaTyped);
            const items = metaTyped.items || metaTyped.order?.items || [];
            const total = getOrderTotal(metaTyped.order, items);

            if (isAdmin) {
               // Short notification for admin
               finalTitle = `Assignment Accepted - ${orderNumber}`;
               finalBody = `Rider ${riderName} accepted delivery for ${orderNumber}`;
            } else if (recipient_user_id) {
               // Detailed notification for customers
               finalTitle = `Rider Assigned - ${orderNumber}`;

               let detailedBody = `Your rider is on the way to deliver your order!\n\n`;

               // Add rider information
               detailedBody += `Rider: ${riderName}`;
               if (riderPhone) {
                  detailedBody += ` (${riderPhone})`;
               }
               detailedBody += `\n\n`;

               // Add order details
               detailedBody += `Order ${orderNumber}\n\n`;

               // Add items if available
               if (items && items.length > 0) {
                  detailedBody += `Items:\n`;
                  items.forEach((item) => {
                     const itemName = item.variation_name
                        ? `${item.product_name} (${item.variation_name})`
                        : item.product_name;
                     const unitPrice = formatCurrency(item.price || 0);
                     detailedBody += `${item.quantity}x ${itemName} ${unitPrice}\n`;
                  });
                  detailedBody += `\n`;
               }

               // Add total if available
               if (total > 0) {
                  detailedBody += `Total: ${formatCurrency(total)}\n\n`;
               }

               // Add delivery address
               if (address) {
                  detailedBody += `Delivery to: ${address}\n\n`;
               }

               detailedBody += `📍 Delivery Address: ${
                  address || "Address not specified"
               }\n\n`;
               detailedBody += `💰 Order Value: ${formatCurrency(total)}\n\n`;
               detailedBody += `The rider will contact you when they arrive. Thank you for choosing Nihemart!`;

               finalBody = detailedBody;
            } else {
               // Generic notification
               finalTitle = `Your Order is On the Way - ${orderNumber}`;
               finalBody = `Good news! A rider has accepted your delivery request for ${orderNumber}.\n\n${createOrderSummary(
                  metaTyped
               )}\n\nYou'll receive another notification when the rider is nearby.`;
            }
            break;
         }
         case "assignment_rejected": {
            const orderNumber = getOrderNumber(metaTyped);
            const orderSummary = createOrderSummary(metaTyped);

            if (isAdmin) {
               // Short notification for admin
               finalTitle = `Assignment Rejected - ${orderNumber}`;
               finalBody = `Assignment for ${orderNumber} was rejected`;
            } else {
               // Detailed notification for riders
               finalTitle = `Assignment Rejected - ${orderNumber}`;
               finalBody = `You have declined the delivery assignment for ${orderNumber}.\n\n${orderSummary}\n\nThe order will be reassigned to another rider. Thank you for your prompt response.`;
            }
            break;
         }
         case "order_delivered": {
            const orderNumber = getOrderNumber(metaTyped);
            const items = metaTyped.items || metaTyped.order?.items || [];
            const total = getOrderTotal(metaTyped.order, items);
            const address = formatDeliveryAddress(metaTyped);

            if (isAdmin) {
               // Short notification for admin
               finalTitle = `Order Delivered - ${orderNumber}`;
               finalBody = `Order ${orderNumber} has been delivered successfully`;
            } else {
               // Detailed notification for customers
               finalTitle = `Order Delivered - ${orderNumber}`;

               let detailedBody = `Excellent! Your order has been delivered successfully!\n\n`;

               // Add order details
               detailedBody += `Order ${orderNumber}\n\n`;

               // Add items if available
               if (items && items.length > 0) {
                  detailedBody += `Items:\n`;
                  items.forEach((item) => {
                     const itemName = item.variation_name
                        ? `${item.product_name} (${item.variation_name})`
                        : item.product_name;
                     const unitPrice = formatCurrency(item.price || 0);
                     detailedBody += `${item.quantity}x ${itemName} ${unitPrice}\n`;
                  });
                  detailedBody += `\n`;
               }

               // Add total if available
               if (total > 0) {
                  detailedBody += `Total paid: ${formatCurrency(total)}\n\n`;
               }

               // Add delivery address
               if (address) {
                  detailedBody += `Delivered to: ${address}\n\n`;
               }

               detailedBody += `Thank you for choosing Nihemart! We hope you enjoy your purchase.\n\nHave any feedback? We'd love to hear from you!`;

               finalBody = detailedBody;
            }
            break;
         }
         case "refund_requested": {
            const orderNumber = getOrderNumber(metaTyped);
            const total = getOrderTotal(metaTyped.order, metaTyped.items);
            const items = metaTyped.items || metaTyped.order?.items || [];

            if (isAdmin) {
               // Short notification for admin
               finalTitle = `Refund Request - ${orderNumber}`;
               finalBody = `Refund requested for ${orderNumber}${
                  total > 0 ? ` (${formatCurrency(total)})` : ""
               }`;
            } else {
               // Detailed notification for customers
               finalTitle = `Refund Request - ${orderNumber}`;

               let detailedBody = `We have received your refund request!\n\n`;
               detailedBody += `Order ${orderNumber}\n\n`;

               // Add items if available
               if (items && items.length > 0) {
                  detailedBody += `Items:\n`;
                  items.forEach((item) => {
                     const itemName = item.variation_name
                        ? `${item.product_name} (${item.variation_name})`
                        : item.product_name;
                     const unitPrice = formatCurrency(item.price || 0);
                     detailedBody += `${item.quantity}x ${itemName} ${unitPrice}\n`;
                  });
                  detailedBody += `\n`;
               }

               if (total > 0) {
                  detailedBody += `Refund Amount: ${formatCurrency(total)}\n\n`;
               }

               if (metaTyped?.details) {
                  detailedBody += `Details: ${metaTyped.details}\n\n`;
               }

               detailedBody += `We will process your refund within 3-5 business days. You'll receive a confirmation once it's completed.\n\nThank you for your patience.`;
               detailedBody += `\n\nYou will receive your money after returning the products, but you will pay transport fee.`;

               finalBody = detailedBody;
            }
            break;
         }
         // Note: reject_* notification types were intentionally removed as
         // client-side rejects are final and don't require separate admin flows.
         // If a reject_* type is still sent, fall through to default handling.
         case "refund_approved": {
            const orderNumber = getOrderNumber(metaTyped);
            const total = getOrderTotal(metaTyped.order, metaTyped.items);
            const items = metaTyped.items || metaTyped.order?.items || [];

            if (isAdmin) {
               // Short notification for admin
               finalTitle = `Refund Approved - ${orderNumber}`;
               finalBody = `Refund approved for ${orderNumber}${
                  total > 0 ? ` (${formatCurrency(total)})` : ""
               }`;
            } else {
               // Detailed notification for customers
               finalTitle = `Refund Approved - ${orderNumber}`;

               let detailedBody = `Great news! Your refund has been approved!\n\n`;
               detailedBody += `Order ${orderNumber}\n\n`;

               // Add items if available
               if (items && items.length > 0) {
                  detailedBody += `Items:\n`;
                  items.forEach((item) => {
                     const itemName = item.variation_name
                        ? `${item.product_name} (${item.variation_name})`
                        : item.product_name;
                     const unitPrice = formatCurrency(item.price || 0);
                     detailedBody += `${item.quantity}x ${itemName} ${unitPrice}\n`;
                  });
                  detailedBody += `\n`;
               }

               if (total > 0) {
                  detailedBody += `Refund Amount: ${formatCurrency(total)}\n\n`;
               }

               if (metaTyped?.details) {
                  detailedBody += `Details: ${metaTyped.details}\n\n`;
               }

               detailedBody += `You should see the refund in your account within 3-5 business days.\n\nThank you for choosing Nihemart!`;
               detailedBody += `\n\nYou will receive your money after returning the products, but you will pay transport fee.`;

               finalBody = detailedBody;
            }
            break;
         }
         case "promotion": {
            if (isAdmin) {
               // Short notification for admin
               finalTitle = "Promotion Created";
               finalBody = "New promotion has been created";
            } else {
               // Detailed notification for customers/riders
               finalTitle = "🎁 Special Promotion";
               if (metaTyped?.details) {
                  finalBody = `Don't miss out on this amazing offer!\n\n${metaTyped.details}\n\nVisit our store now to take advantage of this limited-time promotion.\n\nHappy shopping from the Nihemart team! 🛒`;
               } else {
                  finalBody =
                     "🎉 Exciting news! We have special offers waiting for you!\n\nCheck out our latest promotions and save on your next order.\n\nVisit our store now to discover amazing deals and discounts.\n\nHappy shopping from the Nihemart team! 🛒";
               }
            }
            break;
         }
         case "system": {
            if (isAdmin) {
               // Short notification for admin
               finalTitle = "System Update";
               finalBody =
                  metaTyped?.details || "System maintenance notification";
            } else {
               // Detailed notification for customers/riders
               finalTitle = "⚙️ System Notification";
               if (metaTyped?.details) {
                  finalBody = `Important system update:\n\n${metaTyped.details}\n\nIf you experience any issues, please don't hesitate to contact our support team.\n\nThank you for your understanding.`;
               } else {
                  finalBody =
                     "📢 We have an important system update to share with you.\n\nOur platform may experience brief maintenance periods to improve your experience.\n\nIf you encounter any issues, please contact our support team.\n\nThank you for your patience and understanding!";
               }
            }
            break;
         }
         case "order_assigned": {
            const orderNumber = getOrderNumber(metaTyped);
            const riderName = metaTyped.rider_name || "Delivery Rider";
            const items = metaTyped.items || metaTyped.order?.items || [];
            const total = getOrderTotal(metaTyped.order, items);
            const address = formatDeliveryAddress(metaTyped);

            if (isAdmin) {
               // Short notification for admin
               finalTitle = `Order Assigned - ${orderNumber}`;
               finalBody = `Order ${orderNumber} has been assigned to ${riderName}`;
            } else {
               // Detailed notification for customers
               finalTitle = `Order Assigned - ${orderNumber}`;

               let detailedBody = `Good news! Your order has been assigned to a delivery rider!\n\n`;

               // Add order details
               detailedBody += `Order ${orderNumber}\n\n`;

               // Add rider information
               detailedBody += `Assigned to: ${riderName}\n\n`;

               // Add items if available
               if (items && items.length > 0) {
                  detailedBody += `Items:\n`;
                  items.forEach((item) => {
                     const itemName = item.variation_name
                        ? `${item.product_name} (${item.variation_name})`
                        : item.product_name;
                     const unitPrice = formatCurrency(item.price || 0);
                     detailedBody += `${item.quantity}x ${itemName} ${unitPrice}\n`;
                  });
                  detailedBody += `\n`;
               }

               // Add total if available
               if (total > 0) {
                  detailedBody += `Total: ${formatCurrency(total)}\n\n`;
               }

               // Add delivery address
               if (address) {
                  detailedBody += `Delivery to: ${address}\n\n`;
               }

               detailedBody += `Your rider will soon accept the assignment and begin preparing for delivery. You'll receive another notification once they're on their way!\n\nThank you for choosing Nihemart! 🚚`;

               finalBody = detailedBody;
            }
            break;
         }
         default: {
            // For any undefined notification type, try to create a meaningful message
            const orderNumber = getOrderNumber(metaTyped);
            const orderSummary = createOrderSummary(metaTyped);

            if (isAdmin) {
               // Short notification for admin
               if (orderNumber) {
                  finalTitle = finalTitle || `Order Update - ${orderNumber}`;
                  finalBody = finalBody || `Update for ${orderNumber}`;
               } else {
                  finalTitle = finalTitle || "Notification";
                  finalBody = finalBody || "New notification";
               }
            } else {
               // Detailed notification for customers/riders
               if (orderSummary && orderSummary !== `Order ${orderNumber}`) {
                  // We have order information, use it
                  finalTitle = finalTitle || `Update for ${orderNumber}`;
                  finalBody =
                     finalBody ||
                     `You have an update regarding ${orderNumber}.\n\n${orderSummary}\n\nIf you have any questions, please don't hesitate to contact our customer support team. We're here to help!\n\nThank you for choosing Nihemart!`;
               } else {
                  // Generic notification
                  finalTitle = finalTitle || "🔔 Nihemart Notification";
                  finalBody =
                     finalBody ||
                     "You have received a new notification from Nihemart.\n\nPlease check your account for more details or contact our support team if you have any questions.\n\nThank you for being a valued customer!";
               }
            }
         }
      }

      // Avoid inserting near-duplicate notifications for the same target+order+type
      try {
         const metaObj =
            (typeof meta === "string" ? JSON.parse(meta) : meta) || {};
         const orderId = metaObj.order_id || metaObj.order?.id || null;
         if (orderId) {
            const thirtySecondsAgo = new Date(
               Date.now() - 30 * 1000
            ).toISOString();
            const { data: dupCheck, error: dupErr } = await supabase
               .from("notifications")
               .select("id")
               .eq("type", type)
               .eq("recipient_role", recipient_role || null)
               .eq("recipient_user_id", recipient_user_id || null)
               .gt("created_at", thirtySecondsAgo)
               .limit(1);
            if (!dupErr && Array.isArray(dupCheck) && dupCheck.length > 0) {
               return res
                  .status(200)
                  .json({ notification: dupCheck[0], skippedDuplicate: true });
            }
         }
      } catch (e) {
         console.warn("notifications dup-check failed:", e);
      }

      const { data, error } = await supabase
         .from("notifications")
         .insert([
            {
               recipient_user_id: recipient_user_id || null,
               recipient_role: recipient_role || null,
               type,
               title: finalTitle,
               body: finalBody || null,
               meta: meta || null,
            },
         ])
         .select()
         .single();

      if (error) {
         console.error("create notification error", error);
         return res.status(500).json({ error: error.message || error });
      }
      return res.status(200).json({ notification: data });
   } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: err.message || err });
   }
}

/**
 * Example usage of the improved notification system
 * This file shows how to create notifications with rich, user-friendly content
 */

import { OrderItem, Order } from "@/types/orders";

// Example: Create a rider assignment notification for a customer
export const createRiderAssignmentNotification = async (
  customerId: string,
  order: Order,
  riderName: string,
  riderPhone?: string
) => {
  const notificationData = {
    recipient_user_id: customerId,
    type: "assignment_accepted",
    meta: {
      order,
      items: order.items, // Include full order items for detailed display
      rider_name: riderName,
      rider_phone: riderPhone || null,
      delivery_address: order.delivery_address,
    },
  };

  const response = await fetch("/api/notifications/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(notificationData),
  });

  return response.json();
};

// Example: Create an order status update notification
export const createOrderStatusNotification = async (
  customerId: string,
  order: Order,
  newStatus: string
) => {
  const notificationData = {
    recipient_user_id: customerId,
    type: "order_status_update",
    meta: {
      order,
      items: order.items, // Include items for detailed summary
      status: newStatus,
    },
  };

  const response = await fetch("/api/notifications/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(notificationData),
  });

  return response.json();
};

// Example: Create an order delivered notification
export const createOrderDeliveredNotification = async (
  customerId: string,
  order: Order
) => {
  const notificationData = {
    recipient_user_id: customerId,
    type: "order_delivered",
    meta: {
      order,
      items: order.items, // Include items for summary
    },
  };

  const response = await fetch("/api/notifications/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(notificationData),
  });

  return response.json();
};

// Example: Create a refund approved notification
export const createRefundApprovedNotification = async (
  customerId: string,
  order: Order,
  refundAmount?: number
) => {
  const notificationData = {
    recipient_user_id: customerId,
    type: "refund_approved",
    meta: {
      order,
      items: order.items, // Include items for context
      refund_amount: refundAmount || order.total,
    },
  };

  const response = await fetch("/api/notifications/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(notificationData),
  });

  return response.json();
};

// Example notification that will be generated:
/*
For rider assignment:

Title: "Rider Assigned - #NH12345"
Body: "Your rider is on the way to deliver your order!

Rider: John Doe, +234 901 234 5678
Delivering to: 123 Main Street, Lagos...

Order #NH12345

Items:
2x Pizza Margherita ₦3,500, 1x Coca Cola ₦500

Total: ₦7,500

Delivery to: 123 Main Street, Lagos State"

This is much more informative and professional than:
"Rider on the way
This rider is going to deliver your order.\nRider,\nNo phone provided"
*/
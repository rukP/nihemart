import React from 'react';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { Order, OrderItem } from '@/types/orders';

interface Notification {
  id: string;
  recipientUserId?: string;
  recipientRole?: string;
  type: string;
  title: string;
  body?: string;
  meta?: any;
  read: boolean;
  createdAt: string;
}

interface NotificationResponse {
  notifications: Notification[];
}

interface NotificationPageProps {
  params: Promise<{ id: string }>;
}

export default async function NotificationPage({
  params,
}: NotificationPageProps) {
  const { id } = await params;

  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API_URL ||
    'https://api.nihemart.rw/api';

  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    return notFound();
  }

  // Fetch notification by id
  const notifRes = await fetch(
    `${API_BASE}/notifications?notificationId=${id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!notifRes.ok) {
    console.error('Failed to fetch notification', notifRes.status);
    return notFound();
  }

  const notifData: NotificationResponse = await notifRes.json();
  const notif: Notification | undefined =
    notifData.notifications && notifData.notifications[0];

  if (!notif) return notFound();

  // Try to fetch the related order if meta includes one
  let order: Order | null = null;
  try {
    const meta = notif.meta || {};
    const orderId = meta?.order?.id || meta?.order_id || meta?.orderId || null;
    if (orderId) {
      const orderRes = await fetch(`${API_BASE}/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (orderRes.ok) {
        order = await orderRes.json();
      }
    }
  } catch (_e) {
    // ignore
  }

  const orderNumber =
    (notif.meta &&
      (notif.meta.order?.order_number || notif.meta.order_number)) ||
    null;
  const deliveryAddress =
    notif.meta?.order?.delivery_address ||
    notif.meta?.delivery_address ||
    'Not provided';
  const deliveryCity =
    notif.meta?.order?.delivery_city || notif.meta?.delivery_city || null;
  const deliveryNotes =
    notif.meta?.order?.delivery_notes || notif.meta?.delivery_notes || null;

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold">{notif.title}</h1>
        {notif.body && (
          <p className="mt-2 text-sm text-muted-foreground">{notif.body}</p>
        )}
        <div className="mt-4 text-xs text-muted-foreground">
          Received: {new Date(notif.createdAt).toLocaleString()}
        </div>

        <div className="mt-6 p-4 border rounded-lg bg-white">
          <h2 className="font-semibold">Delivery details</h2>
          <div className="mt-2 text-sm space-y-2">
            <p>
              <strong>Order:</strong>{' '}
              {orderNumber ||
                (notif.meta?.order?.id ?? notif.meta?.order_id ?? '—')}
            </p>
            <p>
              <strong>Address:</strong> {deliveryAddress}
            </p>
            {deliveryCity && (
              <p>
                <strong>City:</strong> {deliveryCity}
              </p>
            )}
            {deliveryNotes && <p className="italic">Note: {deliveryNotes}</p>}
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
                  <h4 className="font-semibold mb-2">Delivery Address</h4>
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
                    {order.items?.map((item: OrderItem, idx: number) => (
                      <div
                        key={item.id}
                        className={`${idx !== 0 ? 'border-t pt-4' : ''}`}
                      >
                        <div className="flex justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{item.product_name}</p>
                            {item.variation_name && (
                              <p className="text-sm text-muted-foreground">
                                Variation: {item.variation_name}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              Quantity: {item.quantity}
                            </p>

                            {/* FIXED: Show refund/rejection status for riders */}
                            {item.refund_status && (
                              <span
                                className={`inline-block mt-2 px-2 py-1 rounded-md text-xs font-semibold ${
                                  item.refund_status === 'approved'
                                    ? 'bg-green-100 text-green-700'
                                    : item.refund_status === 'rejected'
                                      ? 'bg-red-100 text-red-700'
                                      : item.refund_status === 'requested'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {item.refund_status === 'approved'
                                  ? '✓ Refund Approved'
                                  : item.refund_status === 'rejected'
                                    ? '✗ Item Rejected'
                                    : item.refund_status === 'requested'
                                      ? '⏱ Refund Requested'
                                      : item.refund_status
                                          .charAt(0)
                                          .toUpperCase() +
                                        item.refund_status.slice(1)}
                              </span>
                            )}

                            {item.refund_reason && (
                              <p className="text-xs italic mt-1 text-muted-foreground">
                                Reason: {item.refund_reason}
                              </p>
                            )}
                          </div>
                          <div className="font-medium">
                            {item.total.toLocaleString()} RWF
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 border rounded">
                  <h4 className="font-semibold mb-2">Summary</h4>
                  <div className="space-y-2">
                    {/* FIXED: Show payment method for riders */}
                    <div className="flex justify-between pb-2 border-b">
                      <p className="text-muted-foreground font-medium">
                        Payment Method
                      </p>
                      <p className="font-semibold capitalize">
                        {order.payment_method?.replace(/_/g, ' ') ||
                          'Cash on Delivery'}
                      </p>
                    </div>

                    <div className="flex justify-between">
                      <p className="text-muted-foreground">Subtotal</p>
                      <p>{order.subtotal.toLocaleString()} RWF</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-muted-foreground">Transport fee</p>
                      <p>{Number(order.tax || 0).toLocaleString()} RWF</p>
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

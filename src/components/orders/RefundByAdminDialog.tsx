'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Order } from '@/types/orders';
import { useOrders } from '@/hooks/useOrders';
import { toast } from 'sonner';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { User, Package, Loader2, Receipt, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  order: Order;
  onSuccess?: () => void;
}

export function RefundByAdminDialog({
  open,
  onOpenChange,
  order,
  onSuccess,
}: Props) {
  const {
    useRequestRefundItem,
    useRequestRefundOrder,
    useRespondRefundRequest,
    useRespondOrderRefund,
  } = useOrders();
  const requestItem = useRequestRefundItem();
  const requestOrder = useRequestRefundOrder();
  const respondItem = useRespondRefundRequest();
  const respondOrder = useRespondOrderRefund();
  const [processing, setProcessing] = useState(false);
  const [note, setNote] = useState('');
  const [target, setTarget] = useState<'order' | 'item'>('order');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    order.items && order.items.length === 1 ? order.items[0].id : null
  );

  const handleSubmit = async () => {
    if (processing) return;

    if (target === 'item' && !selectedItemId) {
      toast.error('Please select an item to refund');
      return;
    }

    setProcessing(true);
    try {
      if (target === 'item') {
        // Step 1: Create refund request
        await requestItem.mutateAsync({
          orderItemId: selectedItemId!,
          reason: note || 'Refund by admin',
          isDelivered: isDelivered, // FIXED: Pass isDelivered flag so correct endpoint is called
        } as any);

        // Step 2: Immediately approve it
        await respondItem.mutateAsync({
          itemId: selectedItemId!,
          approve: true,
          _note: note || 'Approved by admin',
        });

        toast.success('Item refunded successfully');
      } else {
        // Step 1: Create refund request
        await requestOrder.mutateAsync({
          orderId: order.id,
          reason: note || 'Refund by admin',
          adminInitiated: true,
        } as any);

        // Step 2: Immediately approve it
        await respondOrder.mutateAsync({
          orderId: order.id,
          approve: true,
          _note: note || 'Approved by admin',
        });

        toast.success('Full order refunded successfully');
      }
      onSuccess?.();
      onOpenChange(false);
      setNote('');
      setTarget('order');
      setSelectedItemId(null);
    } catch (err: any) {
      toast.error(err?.message || `Failed to process refund`);
    } finally {
      setProcessing(false);
    }
  };

  const customerName =
    `${order.customer_first_name} ${order.customer_last_name}`.trim();

  const statusLower = (order.status || '').toLowerCase();
  const isDelivered = statusLower === 'delivered';

  const _selectedItem =
    (order.items || []).find(it => it.id === selectedItemId) || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl px-1 sm:px-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-blue-500" />
            Process Refund (Admin)
          </DialogTitle>
          <DialogDescription>
            Process and approve a refund for this order. You can choose to
            refund the entire order or specific items. The refund will be
            approved automatically.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh]">
          <div className="space-y-4 p-2 sm:p-4">
            {/* Customer Info Card */}
            <Card className="p-4 border-0 bg-gradient-to-br from-blue-50 to-white shadow-none">
              <div className="flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-blue-500" />
                <h4 className="font-semibold text-sm">Customer</h4>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{customerName}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.delivery_city}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {order.order_number}
                </Badge>
              </div>
            </Card>

            {!isDelivered && (
              <Card className="p-3 border-0 bg-yellow-50 shadow-none">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Order Not Delivered</p>
                    <p className="text-sm text-amber-900">
                      This order has not been delivered yet. Refund requests are
                      typically for delivered orders.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Refund Target Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">
                What would you like to refund?
              </Label>
              <RadioGroup
                value={target}
                onValueChange={val => {
                  setTarget(val as 'order' | 'item');
                  if (val === 'order') {
                    setSelectedItemId(null);
                  } else if (order.items && order.items.length === 1) {
                    setSelectedItemId(order.items[0].id);
                  }
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="order" id="order" />
                  <Label htmlFor="order" className="font-normal cursor-pointer">
                    Full Order Refund
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="item" id="item" />
                  <Label htmlFor="item" className="font-normal cursor-pointer">
                    Specific Item(s)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Item Selection (if target is item) */}
            {target === 'item' && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  Select Item to Refund
                </Label>
                <div className="space-y-2">
                  {/* FIXED: Filter out rejected items - they cannot be refunded */}
                  {(order.items || [])
                    .filter(
                      item =>
                        !item.rejected && item.refund_status !== 'rejected'
                    )
                    .map(item => (
                      <Card
                        key={item.id}
                        className={cn(
                          'p-3 cursor-pointer transition-all hover:border-blue-400',
                          selectedItemId === item.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200'
                        )}
                        onClick={() => setSelectedItemId(item.id)}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            checked={selectedItemId === item.id}
                            onChange={() => setSelectedItemId(item.id)}
                            className="mt-1"
                            aria-label={`Select ${item.product_name} for refund`}
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {item.product_name}
                            </div>
                            {item.variation_name && (
                              <div className="text-xs text-muted-foreground">
                                {item.variation_name}
                              </div>
                            )}
                            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                              <span>Qty: {item.quantity}</span>
                              <span>
                                {item.total?.toLocaleString() || 0} RWF
                              </span>
                            </div>
                            {item.refund_status && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                {item.refund_status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                </div>
              </div>
            )}

            {/* Order Summary */}
            {target === 'order' && (
              <Card className="p-4 border-0 bg-gray-50 shadow-none">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="h-4 w-4 text-gray-500" />
                  <h4 className="font-semibold text-sm">Order Items</h4>
                </div>
                <div className="space-y-2">
                  {(order.items || []).map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        {item.product_name}
                        {item.variation_name && (
                          <span className="text-muted-foreground">
                            {' '}
                            ({item.variation_name})
                          </span>
                        )}{' '}
                        × {item.quantity}
                      </span>
                      <span className="font-medium">
                        {item.total?.toLocaleString() || 0} RWF
                      </span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{order.total?.toLocaleString() || 0} RWF</span>
                  </div>
                </div>
              </Card>
            )}

            {/* Reason/Note */}
            <div className="space-y-2">
              <Label htmlFor="note" className="text-sm font-semibold">
                Reason / Note (Optional)
              </Label>
              <Textarea
                id="note"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Enter reason for refund..."
                className="min-h-[80px]"
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={processing || (target === 'item' && !selectedItemId)}
          >
            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Process Refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

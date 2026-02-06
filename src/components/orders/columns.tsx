'use client';

import { ColumnDef } from '@tanstack/react-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { format, isValid } from 'date-fns';
import { UserAvatarProfile } from '../user-avatar-profile';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { useState, useEffect } from 'react';
import { unauthorizedAPI } from '@/lib/api';
import handleApiRequest from '@/lib/handleApiRequest';
import { CustomerDetailsDialog } from './CustomerDetailsDialog';
import { OrderDetailsDialog } from './OrderDetailsDialog';
import { AssignRiderDialog } from './AssignRiderDialog';
import { ManageRefundDialog } from './ManageRefundDialog';
import { RefundByAdminDialog } from './RefundByAdminDialog';
import { LabelOrderDialog } from './LabelOrderDialog';
import { useOrders } from '@/hooks/useOrders';
import { useAuth } from '@/hooks/useAuth';
import { Order, OrderStatus } from '@/types/orders';

const Status = ({ status }: { status: Order['status'] }) => {
  return (
    <Badge
      className={cn('capitalize font-semibold', {
        'bg-green-500/10 text-green-500': status === 'delivered',
        'bg-yellow-500/10 text-yellow-500':
          status === 'pending' ||
          status === 'processing' ||
          status === 'shipped',
        'bg-blue-500/10 text-blue-500': status === 'assigned',
        'bg-red-500/10 text-red-500': status === 'cancelled',
      })}
    >
      {status || 'unknown'}
    </Badge>
  );
};

// Extracted component for RIDER cell to properly use hooks
function RiderCell({
  order,
  assignmentsMap,
}: {
  order: Order;
  assignmentsMap?: Record<string, { assignment: any; rider: any }>;
}) {
  const orderId = order.id;
  // First try the batched assignments map (fast). If missing, fall back to the order.assignments relation.
  const assignmentData = assignmentsMap?.[orderId];
  let rider = assignmentData?.rider;

  if (
    !rider &&
    Array.isArray((order as any)?.assignments) &&
    (order as any).assignments.length > 0
  ) {
    // OrderDetailsDialog treats assignments[0] as latest; prefer that behavior
    const latest = (order as any).assignments[0];
    rider =
      latest?.rider ||
      (order as any).rider ||
      (order as any).assignment?.rider ||
      null;
  }

  const [localRider, setLocalRider] = useState<any | null>(rider || null);
  const [localLoading, setLocalLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (localRider || !orderId) return;

    const fetchFallback = async () => {
      setLocalLoading(true);
      try {
        const resp = await handleApiRequest(() =>
          unauthorizedAPI.get(`/orders/assignments/batch?ids=${orderId}`)
        );
        if (
          resp?.assignments &&
          resp.assignments[orderId] &&
          resp.assignments[orderId].rider
        ) {
          if (mounted) setLocalRider(resp.assignments[orderId].rider);
          setLocalLoading(false);
          return;
        }

        // Try fetching full order as last resort
        const full = await handleApiRequest(() =>
          unauthorizedAPI.get(`/orders/${orderId}`)
        );
        if (full) {
          // mimic OrderDetailsDialog extraction
          if (
            Array.isArray((full as any).assignments) &&
            (full as any).assignments.length > 0 &&
            (full as any).assignments[0].rider
          ) {
            if (mounted) setLocalRider((full as any).assignments[0].rider);
            setLocalLoading(false);
            return;
          }
          if (full.rider) {
            if (mounted) setLocalRider(full.rider);
            setLocalLoading(false);
            return;
          }
        }

        if (mounted) setLocalRider(null);
      } catch (_err) {
        if (mounted) setLocalRider(null);
      } finally {
        if (mounted) setLocalLoading(false);
      }
    };

    fetchFallback();
    return () => {
      mounted = false;
    };
  }, [orderId, localRider]);

  const finalRider = localRider || rider;

  if (!finalRider && !localLoading)
    return <span className="text-sm text-muted-foreground">Unassigned</span>;

  if (!finalRider && localLoading)
    return <span className="text-sm text-muted-foreground">Loading…</span>;

  return (
    <div className="flex items-center gap-2">
      <UserAvatarProfile
        user={{
          fullName:
            finalRider.fullName || finalRider.full_name || finalRider.name,
          subTitle: finalRider.phone || undefined,
          imageUrl: finalRider.imageUrl || finalRider.image_url || undefined,
        }}
        showInfo={false}
      />
      <span className="text-sm">
        {finalRider.fullName ||
          finalRider.full_name ||
          finalRider.name ||
          finalRider.id}
      </span>
    </div>
  );
}

// Extracted component for STATUS cell to properly use hooks
function StatusCell({ order }: { order: Order }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { updateOrderStatus } = useOrders();
  const currentStatus = (order.status || 'pending') as OrderStatus;
  const isExternal = !!order.is_external;

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (isUpdating) return;
    try {
      setIsUpdating(true);
      await updateOrderStatus.mutateAsync({
        id: order.id,
        status: newStatus,
      });
    } catch (_error) {
      console.error('Failed to update order status:', _error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isUpdating || !isExternal}
        className="w-full"
      >
        <div className={isUpdating ? 'opacity-50 cursor-not-allowed' : ''}>
          <Status status={currentStatus} />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>
          Update Status
          {!isExternal && (
            <span className="ml-2 text-xs text-zinc-500">
              (external orders only)
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => handleStatusChange('pending')}
          disabled={!isExternal}
        >
          Pending
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleStatusChange('processing')}
          disabled={!isExternal}
        >
          Processing
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleStatusChange('assigned' as OrderStatus)}
          disabled={!isExternal}
        >
          Assigned
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleStatusChange('delivered')}
          disabled={!isExternal}
        >
          Delivered
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleStatusChange('cancelled')}
          disabled={!isExternal}
        >
          Cancelled
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleStatusChange('refunded' as OrderStatus)}
          disabled={!isExternal}
        >
          Refunded
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Extracted component for ACTIONS cell to properly use hooks
function ActionsCell({ order }: { order: Order }) {
  const { hasRole } = useAuth();
  const isAdmin = hasRole && hasRole('admin');
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showManageRefund, setShowManageRefund] = useState(false);
  const [showRefundByAdmin, setShowRefundByAdmin] = useState(false);
  const [showCancelAlert, setShowCancelAlert] = useState(false);
  const [showLabelDialog, setShowLabelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const refundItem = order.items?.find(it => !!it.refund_status) || null;

  const { cancelOrder } = useOrders();

  const handleCancelOrder = async () => {
    setIsCancelling(true);
    try {
      await cancelOrder.mutateAsync(order.id);
      setShowCancelAlert(false);
    } catch (_err: any) {
      // Error toast is handled by the hook
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() =>
              navigator.clipboard.writeText(order.order_number || order.id)
            }
          >
            Copy order ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowCustomerDetails(true)}>
            View customer
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowOrderDetails(true)}>
            View order details
          </DropdownMenuItem>
          {/* CRITICAL FIX: Show "Manage refund" ONLY when there's an active refund request */}
          {isAdmin &&
            (order.refund_status === 'requested' ||
              (Array.isArray(order.items) &&
                order.items.some(
                  (it: any) => it.refund_status === 'requested'
                ))) && (
              <DropdownMenuItem onClick={() => setShowManageRefund(true)}>
                Manage refund
              </DropdownMenuItem>
            )}
          {/* CRITICAL FIX: Show "Refund by admin" ONLY for delivered, non-external orders within 24h that are NOT already refunded */}
          {isAdmin &&
            order.status === 'delivered' &&
            !order.is_external &&
            order.refund_status !== 'approved' &&
            order.refund_status !== 'refunded' &&
            (() => {
              // Check if within 24h refund window
              const deliveredAt = order.delivered_at;
              if (!deliveredAt) return false;
              const deliveryTime = new Date(deliveredAt).getTime();
              const now = Date.now();
              return now - deliveryTime <= 24 * 60 * 60 * 1000;
            })() && (
              <DropdownMenuItem onClick={() => setShowRefundByAdmin(true)}>
                Refund By Admin
              </DropdownMenuItem>
            )}
          {order.status === 'pending' && (
            <DropdownMenuItem onClick={() => setShowAssignDialog(true)}>
              Assign to rider
            </DropdownMenuItem>
          )}
          {(order.status === 'assigned' || order.status === 'processing') && (
            <DropdownMenuItem onClick={() => setShowAssignDialog(true)}>
              Change rider
            </DropdownMenuItem>
          )}
          {isAdmin &&
            (order.status === 'pending' || order.status === 'processing') && (
              <DropdownMenuItem
                onClick={() => setShowCancelAlert(true)}
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                Cancel Order
              </DropdownMenuItem>
            )}
          {isAdmin && (
            <DropdownMenuItem onClick={() => setShowLabelDialog(true)}>
              {order.is_labeled ? 'Edit Label' : 'Label Order'}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <CustomerDetailsDialog
        open={showCustomerDetails}
        onOpenChange={setShowCustomerDetails}
        customer={{
          firstName: order.customer_first_name,
          lastName: order.customer_last_name,
          email: order.customer_email,
          phone: order.customer_phone,
        }}
      />

      <OrderDetailsDialog
        open={showOrderDetails}
        onOpenChange={setShowOrderDetails}
        order={order}
      />

      {isAdmin && (
        <ManageRefundDialog
          open={showManageRefund}
          onOpenChange={setShowManageRefund}
          order={order}
          item={refundItem}
        />
      )}

      {isAdmin && (
        <RefundByAdminDialog
          open={showRefundByAdmin}
          onOpenChange={setShowRefundByAdmin}
          order={order}
        />
      )}

      <AssignRiderDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        orderId={order.id}
      />

      {isAdmin && (
        <LabelOrderDialog
          open={showLabelDialog}
          onOpenChange={setShowLabelDialog}
          order={order}
        />
      )}

      <AlertDialog open={showCancelAlert} onOpenChange={setShowCancelAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel order #
              {order.order_number || order.id}? This action cannot be undone and
              will set the order status to "cancelled".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>
              No, keep order
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOrder}
              disabled={isCancelling}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isCancelling ? 'Cancelling...' : 'Yes, cancel order'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export const createColumns = (
  assignmentsMap?: Record<string, { assignment: any; rider: any }>
): ColumnDef<Order>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={value => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'order_number',
    header: 'ORDER',
    cell: ({ row }) => {
      const order = row.original;
      const label =
        order.is_labeled && order.label_number && order.location_code
          ? `L-${order.label_number} | ${order.location_code}${
              order.order_count ? ` | #${order.order_count}` : ''
            }`
          : null;
      return (
        <div className="flex flex-col gap-1">
          <span className="text-text-primary">
            #{row.getValue('order_number') || row.original.id}
          </span>
          {label && (
            <span className="text-xs font-semibold text-orange-600">
              {label}
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'created_at',
    header: 'DATE',
    cell: ({ row }) => {
      const dateValue = row.getValue('created_at');
      const date =
        typeof dateValue === 'string'
          ? new Date(dateValue)
          : (dateValue as Date);
      return (
        <span className="text-text-secondary">
          {isValid(date) ? format(date, 'MMMM d, yyyy, HH:mm') : 'Invalid Date'}
        </span>
      );
    },
  },
  // DELIVERY column removed as requested
  {
    id: 'customer',
    header: 'CUSTOMER',
    cell: ({ row }) => {
      // Show guest badge for anonymous orders. For registered users show
      // their name (and email/phone if available) so admins can identify
      // customers quickly from the list.
      const isGuest = !row.original.user_id;
      const firstName = row.original.customer_first_name || '';
      const lastName = row.original.customer_last_name || '';
      const fullName = `${firstName} ${lastName}`.trim();
      const email = row.original.customer_email || null;
      const phone = row.original.customer_phone || null;

      if (isGuest) {
        const guestFullName = fullName || null;
        const guestLabel = guestFullName || phone || email || 'Guest';
        const subLabel = guestFullName ? phone || email || '' : '';
        return (
          <div className="flex items-center gap-3">
            <Badge className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-semibold">
              Guest
            </Badge>
            <div className="flex flex-col">
              <span className="text-text-primary text-sm font-medium">
                {guestLabel}
              </span>
              {subLabel && (
                <span className="text-text-secondary text-xs">{subLabel}</span>
              )}
            </div>
          </div>
        );
      }

      return (
        <div className="flex items-center gap-3">
          <UserAvatarProfile
            user={{
              fullName: fullName || email || phone || 'User',
              subTitle: email || phone || '',
            }}
            showInfo={false}
          />
          <div className="flex flex-col">
            <span className="text-text-primary text-sm font-medium">
              {fullName || email || phone || 'User'}
            </span>
            {(email || phone) && (
              <span className="text-text-secondary text-xs">
                {email ? email : phone}
              </span>
            )}
          </div>
        </div>
      );
    },
  },
  {
    id: 'rider',
    header: 'RIDER',
    cell: ({ row }) => (
      <RiderCell order={row.original} assignmentsMap={assignmentsMap} />
    ),
  },
  {
    accessorKey: 'status',
    header: 'STATUS',
    cell: ({ row }) => <StatusCell order={row.original} />,
  },
  {
    accessorKey: 'total',
    header: 'AMOUNT',
    cell: ({ row }) => (
      <div className="font-medium">
        {row.getValue<number>('total').toLocaleString()} RWF
      </div>
    ),
  },
  {
    id: 'actions',
    size: 10,
    cell: ({ row }) => <ActionsCell order={row.original} />,
  },
];

// Export default columns for backward compatibility (without assignments)
export const columns = createColumns();

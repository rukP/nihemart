'use client';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Eye, Copy } from 'lucide-react';
import type { Discount, DiscountStatus } from '@/lib/api/discounts';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface DiscountsTableProps {
  discounts: Discount[];
  loading: boolean;
  onEdit: (discount: Discount) => void;
  onView: (discount: Discount) => void;
  onDelete: (id: string) => void;
}

const getStatusColor = (status: DiscountStatus) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'inactive':
      return 'bg-gray-100 text-gray-800';
    case 'expired':
      return 'bg-red-100 text-red-800';
    case 'scheduled':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function DiscountsTable({
  discounts,
  loading,
  onEdit,
  onView,
  onDelete,
}: DiscountsTableProps) {
  const handleCopyCode = (code: string | null | undefined) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    toast.success('Discount code copied to clipboard');
  };

  const formatDiscountValue = (discount: Discount) => {
    if (discount.type === 'percentage') {
      return `${discount.value}%`;
    }
    return `RWF ${discount.value.toLocaleString()}`;
  };

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Usage</TableHead>
            <TableHead>Products</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead className="w-[150px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center">
                Loading...
              </TableCell>
            </TableRow>
          ) : discounts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center">
                No discounts found.
              </TableCell>
            </TableRow>
          ) : (
            discounts.map(discount => (
              <TableRow key={discount.id}>
                <TableCell className="font-medium">{discount.name}</TableCell>
                <TableCell>
                  {discount.code ? (
                    <div className="flex items-center gap-2">
                      <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                        {discount.code}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleCopyCode(discount.code)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-gray-400">No code</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {discount.type === 'percentage'
                      ? 'Percentage'
                      : 'Fixed Amount'}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">
                  {formatDiscountValue(discount)}
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(discount.status)}>
                    {discount.status.charAt(0).toUpperCase() +
                      discount.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {discount.usageLimit ? (
                    <span className="text-sm">
                      {discount.usedCount} / {discount.usageLimit}
                    </span>
                  ) : (
                    <span className="text-sm">{discount.usedCount} used</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {discount.productCount || 0} products
                  </span>
                </TableCell>
                <TableCell>
                  <div className="text-xs text-gray-600">
                    {discount.startDate && (
                      <div>
                        Start:{' '}
                        {format(new Date(discount.startDate), 'MMM dd, yyyy')}
                      </div>
                    )}
                    {discount.endDate && (
                      <div>
                        End:{' '}
                        {format(new Date(discount.endDate), 'MMM dd, yyyy')}
                      </div>
                    )}
                    {!discount.startDate && !discount.endDate && (
                      <span className="text-gray-400">No dates</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onView(discount)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(discount)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(discount.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

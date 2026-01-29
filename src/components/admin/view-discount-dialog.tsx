"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { Discount } from "@/lib/api/discounts";
import { format } from "date-fns";
import Image from "next/image";

interface ViewDiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discount: Discount | null;
}

export default function ViewDiscountDialog({
  open,
  onOpenChange,
  discount,
}: ViewDiscountDialogProps) {
  if (!discount) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "expired":
        return "bg-red-100 text-red-800";
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDiscountValue = () => {
    if (discount.type === "percentage") {
      return `${discount.value}%`;
    }
    return `RWF ${discount.value.toLocaleString()}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{discount.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {discount.description && (
            <div>
              <h4 className="text-sm font-medium mb-1">Description</h4>
              <p className="text-sm text-gray-600">{discount.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-1">Code</h4>
              {discount.code ? (
                <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                  {discount.code}
                </code>
              ) : (
                <span className="text-gray-400 text-sm">No code</span>
              )}
            </div>
            <div>
              <h4 className="text-sm font-medium mb-1">Status</h4>
              <Badge className={getStatusColor(discount.status)}>
                {discount.status.charAt(0).toUpperCase() + discount.status.slice(1)}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-1">Type</h4>
              <Badge variant="outline">
                {discount.type === "percentage" ? "Percentage" : "Fixed Amount"}
              </Badge>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-1">Value</h4>
              <p className="text-sm font-medium">{formatDiscountValue()}</p>
            </div>
          </div>

          {(discount.minPurchaseAmount || discount.maxDiscountAmount) && (
            <div className="grid grid-cols-2 gap-4">
              {discount.minPurchaseAmount && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Min Purchase</h4>
                  <p className="text-sm">RWF {discount.minPurchaseAmount.toLocaleString()}</p>
                </div>
              )}
              {discount.maxDiscountAmount && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Max Discount</h4>
                  <p className="text-sm">RWF {discount.maxDiscountAmount.toLocaleString()}</p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-1">Usage</h4>
              <p className="text-sm">
                {discount.usedCount} {discount.usageLimit ? `/ ${discount.usageLimit}` : ""} used
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-1">Applies To</h4>
              <p className="text-sm capitalize">{discount.appliesTo || "all"}</p>
            </div>
          </div>

          {(discount.startDate || discount.endDate) && (
            <div>
              <h4 className="text-sm font-medium mb-1">Dates</h4>
              <div className="text-sm space-y-1">
                {discount.startDate && (
                  <p>Start: {format(new Date(discount.startDate), "PPpp")}</p>
                )}
                {discount.endDate && (
                  <p>End: {format(new Date(discount.endDate), "PPpp")}</p>
                )}
              </div>
            </div>
          )}

          {discount.products && discount.products.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Products ({discount.products.length})</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {discount.products.map((product) => (
                  <div key={product.id} className="flex items-center gap-3 p-2 border rounded">
                    {product.mainImageUrl && (
                      <div className="w-12 h-12 relative rounded overflow-hidden">
                        <Image
                          src={product.mainImageUrl}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-gray-500">RWF {product.price.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 pt-4 border-t">
            <p>Created: {format(new Date(discount.createdAt), "PPpp")}</p>
            <p>Updated: {format(new Date(discount.updatedAt), "PPpp")}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


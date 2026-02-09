'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { fetchProductForEdit } from '@/lib/api/products';

interface ProductVariantsDialogProps {
  productId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName?: string;
}

export function ProductVariantsDialog({
  productId,
  open,
  onOpenChange,
  productName,
}: ProductVariantsDialogProps) {
  const [variations, setVariations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [productInfo, setProductInfo] = useState<{
    name: string;
    hasVariations: boolean;
  } | null>(null);

  useEffect(() => {
    if (open && productId) {
      loadVariations();
    } else {
      setVariations([]);
      setProductInfo(null);
    }
  }, [open, productId]);

  const loadVariations = async () => {
    if (!productId) return;

    setLoading(true);
    try {
      const productData = await fetchProductForEdit(productId);

      if (productData && productData.product) {
        setProductInfo({
          name: productData.product.name || 'Product',
          hasVariations: (productData.variations || []).length > 0,
        });

        // Format variations with proper attribute display
        const formattedVariations = (productData.variations || []).map(
          (v: any) => {
            // Build variation name from attributes if name is not available
            const variationName =
              v.name ||
              (v.attributes && Object.keys(v.attributes).length > 0
                ? Object.entries(v.attributes)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(' / ')
                : 'Default Variation');

            return {
              id: v.id,
              name: variationName,
              price: v.price || null,
              stock: v.stock || 0,
              sku: v.sku || null,
              attributes: v.attributes || {},
              images: v.images || [],
            };
          }
        );

        setVariations(formattedVariations);
      } else {
        setProductInfo({
          name: productName || 'Product',
          hasVariations: false,
        });
        setVariations([]);
      }
    } catch (_error) {
      // console.error('Failed to load product variations:', _error);
      toast.error('Failed to load product variations');
      setProductInfo({ name: productName || 'Product', hasVariations: false });
      setVariations([]);
    } finally {
      setLoading(false);
    }
  };

  const renderAttributes = (attributes: Record<string, string>) => {
    if (!attributes || Object.keys(attributes).length === 0) {
      return (
        <span className="text-muted-foreground text-xs">No attributes</span>
      );
    }

    return (
      <div className="flex flex-wrap gap-1">
        {Object.entries(attributes).map(([key, value]) => (
          <Badge key={key} variant="outline" className="text-xs">
            {key}: {value}
          </Badge>
        ))}
      </div>
    );
  };

  const getStockBadge = (stock: number) => {
    if (stock > 10) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          In Stock ({stock})
        </Badge>
      );
    } else if (stock > 0) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
          Low Stock ({stock})
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">
          Out of Stock
        </Badge>
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Product Variants</DialogTitle>
          <DialogDescription>
            {productInfo?.name || 'Product'} - {variations.length} variant
            {variations.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">
                Loading variations...
              </span>
            </div>
          ) : !productInfo?.hasVariations || variations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground font-medium">
                No variants found
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                This product doesn't have any variations configured.
              </p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Variant Name</TableHead>
                    <TableHead>Attributes</TableHead>
                    <TableHead className="w-[120px]">Price</TableHead>
                    <TableHead className="w-[120px]">Stock</TableHead>
                    <TableHead className="w-[120px]">SKU</TableHead>
                    <TableHead className="w-[100px]">Images</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variations.map(variation => (
                    <TableRow key={variation.id}>
                      <TableCell className="font-medium">
                        {variation.name || 'Unnamed Variant'}
                      </TableCell>
                      <TableCell>
                        {renderAttributes(variation.attributes)}
                      </TableCell>
                      <TableCell>
                        {variation.price !== null &&
                        variation.price !== undefined
                          ? `${Number(variation.price).toLocaleString()} RWF`
                          : 'N/A'}
                      </TableCell>
                      <TableCell>{getStockBadge(variation.stock)}</TableCell>
                      <TableCell>
                        {variation.sku ? (
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {variation.sku}
                          </code>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            N/A
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {variation.images && variation.images.length > 0 ? (
                          <Badge variant="secondary" className="text-xs">
                            {variation.images.length} image
                            {variation.images.length !== 1 ? 's' : ''}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            No images
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { toast } from 'sonner';
import { ProductSelect } from '@/components/orders/ProductSelect';
import {
  Product,
  fetchProductForEdit,
  fetchProductsPage,
} from '@/lib/api/products';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useExternalOrders } from '@/hooks/useExternalOrders';
import { Badge } from '@/components/ui/badge';
import { optimizeImageUrl } from '@/lib/utils';
import {
  Plus,
  Trash2,
  Loader2,
  Phone,
  MessageSquare,
  ShoppingCart,
} from 'lucide-react';
import Image from 'next/image';

interface ExternalOrderItemInput {
  product_name: string;
  quantity: number;
  price: number;
  product_id?: string | null;
  variation_name?: string | null;
  product_variation_id?: string | null;
  product_sku?: string | null;
  product_image_url?: string | null;
}

interface ExternalOrderFormData {
  customer_name: string;
  customer_email?: string;
  customer_phone: string;
  delivery_address: string;
  delivery_city: string;
  delivery_notes?: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  source: 'whatsapp' | 'phone' | 'other';
  total: number;
  transport?: number;
  items: ExternalOrderItemInput[];
  is_external: boolean;
  is_paid: boolean;
}

export default function AddExternalOrderPage() {
  const router = useRouter();
  const { createExternalOrder } = useExternalOrders();
  // const _productsHook = useProducts();
  // Fetch products for selectors - using high limit to get all products
  const {
    data: productsResponse,
    isLoading: productsLoading,
    error: productsError,
  } = useQuery({
    queryKey: ['products', 'light', 'external-order'],
    queryFn: async () => {
      try {
        const result = await fetchProductsPage({
          pagination: { page: 1, limit: 1000 }, // High limit to get all products
          sort: { column: 'created_at', direction: 'desc' },
        });
        return result?.data || [];
      } catch (_error) {
        toast.error('Failed to fetch products');
        throw _error;
      }
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const productsList = productsResponse || [];
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [selectedProductDetails, setSelectedProductDetails] = useState<
    Record<number, any>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<ExternalOrderFormData>({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    delivery_address: '',
    delivery_city: '',
    delivery_notes: '',
    status: 'pending',
    total: 0,
    transport: 0,
    source: 'whatsapp',
    is_external: true,
    is_paid: true,
    items: [
      {
        product_name: '',
        quantity: 1,
        price: 0,
        product_id: undefined,
        variation_name: undefined,
        product_variation_id: undefined,
        product_sku: undefined,
        product_image_url: undefined,
      },
    ],
  });

  const handleItemChange = (
    index: number,
    field: keyof ExternalOrderItemInput,
    value: string | number
  ) => {
    // FIXED: Use functional state update to avoid stale state issues
    // Previously this read formData.items outside setFormData which caused race conditions
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return {
        ...prev,
        items: newItems,
        total: newItems.reduce(
          (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
          0
        ),
      };
    });
  };

  const addOrderItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_name: '',
          quantity: 1,
          price: 0,
          product_id: undefined,
          variation_name: undefined,
          product_variation_id: undefined,
          product_sku: undefined,
          product_image_url: undefined,
        },
      ],
    }));
  };

  const removeOrderItem = (index: number) => {
    // FIXED: Use functional state update to avoid stale state issues
    setFormData(prev => {
      if (prev.items.length <= 1) {
        return prev; // Don't remove if only one item left
      }
      const newItems = prev.items.filter((_, i) => i !== index);
      return {
        ...prev,
        items: newItems,
        total: newItems.reduce(
          (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
          0
        ),
      };
    });
    // Also remove from selectedProducts and selectedProductDetails
    setSelectedProducts(prev => prev.filter((_, i) => i !== index));
    setSelectedProductDetails(prev => {
      const newDetails = { ...prev };
      delete newDetails[index];
      // Reindex the remaining entries
      const reindexed: Record<number, any> = {};
      Object.keys(newDetails).forEach(key => {
        const numKey = parseInt(key);
        if (numKey > index) {
          reindexed[numKey - 1] = newDetails[numKey];
        } else {
          reindexed[numKey] = newDetails[numKey];
        }
      });
      return reindexed;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // console.log('External Order - Submit handler called');

    if (isSubmitting) {
      // console.log('Already submitting, returning');
      return;
    }
    setIsSubmitting(true);
    // console.log('Starting submission...');

    // FIXED: Normalize items - preserve variation data and ensure all fields are set
    // This ensures variant information is correctly included in the order submission
    const normalizedItems = formData.items.map((item, idx) => {
      const sel = selectedProducts[idx];
      const details = selectedProductDetails[idx];

      if (sel) {
        // Use variation price if variation is selected, otherwise use product price
        const finalPrice =
          item.product_variation_id && item.price > 0
            ? item.price // Use the price that was set when variation was selected
            : (sel.price ?? item.price);

        // CRITICAL: Build variation name from selected variation if variant ID exists but name is missing
        // This ensures we always have a variation name when a variant is selected
        let finalVariationName: string | null = null;

        // First, preserve existing variation name if it's valid (non-null, non-undefined, non-empty)
        // Handle both null, undefined, and empty string cases
        if (
          item.variation_name !== undefined &&
          item.variation_name !== null &&
          String(item.variation_name).trim() !== ''
        ) {
          finalVariationName = String(item.variation_name).trim();
          // console.log(
          //   `[External Order] Preserving existing variation_name for item ${idx}: "${finalVariationName}"`
          // );
        }

        // If we have a variation ID but no variation name yet, try to build it from the product details
        // This is a fallback in case the variation_name wasn't properly set during selection
        if (item.product_variation_id && !finalVariationName) {
          // First try to get it from selectedProductDetails (cached product data)
          if (details?.variations && Array.isArray(details.variations)) {
            const selectedVariation = details.variations.find(
              (v: any) => v && v.id === item.product_variation_id
            );
            if (selectedVariation) {
              // Build variation name from variation data - prefer name, fallback to attributes
              if (
                selectedVariation.name &&
                String(selectedVariation.name).trim() !== ''
              ) {
                finalVariationName = String(selectedVariation.name).trim();
              } else if (
                selectedVariation.attributes &&
                typeof selectedVariation.attributes === 'object' &&
                Object.keys(selectedVariation.attributes).length > 0
              ) {
                finalVariationName = Object.entries(
                  selectedVariation.attributes
                )
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(' / ');
              }
              if (finalVariationName) {
                // console.log(
                //   `[External Order] Built variation name from product details for item ${idx}: "${finalVariationName}"`
                // );
              }
            }
          }

          // If still no variation name but we have a variation ID, use the ID as a fallback
          // This ensures we never lose variant information - always show something if variant is selected
          if (
            !finalVariationName &&
            item.product_variation_id &&
            String(item.product_variation_id).trim() !== ''
          ) {
            finalVariationName = `Variant ID: ${String(
              item.product_variation_id
            )
              .trim()
              .slice(0, 8)}...`;
            // console.log(
            //   `[External Order] Using variation ID as fallback name for item ${idx}: "${finalVariationName}"`
            // );
          }
        }

        // CRITICAL: Preserve variant data explicitly - ensure variant fields are never lost
        // Check for both undefined and null, handle empty strings properly
        const productVariationId =
          item.product_variation_id !== undefined &&
          item.product_variation_id !== null &&
          String(item.product_variation_id).trim() !== ''
            ? String(item.product_variation_id).trim()
            : null;

        const variantData = {
          variation_name: finalVariationName,
          product_variation_id: productVariationId,
        };

        // console.log(
        //   `[External Order] Normalized item "${
        //     sel.name || item.product_name
        //   }" variant data:`,
        //   {
        //     ...variantData,
        //     original_item: {
        //       variation_name: item.variation_name,
        //       product_variation_id: item.product_variation_id,
        //     },
        //     selected_product: sel?.name,
        //     has_variations: details?.variations?.length > 0,
        //   }
        // );

        return {
          ...item,
          product_name: sel.name || item.product_name,
          product_id: sel.id || item.product_id,
          price: finalPrice,
          // CRITICAL: Explicitly set variant fields to ensure they're preserved
          ...variantData,
          // Add product_sku and product_image_url
          product_sku: sel.sku || item.product_sku || null,
          product_image_url:
            sel.main_image_url || item.product_image_url || null,
        };
      }
      return item;
    });

    setFormData(prev => ({ ...prev, items: normalizedItems }));

    if (
      !formData.customer_name.trim() ||
      !formData.customer_phone.trim() ||
      !formData.delivery_address.trim()
    ) {
      toast.error('Please fill in all required fields');
      setIsSubmitting(false);
      return;
    }

    if (
      formData.items.some(
        item => !item.product_name || item.quantity < 1 || item.price <= 0
      )
    ) {
      toast.error('Please fill in all order items correctly');
      setIsSubmitting(false);
      return;
    }

    try {
      if (
        !formData.customer_name ||
        !formData.customer_phone ||
        !formData.delivery_address ||
        !formData.delivery_city
      ) {
        toast.error('Please fill in all required fields');
        setIsSubmitting(false);
        return;
      }

      if (
        formData.items.some(
          item => !item.product_name || item.quantity < 1 || item.price <= 0
        )
      ) {
        toast.error('Please fill in all order items correctly');
        setIsSubmitting(false);
        return;
      }

      // Calculate total from normalized items (ensures variation prices are used)
      const calculatedTotal = normalizedItems.reduce(
        (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
        0
      );
      const transportFee = Number(formData.transport || 0);

      // console.log('Calculated total:', calculatedTotal);
      // console.log(
      //   'Items with variations:',
      //   normalizedItems.map(item => ({
      //     product_name: item.product_name,
      //     variation_name: item.variation_name,
      //     price: item.price,
      //     quantity: item.quantity,
      //     total: item.price * item.quantity,
      //   }))
      // );

      // CRITICAL: Ensure variant data is explicitly preserved and not lost during mapping
      const orderData = {
        ...formData,
        // send items subtotal as `total` and transport as separate field
        total: calculatedTotal,
        transport: transportFee,
        items: normalizedItems.map(item => {
          // Explicitly preserve all variant fields to ensure they're not lost
          // CRITICAL: Always include variation_name and product_variation_id explicitly
          const itemData = {
            product_id: item.product_id || null,
            product_name: item.product_name,
            product_sku: item.product_sku || null,
            product_image_url: item.product_image_url || null,
            price: item.price || 0,
            quantity: item.quantity || 1,
            total: (item.price || 0) * (item.quantity || 1),
            // CRITICAL: Preserve variant data explicitly - check for both undefined and null, handle empty strings
            variation_name:
              item.variation_name !== undefined &&
              item.variation_name !== null &&
              String(item.variation_name).trim() !== ''
                ? String(item.variation_name).trim()
                : null,
            product_variation_id:
              item.product_variation_id !== undefined &&
              item.product_variation_id !== null &&
              String(item.product_variation_id).trim() !== ''
                ? String(item.product_variation_id).trim()
                : null,
          };
          // console.log(
          //   `[External Order] Item "${item.product_name}" variant data:`,
          //   {
          //     variation_name: itemData.variation_name,
          //     product_variation_id: itemData.product_variation_id,
          //     original_item: {
          //       variation_name: item.variation_name,
          //       product_variation_id: item.product_variation_id,
          //     },
          //   }
          // );
          return itemData;
        }),
        is_external: true,
        is_paid: true,
      };

      // console.log(
      //   '[External Order] Creating order with variant data:',
      //   JSON.stringify(
      //     orderData.items.map((it: any) => ({
      //       product_name: it.product_name,
      //       variation_name: it.variation_name,
      //       product_variation_id: it.product_variation_id,
      //     })),
      //     null,
      //     2
      //   )
      // );

      try {
        const _result = await createExternalOrder.mutateAsync(orderData);
        // console.log('External order created successfully:', result);

        toast.success('External order added successfully');
        router.push('/admin/orders/external');
        return;
      } catch (error) {
        // console.error('Failed to create external order:', error);
        toast.error((error as Error).message || 'Failed to add external order');
        setIsSubmitting(false);
        return;
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to add external order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Add External Order
              </h1>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/orders/external')}
                className="h-10 px-6"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="external-order-form"
                disabled={isSubmitting}
                className="h-10 px-6 bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Order...
                  </>
                ) : (
                  'Create External Order'
                )}
              </Button>
            </div>
          </div>
        </div>

        <form id="external-order-form" onSubmit={handleSubmit}>
          {/* Top Section: Customer & Delivery Info + Order Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Left Column - Customer Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customerName">Customer Name *</Label>
                      <Input
                        id="customerName"
                        value={formData.customer_name}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            customer_name: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        value={formData.customer_phone}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            customer_phone: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.customer_email}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            customer_email: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="source">Order Source *</Label>
                      <select
                        id="source"
                        title="Order Source"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.source}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            source: e.target.value as
                              | 'whatsapp'
                              | 'phone'
                              | 'other',
                          })
                        }
                        required
                      >
                        <option value="whatsapp">WhatsApp</option>
                        <option value="phone">Phone Call</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Delivery Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="address">Delivery Address *</Label>
                    <Input
                      id="address"
                      value={formData.delivery_address}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          delivery_address: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={formData.delivery_city}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            delivery_city: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="status">Order Status</Label>
                      <select
                        id="status"
                        title="Order Status"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.status}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            status: e.target.value as
                              | 'pending'
                              | 'processing'
                              | 'delivered'
                              | 'cancelled',
                          })
                        }
                        required
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">Delivery Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.delivery_notes}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          delivery_notes: e.target.value,
                        })
                      }
                      placeholder="Any special instructions for delivery"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Summary and Settings */}
            <div className="space-y-6">
              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Items Subtotal</span>
                        <span className="font-medium">
                          {formData.total.toLocaleString()} RWF
                        </span>
                      </div>

                      <div>
                        <Label htmlFor="transport" className="text-sm">
                          Transport Fee (RWF)
                        </Label>
                        <Input
                          id="transport"
                          type="number"
                          min={0}
                          step={1}
                          value={(formData.transport || 0).toString()}
                          onChange={e =>
                            setFormData(prev => ({
                              ...prev,
                              transport: e.target.value
                                ? parseFloat(e.target.value)
                                : 0,
                            }))
                          }
                          className="mt-1"
                        />
                      </div>

                      <div className="pt-3 border-t">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">Grand Total</span>
                          <span className="text-xl font-bold">
                            {(
                              Number(formData.total || 0) +
                              Number(formData.transport || 0)
                            ).toLocaleString()}{' '}
                            RWF
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* External Order Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">External Order</div>
                      </div>
                      <Badge variant="secondary">Yes</Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Payment Status</div>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        Paid
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Source</div>
                        <div className="text-sm text-muted-foreground capitalize">
                          {formData.source}
                        </div>
                      </div>
                      <div className="text-muted-foreground">
                        {formData.source === 'whatsapp' && (
                          <MessageSquare className="h-4 w-4" />
                        )}
                        {formData.source === 'phone' && (
                          <Phone className="h-4 w-4" />
                        )}
                        {formData.source === 'other' && (
                          <ShoppingCart className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Bottom Section: Order Items - Full Width */}
          <div className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Order Items</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addOrderItem}
                    size="sm"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {formData.items.map((item, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-white">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 rounded">
                            <span className="font-medium">#{index + 1}</span>
                          </div>
                          <h3 className="font-medium">Item {index + 1}</h3>
                        </div>
                        {formData.items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeOrderItem(index)}
                            className="h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Product Selection - Full width for better product selection */}
                        <div className="lg:col-span-8 space-y-3">
                          <div>
                            <Label>Product *</Label>
                            {productsError && (
                              <div className="text-sm text-red-500 mb-2">
                                Failed to load products
                              </div>
                            )}
                            <ProductSelect
                              products={(productsList || []) as Product[]}
                              isLoading={productsLoading}
                              selectedProduct={selectedProducts[index]}
                              onSelect={async product => {
                                setSelectedProducts(prev => {
                                  const next = [...prev];
                                  next[index] = product;
                                  return next;
                                });

                                let details: any = null;
                                try {
                                  details = await fetchProductForEdit(
                                    product.id
                                  );
                                } catch (_err) {
                                  // console.error(
                                  //   'Failed to fetch product details',
                                  //   _err
                                  // );
                                  toast.error(
                                    `Failed to load variations for ${product.name}. Please try again.`
                                  );
                                }

                                let basePrice = product.price ?? 0;
                                if (
                                  (!basePrice || basePrice === 0) &&
                                  details?.variations &&
                                  details.variations.length > 0
                                ) {
                                  const firstVar = details.variations[0];
                                  basePrice = firstVar?.price ?? basePrice;
                                }

                                setFormData(prev => {
                                  const newItems = [...prev.items];
                                  const existing = newItems[index] || {};
                                  newItems[index] = {
                                    ...existing,
                                    product_name:
                                      product.name || existing.product_name,
                                    price: basePrice,
                                    product_id:
                                      product.id || existing.product_id,
                                    product_sku:
                                      product.sku || existing.product_sku || '',
                                    product_image_url:
                                      product.main_image_url ||
                                      existing.product_image_url ||
                                      '',
                                    variation_name: null,
                                    product_variation_id: null,
                                  };

                                  return {
                                    ...prev,
                                    items: newItems,
                                    total: newItems.reduce(
                                      (sum, item) =>
                                        sum +
                                        (item.price || 0) *
                                          (item.quantity || 1),
                                      0
                                    ),
                                  };
                                });

                                if (details) {
                                  setSelectedProductDetails(prev => ({
                                    ...prev,
                                    [index]: details,
                                  }));
                                }
                              }}
                            />

                            {selectedProducts[index] && (
                              <div className="flex items-center gap-4 mt-3">
                                {/* Show product thumbnail when available */}
                                {selectedProducts[index].main_image_url ? (
                                  <div className="relative h-16 w-16 rounded border">
                                    <Image
                                      src={optimizeImageUrl(
                                        selectedProducts[index]
                                          .main_image_url || '/placeholder.svg',
                                        {
                                          width: 64,
                                          quality: 75,
                                        }
                                      )}
                                      alt={selectedProducts[index].name}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="h-16 w-16 rounded bg-gray-100 border" />
                                )}

                                {selectedProductDetails[index]?.variations
                                  ?.length > 0 && (
                                  <div className="flex-1">
                                    <select
                                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                      title="Product Variant"
                                      value={(() => {
                                        const currentVariationId =
                                          formData.items[index]
                                            ?.product_variation_id;
                                        if (!currentVariationId) return '-1';
                                        const variationIndex =
                                          selectedProductDetails[
                                            index
                                          ]?.variations?.findIndex(
                                            (v: any) =>
                                              v.id === currentVariationId
                                          );
                                        return variationIndex !== undefined &&
                                          variationIndex >= 0
                                          ? variationIndex.toString()
                                          : '-1';
                                      })()}
                                      onChange={e => {
                                        const vIdx = parseInt(e.target.value);
                                        if (vIdx === -1) {
                                          setFormData(prev => {
                                            const newItems = [...prev.items];
                                            const basePrice =
                                              selectedProducts[index]?.price ??
                                              0;
                                            newItems[index] = {
                                              ...newItems[index],
                                              variation_name: null,
                                              product_variation_id: null,
                                              price: basePrice,
                                            };

                                            return {
                                              ...prev,
                                              items: newItems,
                                              total: newItems.reduce(
                                                (sum, item) =>
                                                  sum +
                                                  (item.price || 0) *
                                                    (item.quantity || 1),
                                                0
                                              ),
                                            };
                                          });
                                          return;
                                        }
                                        const variation =
                                          selectedProductDetails[index]
                                            .variations[vIdx];
                                        if (variation) {
                                          let variationName: string | null =
                                            null;

                                          if (
                                            variation.name &&
                                            String(variation.name).trim() !== ''
                                          ) {
                                            variationName = String(
                                              variation.name
                                            ).trim();
                                          } else if (
                                            variation.attributes &&
                                            typeof variation.attributes ===
                                              'object' &&
                                            Object.keys(variation.attributes)
                                              .length > 0
                                          ) {
                                            variationName = Object.entries(
                                              variation.attributes
                                            )
                                              .map(
                                                ([key, value]) =>
                                                  `${key}: ${value}`
                                              )
                                              .join(' / ');
                                          }

                                          if (!variationName && variation.id) {
                                            variationName = `Variant ${variation.id.slice(
                                              0,
                                              8
                                            )}`;
                                          }

                                          const variationPrice =
                                            variation.price ??
                                            selectedProducts[index].price ??
                                            0;

                                          setFormData(prev => {
                                            const newItems = [...prev.items];
                                            let finalVariationName =
                                              variationName;
                                            if (
                                              !finalVariationName &&
                                              variation.id
                                            ) {
                                              finalVariationName = `Variant ${variation.id.slice(
                                                0,
                                                8
                                              )}`;
                                            }

                                            newItems[index] = {
                                              ...newItems[index],
                                              variation_name:
                                                finalVariationName || null,
                                              product_variation_id:
                                                variation.id || null,
                                              price: variationPrice,
                                              product_sku:
                                                variation.sku ||
                                                newItems[index].product_sku ||
                                                null,
                                            };

                                            return {
                                              ...prev,
                                              items: newItems,
                                              total: newItems.reduce(
                                                (sum, item) =>
                                                  sum +
                                                  (item.price || 0) *
                                                    (item.quantity || 1),
                                                0
                                              ),
                                            };
                                          });
                                        }
                                      }}
                                    >
                                      <option value="-1">No variant</option>
                                      {selectedProductDetails[
                                        index
                                      ].variations.map((v: any, vi: number) => (
                                        <option key={v.id || vi} value={vi}>
                                          {Object.values(v.attributes).join(
                                            ' / '
                                          )}{' '}
                                          —{' '}
                                          {(
                                            (v.price ??
                                              selectedProducts[index].price) ||
                                            0
                                          ).toLocaleString()}{' '}
                                          RWF
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Price and Quantity - Take remaining space */}
                        <div className="lg:col-span-4 grid grid-cols-2 gap-6">
                          <div>
                            <Label>Price (RWF) *</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.price.toString()}
                              readOnly
                              disabled
                              className="bg-gray-50"
                              required
                            />
                          </div>
                          <div>
                            <Label>Quantity *</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity.toString()}
                              onChange={e =>
                                handleItemChange(
                                  index,
                                  'quantity',
                                  e.target.value ? parseInt(e.target.value) : 1
                                )
                              }
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
}

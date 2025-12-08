"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { ProductSelect } from "@/components/orders/ProductSelect";
import { useProducts } from "@/hooks/useProducts";
import {
  Product,
  fetchProductForEdit,
  fetchProductsLight,
} from "@/integrations/supabase/products";
import { useQuery } from "@tanstack/react-query";
import { useOrders } from "@/hooks/useOrders";
import { useRouter } from "next/navigation";
import { useExternalOrders } from "@/hooks/useExternalOrders";
import { format } from "date-fns";
import { DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { optimizeImageUrl } from "@/lib/utils";
import { UserAvatarProfile } from "@/components/user-avatar-profile";
import {
  Plus,
  Trash2,
  Loader2,
  Phone,
  MessageSquare,
  ShoppingCart,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import Image from "next/image";

interface ExternalOrderItemInput {
  product_name: string;
  quantity: number;
  price: number;
  variation_name?: string;
}

interface ExternalOrderFormData {
  customer_name: string;
  customer_email?: string;
  customer_phone: string;
  delivery_address: string;
  delivery_city: string;
  delivery_notes?: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  source: "whatsapp" | "phone" | "other";
  total: number;
  transport?: number;
  items: ExternalOrderItemInput[];
  is_external: boolean;
  is_paid: boolean;
}

export default function AddExternalOrderPage() {
  const router = useRouter();
  const { createExternalOrder } = useExternalOrders();
  const productsHook = useProducts();
  // lightweight product list for selectors to avoid heavy joins and timeouts
  const { data: productsList, isLoading: productsLoading } = useQuery({
    queryKey: ["products", "light"],
    queryFn: () => fetchProductsLight(500),
  });
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [selectedProductDetails, setSelectedProductDetails] = useState<
    Record<number, any>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<ExternalOrderFormData>({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    delivery_address: "",
    delivery_city: "",
    delivery_notes: "",
    status: "pending",
    total: 0,
    transport: 0,
    source: "whatsapp",
    is_external: true,
    is_paid: true,
    items: [
      {
        product_name: "",
        quantity: 1,
        price: 0,
      },
    ],
  });

  const handleItemChange = (
    index: number,
    field: keyof ExternalOrderItemInput,
    value: string | number
  ) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData((prev) => ({
      ...prev,
      items: newItems,
      total: newItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      ),
    }));
  };

  const addOrderItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { product_name: "", quantity: 1, price: 0 }],
    }));
  };

  const removeOrderItem = (index: number) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData((prev) => ({
        ...prev,
        items: newItems,
        total: newItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        ),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("External Order - Submit handler called");

    if (isSubmitting) {
      console.log("Already submitting, returning");
      return;
    }
    setIsSubmitting(true);
    console.log("Starting submission...");

    const normalizedItems = formData.items.map((item, idx) => {
      const sel = selectedProducts[idx];
      if (sel) {
        return {
          ...item,
          product_name: sel.name || item.product_name,
          price: sel.price ?? item.price,
        };
      }
      return item;
    });

    setFormData((prev) => ({ ...prev, items: normalizedItems }));

    if (
      !formData.customer_name.trim() ||
      !formData.customer_phone.trim() ||
      !formData.delivery_address.trim()
    ) {
      toast.error("Please fill in all required fields");
      setIsSubmitting(false);
      return;
    }

    if (
      formData.items.some(
        (item) => !item.product_name || item.quantity < 1 || item.price <= 0
      )
    ) {
      toast.error("Please fill in all order items correctly");
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
        toast.error("Please fill in all required fields");
        setIsSubmitting(false);
        return;
      }

      if (
        formData.items.some(
          (item) => !item.product_name || item.quantity < 1 || item.price <= 0
        )
      ) {
        toast.error("Please fill in all order items correctly");
        setIsSubmitting(false);
        return;
      }

      const calculatedTotal = formData.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      const transportFee = Number(formData.transport || 0);

      console.log("Calculated total:", calculatedTotal);

      const orderData = {
        ...formData,
        // send items subtotal as `total` and transport as separate field
        total: calculatedTotal,
        transport: transportFee,
        items: formData.items.map((item) => ({
          ...item,
          total: item.price * item.quantity,
        })),
        is_external: true,
        is_paid: true,
      };

      console.log("Creating external order with data:", orderData);

      try {
        const result = await createExternalOrder.mutateAsync(orderData);
        console.log("External order created successfully:", result);

        toast.success("External order added successfully");
        router.push("/admin/orders/external");
        return;
      } catch (error) {
        console.error("Failed to create external order:", error);
        toast.error((error as Error).message || "Failed to add external order");
        setIsSubmitting(false);
        return;
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to add external order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollArea className="h-[calc(100vh-5rem)]">
      <div className="p-6">
        <form onSubmit={handleSubmit}>
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-semibold">Add External Order</h1>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin/orders/external")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding Order...
                  </>
                ) : (
                  "Add External Order"
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customerName">Customer Name *</Label>
                      <Input
                        id="customerName"
                        value={formData.customer_name}
                        onChange={(e) =>
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
                        onChange={(e) =>
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
                        onChange={(e) =>
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
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.source}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            source: e.target.value as
                              | "whatsapp"
                              | "phone"
                              | "other",
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
                  <CardTitle>Delivery Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="address">Delivery Address *</Label>
                    <Input
                      id="address"
                      value={formData.delivery_address}
                      onChange={(e) =>
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
                        onChange={(e) =>
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
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            status: e.target.value as
                              | "pending"
                              | "processing"
                              | "delivered"
                              | "cancelled",
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
                      onChange={(e) =>
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

              {/* Order Items */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Order Items</CardTitle>
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
                <CardContent className="space-y-4">
                  {formData.items.map((item, index) => (
                    <div
                      key={index}
                      className="p-4 border rounded-lg space-y-4 relative"
                    >
                      {formData.items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => removeOrderItem(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                          <Label>Product *</Label>
                          <div>
                            <ProductSelect
                              products={productsList || []}
                              isLoading={productsLoading}
                              selectedProduct={selectedProducts[index]}
                              onSelect={async (product) => {
                                setSelectedProducts((prev) => {
                                  const next = [...prev];
                                  next[index] = product;
                                  return next;
                                });
                                handleItemChange(
                                  index,
                                  "product_name",
                                  product.name
                                );
                                handleItemChange(index, "price", product.price);
                                // fetch product details to get variants and images
                                try {
                                  const details = await fetchProductForEdit(
                                    product.id
                                  );
                                  setSelectedProductDetails((prev) => ({
                                    ...prev,
                                    [index]: details,
                                  }));
                                } catch (err) {
                                  console.error(
                                    "Failed to fetch product details",
                                    err
                                  );
                                }
                              }}
                            />

                            {/* Thumbnail + variant selector (if available) */}
                            {selectedProducts[index] && (
                              <div className="mt-2 flex items-center gap-3">
                                {selectedProducts[index].main_image_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <Image
                                    src={optimizeImageUrl(
                                      selectedProducts[index].main_image_url ||
                                        "/placeholder.svg",
                                      { width: 80, quality: 75 }
                                    )}
                                    alt={selectedProducts[index].name}
                                    width={40}
                                    height={40}
                                    className="h-10 w-10 rounded object-cover"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded bg-slate-100" />
                                )}

                                {selectedProductDetails[index]?.variations
                                  ?.length > 0 && (
                                  <select
                                    className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
                                    title="Product Variant"
                                    onChange={(e) => {
                                      const vIdx = parseInt(e.target.value);
                                      const variation =
                                        selectedProductDetails[index]
                                          .variations[vIdx];
                                      if (variation) {
                                        handleItemChange(
                                          index,
                                          "variation_name",
                                          Object.values(
                                            variation.attributes
                                          ).join(" / ")
                                        );
                                        handleItemChange(
                                          index,
                                          "price",
                                          variation.price ??
                                            selectedProducts[index].price ??
                                            0
                                        );
                                      }
                                    }}
                                  >
                                    <option value="-1">
                                      Select variant (optional)
                                    </option>
                                    {selectedProductDetails[
                                      index
                                    ].variations.map((v: any, vi: number) => (
                                      <option key={v.id || vi} value={vi}>
                                        {Object.values(v.attributes).join(
                                          " / "
                                        )}{" "}
                                        —{" "}
                                        {(
                                          (v.price ??
                                            selectedProducts[index].price) ||
                                          0
                                        ).toLocaleString()}{" "}
                                        RWF
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <Label>Price (RWF) *</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.price.toString()}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "price",
                                e.target.value ? parseFloat(e.target.value) : 0
                              )
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label>Quantity *</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity.toString()}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "quantity",
                                e.target.value ? parseInt(e.target.value) : 1
                              )
                            }
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between font-medium text-sm">
                      <span>Items subtotal</span>
                      <span>{formData.total.toLocaleString()} RWF</span>
                    </div>
                    <div className="flex justify-between font-medium text-sm">
                      <span>Transport fee</span>
                      <span>
                        {(formData.transport || 0).toLocaleString()} RWF
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg border-t pt-2">
                      <span>Grand Total</span>
                      <span>
                        {(
                          Number(formData.total || 0) +
                          Number(formData.transport || 0)
                        ).toLocaleString()}{" "}
                        RWF
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* External Order Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>External Order Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <Label className="text-base">External Order</Label>
                      <div className="text-sm text-muted-foreground">
                        Processed outside the website
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-blue-100 text-blue-800"
                    >
                      Yes
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <Label className="text-base">Payment Status</Label>
                      <div className="text-sm text-muted-foreground">
                        External orders are marked as paid
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800"
                    >
                      Paid
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <Label className="text-base">Source Channel</Label>
                      <div className="text-sm text-muted-foreground">
                        {formData.source === "whatsapp" &&
                          "WhatsApp communication"}
                        {formData.source === "phone" && "Phone call order"}
                        {formData.source === "other" &&
                          "Other communication channel"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {formData.source === "whatsapp" && (
                        <MessageSquare className="h-4 w-4 text-green-600" />
                      )}
                      {formData.source === "phone" && (
                        <Phone className="h-4 w-4 text-blue-600" />
                      )}
                      {formData.source === "other" && (
                        <ShoppingCart className="h-4 w-4 text-gray-600" />
                      )}
                      <span className="text-sm capitalize">
                        {formData.source}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <Label htmlFor="transport" className="text-base">
                      Transport Fee (RWF)
                    </Label>
                    <div className="mt-2">
                      <Input
                        id="transport"
                        type="number"
                        min={0}
                        step={1}
                        value={(formData.transport || 0).toString()}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            transport: e.target.value
                              ? parseFloat(e.target.value)
                              : 0,
                          }))
                        }
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        Optional transport fee for this external order. This
                        will be added on top of rider earnings.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Order Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    External orders are automatically marked as paid and
                    processed outside the regular website flow. They represent
                    orders received through other channels like WhatsApp, phone
                    calls, or in-person sales.
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </ScrollArea>
  );
}

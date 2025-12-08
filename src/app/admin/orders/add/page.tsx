"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { useOrders } from "@/hooks/useOrders";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { ProductSelect } from "@/components/orders/ProductSelect";
import { useProducts } from "@/hooks/useProducts";
import { Product } from "@/integrations/supabase/products";
import { Order, OrderItemInput } from "@/types/orders";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useExternalOrders } from "@/hooks/useExternalOrders";

export default function AddOrderPage() {
   const router = useRouter();
   const { createOrder } = useOrders();
   const { user } = useAuth();
   const [isSubmitting, setIsSubmitting] = useState(false);

   const productsHook = useProducts();
   const { data: products, isLoading: productsLoading } =
      productsHook.useProducts();
   const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);

   const [formData, setFormData] = useState({
      customer_email: "",
      customer_first_name: "",
      customer_last_name: "",
      customer_phone: "",
      delivery_address: "",
      delivery_city: "",
      delivery_notes: "",
      source: "website",
      status: "pending" as Order["status"],
      is_external: false,
      is_paid: false,
   });

   const [orderItems, setOrderItems] = useState<OrderItemInput[]>([
      {
         product_name: "",
         product_id: "",
         quantity: 1,
         price: 0,
         total: 0,
      },
   ]);

   const subtotal = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
   );
   const total = subtotal;

   const handleItemChange = (
      index: number,
      field: keyof OrderItemInput,
      value: string | number
   ) => {
      const newItems = [...orderItems];
      newItems[index] = { ...newItems[index], [field]: value };

      if (field === "price" || field === "quantity") {
         const item = newItems[index];
         item.total = item.price * item.quantity;
      }

      setOrderItems(newItems);
   };

   const addOrderItem = () => {
      setOrderItems([
         ...orderItems,
         {
            product_name: "",
            product_id: "temp",
            quantity: 1,
            price: 0,
            total: 0,
         },
      ]);
   };

   const removeOrderItem = (index: number) => {
      if (orderItems.length > 1) {
         const newItems = orderItems.filter((_, i) => i !== index);
         setOrderItems(newItems);
      }
   };

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      console.log("Regular Order - Submit handler called");

      if (isSubmitting) {
         console.log("Already submitting, returning");
         return;
      }

      setIsSubmitting(true);

      try {
         console.log("Starting validation...");

         const normalizedItems = orderItems.map((item, idx) => {
            const sel = selectedProducts[idx];
            if (sel) {
               return {
                  ...item,
                  product_id: sel.id || item.product_id,
                  product_name: sel.name || item.product_name,
                  price: sel.price ?? item.price,
                  total: (sel.price ?? item.price) * item.quantity,
               };
            }
            return item;
         });

         setOrderItems(normalizedItems);

         if (
            !formData.customer_email ||
            !formData.customer_first_name ||
            !formData.customer_last_name
         ) {
            toast.error("Please fill in all required customer information");
            setIsSubmitting(false);
            return;
         }

         if (!formData.delivery_address || !formData.delivery_city) {
            toast.error("Please fill in all required delivery information");
            setIsSubmitting(false);
            return;
         }

         const invalidItems = normalizedItems
            .map((item, idx) => ({ item, idx }))
            .filter(
               ({ item }) =>
                  !item.product_name || item.quantity < 1 || item.price <= 0
            );

         if (invalidItems.length > 0) {
            console.log("Invalid order items found:", invalidItems);
            const firstIdx = invalidItems[0].idx + 1;
            toast.error(
               `Please properly select product and specify quantity/price for item #${firstIdx}`
            );
            setIsSubmitting(false);
            return;
         }

         if (!user?.id) {
            toast.error("You must be logged in to create an order");
            setIsSubmitting(false);
            return;
         }

         const orderData = {
            order: {
               ...formData,
               user_id: user.id,
               subtotal,
               total,
               currency: "RWF",
               is_external: false,
               is_paid: false,
               source: "website",
            },
            items: normalizedItems.map((item) => ({
               ...item,
               total: item.price * item.quantity,
            })),
         };

         console.log("Submitting order with data:", orderData);

         const result = await createOrder.mutateAsync(orderData);
         console.log("Order created successfully:", result);

         toast.success("Order created successfully");
         router.push("/admin/orders");
      } catch (error: any) {
         console.error("Error creating order:", error);
         toast.error(error.message || "Failed to create order");
      } finally {
         setIsSubmitting(false);
      }
   };

   return (
      <ScrollArea className="h-[calc(100vh-5rem)]">
         <div className="p-6">
            <form onSubmit={handleSubmit}>
               <div className="flex justify-between items-center mb-8">
                  <h1 className="text-2xl font-semibold">Add New Order</h1>
                  <div className="flex gap-3">
                     <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push("/admin/orders")}
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
                              Creating Order...
                           </>
                        ) : (
                           "Create Order"
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
                                 <Label htmlFor="firstName">First Name *</Label>
                                 <Input
                                    id="firstName"
                                    value={formData.customer_first_name}
                                    onChange={(e) =>
                                       setFormData({
                                          ...formData,
                                          customer_first_name: e.target.value,
                                       })
                                    }
                                    required
                                 />
                              </div>
                              <div>
                                 <Label htmlFor="lastName">Last Name *</Label>
                                 <Input
                                    id="lastName"
                                    value={formData.customer_last_name}
                                    onChange={(e) =>
                                       setFormData({
                                          ...formData,
                                          customer_last_name: e.target.value,
                                       })
                                    }
                                    required
                                 />
                              </div>
                              <div>
                                 <Label htmlFor="email">Email *</Label>
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
                                    required
                                 />
                              </div>
                              <div>
                                 <Label htmlFor="phone">Phone</Label>
                                 <Input
                                    id="phone"
                                    value={formData.customer_phone}
                                    onChange={(e) =>
                                       setFormData({
                                          ...formData,
                                          customer_phone: e.target.value,
                                       })
                                    }
                                 />
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
                                 <Select
                                    value={formData.status}
                                    onValueChange={(value) =>
                                       setFormData({
                                          ...formData,
                                          status: value as Order["status"],
                                       })
                                    }
                                 >
                                    <SelectTrigger>
                                       <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                       <SelectItem value="pending">Pending</SelectItem>
                                       <SelectItem value="processing">Processing</SelectItem>
                                       <SelectItem value="shipped">Shipped</SelectItem>
                                       <SelectItem value="delivered">Delivered</SelectItem>
                                       <SelectItem value="cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                 </Select>
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
                           {orderItems.map((item, index) => (
                              <div
                                 key={index}
                                 className="p-4 border rounded-lg space-y-4 relative"
                              >
                                 {orderItems.length > 1 && (
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
                                       <ProductSelect
                                          products={products?.data || []}
                                          selectedProduct={selectedProducts[index]}
                                          onSelect={(product) => {
                                             setSelectedProducts((prev) => {
                                                const next = [...prev];
                                                next[index] = product;
                                                return next;
                                             });
                                             handleItemChange(index, "product_id", product.id);
                                             handleItemChange(index, "product_name", product.name);
                                             handleItemChange(index, "price", product.price);
                                          }}
                                       />
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
                              <div className="flex justify-between text-sm">
                                 <span>Subtotal</span>
                                 <span>{subtotal.toLocaleString()} RWF</span>
                              </div>
                              <div className="flex justify-between font-semibold text-lg border-t pt-2">
                                 <span>Total</span>
                                 <span>{total.toLocaleString()} RWF</span>
                              </div>
                           </div>
                        </CardContent>
                     </Card>

                     {/* Order Settings */}
                     <Card>
                        <CardHeader>
                           <CardTitle>Order Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           <div className="flex items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                 <Label className="text-base">External Order</Label>
                                 <div className="text-sm text-muted-foreground">
                                    Mark as external order
                                 </div>
                              </div>
                              <span className="text-sm text-muted-foreground">No</span>
                           </div>
                           <div className="flex items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                 <Label className="text-base">Payment Status</Label>
                                 <div className="text-sm text-muted-foreground">
                                    Order payment status
                                 </div>
                              </div>
                              <span className="text-sm text-muted-foreground">Unpaid</span>
                           </div>
                           <div className="flex items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                 <Label className="text-base">Source</Label>
                                 <div className="text-sm text-muted-foreground">
                                    Order source channel
                                 </div>
                              </div>
                              <span className="text-sm text-muted-foreground">Website</span>
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
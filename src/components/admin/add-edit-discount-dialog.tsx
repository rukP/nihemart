"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  createDiscount,
  updateDiscount,
  type Discount,
  DiscountType,
  DiscountStatus,
} from "@/lib/api/discounts";
import { fetchProductsPage, type Product } from "@/lib/api/products";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useDebounce } from "@/hooks/use-debounce";

const discountSchema = z.object({
  name: z.string().min(2, "Discount name must be at least 2 characters long."),
  description: z.string().optional(),
  code: z.string().optional(),
  type: z.enum(["percentage", "fixed_amount"]),
  value: z.number().min(0, "Value must be positive"),
  minPurchaseAmount: z.number().min(0).optional().nullable(),
  maxDiscountAmount: z.number().min(0).optional().nullable(),
  status: z.enum(["active", "inactive", "expired", "scheduled"]).optional(),
  usageLimit: z.number().min(1).optional().nullable(),
  appliesTo: z.string().optional(),
  productIds: z.array(z.string()).optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
}).refine((data) => {
  if (data.type === "percentage" && (data.value < 0 || data.value > 100)) {
    return false;
  }
  return true;
}, {
  message: "Percentage discount must be between 0 and 100",
  path: ["value"],
});

type DiscountFormData = z.infer<typeof discountSchema>;

interface AddEditDiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  discount?: Discount | null;
}

export default function AddEditDiscountDialog({
  open,
  onOpenChange,
  onSuccess,
  discount,
}: AddEditDiscountDialogProps) {
  const isEditMode = !!discount;
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const debouncedProductSearch = useDebounce(productSearch, 300);

  const form = useForm<DiscountFormData>({
    resolver: zodResolver(discountSchema),
    defaultValues: {
      name: "",
      description: "",
      code: "",
      type: DiscountType.percentage,
      value: 0,
      minPurchaseAmount: null,
      maxDiscountAmount: null,
      status: DiscountStatus.active,
      usageLimit: null,
      appliesTo: "all",
      productIds: [],
      startDate: null,
      endDate: null,
    },
  });

  const watchType = form.watch("type");
  const watchAppliesTo = form.watch("appliesTo");

  // Automatically show product selector when "specific_products" is selected
  const shouldShowProductSelector = watchAppliesTo === "specific_products";

  // Fetch products for selection
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["products-for-discount", debouncedProductSearch],
    queryFn: () =>
      fetchProductsPage({
        filters: { 
          search: debouncedProductSearch || undefined,
          status: "all", // Get all products regardless of status
        },
        pagination: { page: 1, limit: 100 },
        sort: { column: "name", direction: "asc" },
      }),
    enabled: shouldShowProductSelector,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });

  const products = productsData?.data || [];

  useEffect(() => {
    if (open) {
      if (isEditMode && discount) {
        form.reset({
          name: discount.name,
          description: discount.description || "",
          code: discount.code || "",
          type: discount.type,
          value: discount.value,
          minPurchaseAmount: discount.minPurchaseAmount,
          maxDiscountAmount: discount.maxDiscountAmount,
          status: discount.status,
          usageLimit: discount.usageLimit,
          appliesTo: discount.appliesTo || "all",
          productIds: discount.productIds || [],
          startDate: discount.startDate ? format(new Date(discount.startDate), "yyyy-MM-dd'T'HH:mm") : null,
          endDate: discount.endDate ? format(new Date(discount.endDate), "yyyy-MM-dd'T'HH:mm") : null,
        });
        setSelectedProductIds(discount.productIds || []);
      } else {
        form.reset({
          name: "",
          description: "",
          code: "",
          type: DiscountType.percentage,
          value: 0,
          minPurchaseAmount: null,
          maxDiscountAmount: null,
          status: DiscountStatus.active,
          usageLimit: null,
          appliesTo: "all",
          productIds: [],
          startDate: null,
          endDate: null,
        });
        setSelectedProductIds([]);
      }
    }
  }, [open, discount, isEditMode, form]);

  const onSubmit = async (values: DiscountFormData) => {
    try {
      const discountData: any = {
        ...values,
        productIds: watchAppliesTo === "specific_products" ? selectedProductIds : [],
      };
      
      // Remove undefined/null fields to avoid issues
      Object.keys(discountData).forEach(key => {
        if (discountData[key] === undefined || discountData[key] === null || discountData[key] === "") {
          delete discountData[key];
        }
      });

      if (isEditMode && discount) {
        await updateDiscount(discount.id, discountData);
        toast.success("Discount updated successfully");
      } else {
        await createDiscount(discountData);
        toast.success("Discount created successfully");
      }
      onSuccess();
    } catch (error: any) {
      console.error("Failed to save discount:", error);
      toast.error(error.message || "Failed to save discount");
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Discount" : "Add New Discount"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Summer Sale" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Discount description..."
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount Code (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="SUMMER2024" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormDescription>
                    Leave empty for automatic discount application
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Type *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={DiscountType.percentage}>Percentage</SelectItem>
                        <SelectItem value={DiscountType.fixed_amount}>Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Value * ({watchType === "percentage" ? "Percentage (0-100)" : "Amount (RWF)"})
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={watchType === "percentage" ? "10" : "1000"}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {watchType === "percentage" && (
              <FormField
                control={form.control}
                name="maxDiscountAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Discount Amount (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="5000"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) =>
                          field.onChange(e.target.value ? parseFloat(e.target.value) : null)
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum discount amount in RWF (for percentage discounts)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="minPurchaseAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Purchase Amount (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="10000"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? parseFloat(e.target.value) : null)
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Minimum purchase amount required to apply this discount
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="appliesTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Applies To</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">All Products</SelectItem>
                      <SelectItem value="specific_products">Specific Products</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchAppliesTo === "specific_products" && (
              <div className="space-y-2">
                <FormLabel>Select Products ({selectedProductIds.length} selected)</FormLabel>
                <div className="border rounded-lg p-4 max-h-80 overflow-y-auto">
                  <Input
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="mb-4"
                  />
                  {productsLoading ? (
                    <div className="text-sm text-gray-500 py-4 text-center">Loading products...</div>
                  ) : products.length === 0 ? (
                    <div className="text-sm text-gray-500 py-4 text-center">
                      {debouncedProductSearch ? "No products found" : "Start typing to search products"}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {products.map((product: Product) => (
                        <div key={product.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                          <Checkbox
                            id={`product-${product.id}`}
                            checked={selectedProductIds.includes(product.id)}
                            onCheckedChange={() => toggleProduct(product.id)}
                          />
                          <label 
                            htmlFor={`product-${product.id}`}
                            className="text-sm font-medium cursor-pointer flex-1"
                          >
                            {product.name}
                            {product.price && (
                              <span className="text-gray-500 ml-2">
                                (RWF {product.price.toLocaleString()})
                              </span>
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="usageLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usage Limit (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="100"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? parseInt(e.target.value) : null)
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum number of times this discount can be used
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={DiscountStatus.active}>Active</SelectItem>
                      <SelectItem value={DiscountStatus.inactive}>Inactive</SelectItem>
                      <SelectItem value={DiscountStatus.scheduled}>Scheduled</SelectItem>
                      <SelectItem value={DiscountStatus.expired}>Expired</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {isEditMode ? "Update Discount" : "Create Discount"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


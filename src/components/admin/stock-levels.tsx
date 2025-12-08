"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/components/ui/table";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
   Search,
   Edit,
   Trash2,
   ChevronDown,
   ChevronUp,
   History,
   Plus,
   Minus,
   Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
   fetchProductsForStockManagement,
   fetchStockHistory,
   updateStockLevel,
   updateProductStock,
   fetchProductStockHistory,
   StockProduct,
   StockHistoryItem,
} from "@/integrations/supabase/stock";
import { fetchCategories } from "@/integrations/supabase/products";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";

// Stock update dialog component
function StockUpdateDialog({
    product,
    variation,
    onClose,
}: {
    product: StockProduct;
    variation: any;
    onClose: () => void;
}) {
    const [targetStock, setTargetStock] = useState<number>(0);
    const [reason, setReason] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const queryClient = useQueryClient();

    const currentStock = variation ? variation.stock : product.stock || 0;

    // Set initial target stock to current stock
    useEffect(() => {
        setTargetStock(currentStock);
    }, [currentStock]);

    // Calculate the change based on target stock
    const change = targetStock - currentStock;

    const handleUpdate = async () => {
        if (targetStock < 0 || !reason.trim()) {
            toast.error("Please enter a valid stock amount (0 or more) and reason");
            return;
        }

        if (change === 0) {
            toast.error("New stock amount must be different from current stock");
            return;
        }

        setIsLoading(true);
        try {
            if (variation) {
                await updateStockLevel({
                    productId: product.id,
                    variationId: variation.id,
                    change,
                    reason: reason.trim(),
                });
            } else {
                await updateProductStock({
                    productId: product.id,
                    change,
                    reason: reason.trim(),
                });
            }
            toast.success(
                `Stock ${change > 0 ? "increased" : "decreased"} by ${Math.abs(
                    change
                )} units (New total: ${targetStock})`
            );
            queryClient.invalidateQueries({ queryKey: ["products-stock"] });
            onClose();
        } catch (error) {
            toast.error("Failed to update stock");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

   return (
      <DialogContent className="max-w-md">
         <DialogHeader>
            <DialogTitle>Update Stock</DialogTitle>
            <p className="text-sm text-gray-600">
               {product.name} -{" "}
               {variation ? variation.name || "Default" : "Product Stock"}
            </p>
         </DialogHeader>
         <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg">
               <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Current Stock:</span>
                  <span className="text-lg font-bold text-orange-600">
                     {currentStock}
                  </span>
               </div>
            </div>

            {/* New Stock Amount Input */}
            <div>
               <Label htmlFor="targetStock">New Stock Amount</Label>
               <Input
                  id="targetStock"
                  type="number"
                  min="0"
                  value={targetStock}
                  onChange={(e) => setTargetStock(parseInt(e.target.value) || 0)}
                  placeholder={`e.g., ${currentStock + 10}`}
                  className="mt-1"
               />
               <p className="text-xs text-gray-500 mt-1">
                  Enter the new total stock amount (must be 0 or greater)
               </p>
            </div>

            <div>
               <Label htmlFor="reason">Reason for change</Label>
               <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., New shipment received, Damaged goods, Sold items..."
                  rows={3}
                  className="mt-1"
               />
            </div>

            {/* Preview */}
            {change !== 0 && (
               <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center text-sm">
                     <span>Stock change:</span>
                     <span
                        className={`font-bold ${
                           change > 0 ? "text-green-600" : "text-red-600"
                        }`}
                     >
                        {change > 0 ? "+" : ""}{change} units
                     </span>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-1">
                     <span>New total:</span>
                     <span className="font-bold text-gray-900">
                        {targetStock} units
                     </span>
                  </div>
               </div>
            )}

            <div className="flex gap-2 pt-2">
               <Button
                  onClick={handleUpdate}
                  disabled={isLoading || change === 0 || !reason.trim() || targetStock < 0}
                  className="bg-orange-500 hover:bg-orange-600 flex-1"
               >
                  {isLoading
                     ? "Updating..."
                     : `Update Stock ${change > 0 ? "(Increase)" : "(Decrease)"}`}
               </Button>
               <Button
                  variant="outline"
                  onClick={onClose}
               >
                  Cancel
               </Button>
            </div>
         </div>
      </DialogContent>
   );
}

// Stock history dialog component
function StockHistoryDialog({
   variationId,
   onClose,
}: {
   variationId: string;
   onClose: () => void;
}) {
   const { data: history, isLoading } = useQuery({
      queryKey: ["stock-history", variationId],
      queryFn: () => fetchStockHistory(variationId),
      enabled: !!variationId,
      staleTime: 10 * 60 * 1000, // 10 minutes - history doesn't change often
      gcTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
   });

   return (
      <DialogContent className="max-w-2xl">
         <DialogHeader>
            <DialogTitle>Stock History</DialogTitle>
         </DialogHeader>
         <div className="space-y-4">
            {isLoading ? (
               <div>Loading history...</div>
            ) : history && history.length > 0 ? (
               <div className="space-y-2 max-h-96 overflow-y-auto">
                  {history.map((item: StockHistoryItem) => (
                     <div
                        key={item.id}
                        className="border rounded p-3"
                     >
                        <div className="flex justify-between items-start">
                           <div>
                              <div className="font-medium">
                                 Change: {item.change > 0 ? "+" : ""}
                                 {item.change}
                              </div>
                              <div className="text-sm text-gray-600">
                                 New quantity: {item.new_quantity}
                              </div>
                              <div className="text-sm text-gray-600">
                                 Reason: {item.reason || "No reason provided"}
                              </div>
                           </div>
                           <div className="text-right text-sm text-gray-500">
                              <div>
                                 {new Date(
                                    item.created_at
                                 ).toLocaleDateString()}
                              </div>
                              <div>{item.user?.full_name || "you"}</div>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            ) : (
               <div>No history available</div>
            )}
            <Button
               variant="outline"
               onClick={onClose}
            >
               Close
            </Button>
         </div>
      </DialogContent>
   );
}

// Product stock history dialog component
function ProductStockHistoryDialog({
   productId,
   onClose,
}: {
   productId: string;
   onClose: () => void;
}) {
   const { data: history, isLoading } = useQuery({
      queryKey: ["product-stock-history", productId],
      queryFn: () => fetchProductStockHistory(productId),
      enabled: !!productId,
      staleTime: 10 * 60 * 1000, // 10 minutes - history doesn't change often
      gcTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
   });

   return (
      <DialogContent className="max-w-2xl">
         <DialogHeader>
            <DialogTitle>Product Stock History</DialogTitle>
         </DialogHeader>
         <div className="space-y-4">
            {isLoading ? (
               <div>Loading history...</div>
            ) : history && history.length > 0 ? (
               <div className="space-y-2 max-h-96 overflow-y-auto">
                  {history.map((item: StockHistoryItem) => (
                     <div
                        key={item.id}
                        className="border rounded p-3"
                     >
                        <div className="flex justify-between items-start">
                           <div>
                              <div className="font-medium">
                                 Change: {item.change > 0 ? "+" : ""}
                                 {item.change}
                              </div>
                              <div className="text-sm text-gray-600">
                                 New quantity: {item.new_quantity}
                              </div>
                              <div className="text-sm text-gray-600">
                                 Reason: {item.reason || "No reason provided"}
                              </div>
                           </div>
                           <div className="text-right text-sm text-gray-500">
                              <div>
                                 {new Date(
                                    item.created_at
                                 ).toLocaleDateString()}
                              </div>
                              {/* <div>{item.user?.full_name || 'Unknown user'}</div> */}
                              <div>{item.user?.full_name || "You"}</div>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            ) : (
               <div>No history available</div>
            )}
            <Button
               variant="outline"
               onClick={onClose}
            >
               Close
            </Button>
         </div>
      </DialogContent>
   );
}

function StockTable({
   title,
   products,
   isLoading,
   onUpdateDialog,
   onHistoryDialog,
   onProductHistoryDialog,
}: {
   title: string;
   products: StockProduct[];
   isLoading: boolean;
   onUpdateDialog: (
      dialog: { product: StockProduct; variation: any } | null
   ) => void;
   onHistoryDialog: (variationId: string | null) => void;
   onProductHistoryDialog: (productId: string | null) => void;
}) {
   console.log({ products });
   const [selectedItems, setSelectedItems] = useState(new Set<string>());
   const [sortConfig, setSortConfig] = useState<{
      key: string;
      direction: string;
   } | null>(null);
   const [searchTerm, setSearchTerm] = useState("");
   const [stockFilter, setStockFilter] = useState("All Stock");
   const [timeFilter, setTimeFilter] = useState("All Time");
   const [currentPage, setCurrentPage] = useState(1);
   const [pageSize, setPageSize] = useState(10);

   // Fetch categories for filter
   const { data: categories = [] } = useQuery({
      queryKey: ["categories"],
      queryFn: () => fetchCategories(),
      staleTime: 60 * 60 * 1000, // 1 hour - categories change rarely
      gcTime: 2 * 60 * 60 * 1000, // 2 hours
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
   });

   const columns = [
      { key: "checkbox", label: "", width: "40px" },
      { key: "index", label: "#", width: "60px" },
      { key: "product", label: "Product", width: "300px" },
      { key: "variation", label: "Variation", width: "150px" },
      { key: "stock", label: "Stock", width: "120px" },
      { key: "price", label: "Price", width: "120px" },
      { key: "stockLevel", label: "Stock Level", width: "100px" },
      { key: "status", label: "Status", width: "120px" },
      { key: "actions", label: "Actions", width: "150px" },
   ];

   const minTableWidth =
      columns.reduce((sum, col) => sum + parseInt(col.width), 0) + "px";

   // Flatten products into product-variation items
   const flattenedData = useMemo(() => {
      const items: any[] = [];
      products.forEach((product) => {
         if (product.variations.length > 0) {
            product.variations.forEach((variation) => {
               console.log({ product });
               items.push({
                  id: `${product.id}-${variation.id}`,
                  productId: product.id,
                  variationId: variation.id,
                  productName: product.name,
                  variationName: variation.name,
                  stock: variation.stock,
                  price: variation?.price,
                  attributes: variation.attributes,
                  sku: null,
                  barcode: null,
                  category: product.category,
                  mainImageUrl: product.main_image_url,
               });
            });
         } else {
            // Handle products without variations
            items.push({
               id: `${product.id}-default`,
               productId: product.id,
               variationId: null, // No variation ID for stock management
               productName: product.name,
               variationName: "Default",
               stock: product.stock || 0, // Stock from product
               price: product.price,
               attributes: {},
               sku: null,
               barcode: null,
               category: product.category,
               mainImageUrl: product.main_image_url,
            });
         }
      });
      return items;
   }, [products]);

   const uniqueStocks = ["All Stock", "In Stock", "Low Stock", "Out of Stock"];

   const uniqueTimes = [
      "All Time",
      "This week",
      "Previous week",
      "This month",
      "Last 3 months",
   ];

   const handleSelectAll = (checked: boolean) => {
      if (checked) {
         setSelectedItems(new Set(flattenedData.map((p) => p.id)));
      } else {
         setSelectedItems(new Set());
      }
   };

   const handleSelectItem = (id: string, checked: boolean) => {
      const newSelected = new Set(selectedItems);
      if (checked) {
         newSelected.add(id);
      } else {
         newSelected.delete(id);
      }
      setSelectedItems(newSelected);
   };

   const handleSort = (key: string) => {
      if (key === "checkbox" || key === "index" || key === "actions") return;
      let direction = "asc";
      if (sortConfig && sortConfig.key === key) {
         direction = sortConfig.direction === "asc" ? "desc" : "asc";
      }
      setSortConfig({ key, direction });
   };

   const getSortIcon = (key: string) => {
      if (!sortConfig || sortConfig.key !== key) {
         return <ChevronDown className="h-4 w-4 opacity-50" />;
      }
      return sortConfig.direction === "asc" ? (
         <ChevronUp className="h-4 w-4 text-blue-600" />
      ) : (
         <ChevronDown className="h-4 w-4 text-blue-600" />
      );
   };

   const getSortValue = (item: any, key: string) => {
      const value = item[key];
      if (key === "price") {
         return parseInt(value.replace(/[^\d]/g, ""), 10);
      }
      if (typeof value === "string") {
         return value.toLowerCase();
      }
      if (typeof value === "number") {
         return value;
      }
      return value;
   };

   const filteredData = useMemo(() => {
      let filtered = [...flattenedData];

      // Search filter
      if (searchTerm.trim()) {
         const lowerSearch = searchTerm.toLowerCase();
         filtered = filtered.filter(
            (p) =>
               p.productName.toLowerCase().includes(lowerSearch) ||
               (p.variationName &&
                  p.variationName.toLowerCase().includes(lowerSearch))
         );
      }

      // Stock filter
      if (stockFilter !== "All Stock") {
         if (stockFilter === "In Stock") {
            filtered = filtered.filter((p) => p.stock > 0);
         } else if (stockFilter === "Low Stock") {
            filtered = filtered.filter((p) => p.stock > 0 && p.stock <= 10);
         } else if (stockFilter === "Out of Stock") {
            filtered = filtered.filter((p) => p.stock <= 0);
         }
      }

      // Time filter - placeholder for now (would need update timestamps)
      // if (timeFilter !== 'All Time') {
      //   const now = new Date()
      //   const timeFilters = {
      //     'This week': 7,
      //     'Previous week': 14,
      //     'This month': 30,
      //     'Last 3 months': 90
      //   }
      //   const days = timeFilters[timeFilter as keyof typeof timeFilters]
      //   const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      //   filtered = filtered.filter(p => new Date(p.updatedAt) >= cutoffDate)
      // }

      // Sort
      if (sortConfig) {
         filtered.sort((a, b) => {
            const aVal = getSortValue(a, sortConfig.key);
            const bVal = getSortValue(b, sortConfig.key);

            if (aVal < bVal) {
               return sortConfig.direction === "asc" ? -1 : 1;
            }
            if (aVal > bVal) {
               return sortConfig.direction === "asc" ? 1 : -1;
            }
            return 0;
         });
      }

      return filtered;
   }, [flattenedData, searchTerm, stockFilter, sortConfig]);

   // Pagination logic
   const totalItems = filteredData.length;
   const totalPages = Math.ceil(totalItems / pageSize);
   const startIndex = (currentPage - 1) * pageSize;
   const endIndex = startIndex + pageSize;
   const paginatedData = filteredData.slice(startIndex, endIndex);

   // Reset to first page when filters change
   useEffect(() => {
      setCurrentPage(1);
   }, [searchTerm, stockFilter, sortConfig]);

   // Reset to first page when page size changes
   useEffect(() => {
      setCurrentPage(1);
   }, [pageSize]);

   return (
      <Card className="bg-white">
         <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
               <CardTitle className="text-lg font-semibold">{title}</CardTitle>
               <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                     {totalItems} items
                  </span>
                  <div className="flex items-center gap-2">
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                           <Button
                              variant="outline"
                              size="sm"
                           >
                              {timeFilter}{" "}
                              <ChevronDown className="ml-2 h-4 w-4" />
                           </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                           {uniqueTimes.map((time) => (
                              <DropdownMenuItem
                                 key={time}
                                 onClick={() => setTimeFilter(time)}
                              >
                                 {time}
                              </DropdownMenuItem>
                           ))}
                        </DropdownMenuContent>
                     </DropdownMenu>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                           <Button
                              variant="outline"
                              size="sm"
                           >
                              {stockFilter}{" "}
                              <ChevronDown className="ml-2 h-4 w-4" />
                           </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                           {uniqueStocks.map((stock) => (
                              <DropdownMenuItem
                                 key={stock}
                                 onClick={() => setStockFilter(stock)}
                              >
                                 {stock}
                              </DropdownMenuItem>
                           ))}
                        </DropdownMenuContent>
                     </DropdownMenu>
                  </div>
               </div>
            </div>
            <div className="flex items-center gap-4 mt-4">
               <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                     placeholder="Search..."
                     className="pl-10"
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                  />
               </div>
            </div>
         </CardHeader>
         <CardContent className="p-0">
            <div className="relative overflow-hidden border-t rounded-b-lg">
               <div className="overflow-x-auto">
                  <div style={{ minWidth: minTableWidth }}>
                     <Table>
                        <TableHeader>
                           <TableRow className="border-b">
                              {columns.map((col) => (
                                 <TableHead
                                    key={col.key}
                                    style={{ minWidth: col.width }}
                                    className={cn(
                                       "text-gray-500 font-medium sticky top-0 bg-gray-50/90 px-4 py-3 text-left backdrop-blur-sm transition-colors select-none",
                                       col.key === "actions"
                                          ? "text-right"
                                          : "",
                                       col.key !== "checkbox" &&
                                          col.key !== "actions" &&
                                          col.key !== "index"
                                          ? "cursor-pointer hover:bg-gray-100"
                                          : "",
                                       sortConfig?.key === col.key &&
                                          "bg-gray-100 text-gray-900"
                                    )}
                                    onClick={() => handleSort(col.key)}
                                 >
                                    {col.key === "checkbox" ? (
                                       <Checkbox
                                          checked={
                                             selectedItems.size ===
                                                flattenedData.length &&
                                             flattenedData.length > 0
                                          }
                                          onCheckedChange={handleSelectAll}
                                          className="rounded border-gray-300"
                                       />
                                    ) : (
                                       <div
                                          className={cn(
                                             "flex items-center gap-2",
                                             col.key === "actions"
                                                ? "justify-end"
                                                : ""
                                          )}
                                       >
                                          <span className="whitespace-nowrap uppercase text-xs">
                                             {col.label}
                                          </span>
                                          {col.key !== "checkbox" &&
                                             col.key !== "actions" &&
                                             col.key !== "index" &&
                                             getSortIcon(col.key)}
                                       </div>
                                    )}
                                 </TableHead>
                              ))}
                           </TableRow>
                        </TableHeader>
                        <TableBody>
                           {paginatedData.map((item, index) => (
                              <TableRow
                                 key={item.id}
                                 className="border-b hover:bg-gray-50"
                              >
                                 <TableCell
                                    style={{ minWidth: columns[0].width }}
                                    className="border-b border-gray-100 px-4 py-3"
                                 >
                                    <Checkbox
                                       checked={selectedItems.has(item.id)}
                                       onCheckedChange={(checked) =>
                                          handleSelectItem(
                                             item.id,
                                             checked as boolean
                                          )
                                       }
                                       className="rounded border-gray-300"
                                    />
                                 </TableCell>
                                 <TableCell
                                    style={{ minWidth: columns[1].width }}
                                    className="font-medium border-b border-gray-100 px-4 py-3"
                                 >
                                    {startIndex + index + 1}
                                 </TableCell>
                                 <TableCell
                                    style={{ minWidth: columns[2].width }}
                                    className="border-b border-gray-100 px-4 py-3"
                                 >
                                    <div className="flex items-center gap-3">
                                       <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                                          {(() => {
                                             const product = products.find(
                                                (p) => p.id === item.productId
                                             );
                                             return product?.main_image_url ? (
                                                <Image
                                                   src={product.main_image_url}
                                                   alt={item.productName}
                                                   width={40}
                                                   height={40}
                                                   className="w-full h-full object-cover"
                                                />
                                             ) : (
                                                <Package className="w-6 h-6 text-gray-400" />
                                             );
                                          })()}
                                       </div>
                                       <div>
                                          <div className="font-medium">
                                             {item.productName}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                             {item.variationName || "Default"}
                                          </div>
                                       </div>
                                    </div>
                                 </TableCell>
                                 <TableCell
                                    style={{ minWidth: columns[3].width }}
                                    className="border-b border-gray-100 px-4 py-3"
                                 >
                                    <div className="flex items-center gap-2">
                                       <div className="w-4 h-4 bg-orange-200 rounded-full"></div>
                                       {item.variationName || "Default"}
                                    </div>
                                 </TableCell>
                                 <TableCell
                                    style={{ minWidth: columns[4].width }}
                                    className="border-b border-gray-100 px-4 py-3"
                                 >
                                    <Badge
                                       variant={
                                          item.stock > 0
                                             ? "default"
                                             : "secondary"
                                       }
                                       className={
                                          item.stock > 0
                                             ? "bg-green-100 text-green-800 hover:bg-green-100"
                                             : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                                       }
                                    >
                                       {item.stock > 0
                                          ? "In Stock"
                                          : "Out of Stock"}
                                    </Badge>
                                 </TableCell>
                                 <TableCell
                                    style={{ minWidth: columns[5].width }}
                                    className="font-medium border-b border-gray-100 px-4 py-3"
                                 >
                                    {item.price
                                       ? `RWF ${item?.price?.toLocaleString()}`
                                       : "N/A"}
                                 </TableCell>
                                 <TableCell
                                    style={{ minWidth: columns[6].width }}
                                    className="border-b border-gray-100 px-4 py-3"
                                 >
                                    <span
                                       className={
                                          item.stock <= 10
                                             ? "text-red-600 font-medium"
                                             : ""
                                       }
                                    >
                                       {item.stock}
                                    </span>
                                 </TableCell>
                                 <TableCell
                                    style={{ minWidth: columns[7].width }}
                                    className="border-b border-gray-100 px-4 py-3"
                                 >
                                    <Badge
                                       className={
                                          item.stock <= 0
                                             ? "bg-red-100 text-red-800"
                                             : item.stock <= 10
                                             ? "bg-yellow-100 text-yellow-800"
                                             : "bg-green-100 text-green-800 hover:text-white"
                                       }
                                    >
                                       {item.stock <= 0
                                          ? "Out of Stock"
                                          : item.stock <= 10
                                          ? "Low Stock"
                                          : "In Stock"}
                                    </Badge>
                                 </TableCell>
                                 <TableCell
                                    style={{ minWidth: columns[8].width }}
                                    className="text-right border-b border-gray-100 px-4 py-3"
                                 >
                                    <div className="flex items-center justify-end gap-1">
                                       <Button
                                          variant="ghost"
                                          size="sm"
                                          title="Update Stock"
                                          onClick={() => {
                                             const product = products.find(
                                                (p) => p.id === item.productId
                                             );
                                             const variation = item.variationId
                                                ? product?.variations.find(
                                                     (v) =>
                                                        v.id ===
                                                        item.variationId
                                                  )
                                                : null;
                                             if (product) {
                                                onUpdateDialog({
                                                   product,
                                                   variation,
                                                });
                                             }
                                          }}
                                          className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                       >
                                          <div className="flex items-center gap-1">
                                             <Plus className="h-3 w-3" />
                                             <Minus className="h-3 w-3" />
                                          </div>
                                       </Button>
                                       <Button
                                          variant="ghost"
                                          size="sm"
                                          title="View History"
                                          onClick={() => {
                                             if (item.variationId) {
                                                onHistoryDialog(
                                                   item.variationId
                                                );
                                             } else {
                                                onProductHistoryDialog(
                                                   item.productId
                                                );
                                             }
                                          }}
                                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                       >
                                          <History className="h-4 w-4" />
                                       </Button>
                                    </div>
                                 </TableCell>
                              </TableRow>
                           ))}
                        </TableBody>
                     </Table>
                  </div>
               </div>
            </div>
         </CardContent>
         {/* Pagination Controls */}
         {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
               <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Page size:</span>
                  <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                        <Button
                           variant="outline"
                           size="sm"
                        >
                           {pageSize} <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent>
                        {[10, 15, 20].map((size) => (
                           <DropdownMenuItem
                              key={size}
                              onClick={() => setPageSize(size)}
                           >
                              {size}
                           </DropdownMenuItem>
                        ))}
                     </DropdownMenuContent>
                  </DropdownMenu>
               </div>

               <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                     Page {currentPage} of {totalPages} ({totalItems} total)
                  </span>
               </div>

               <div className="flex items-center gap-1">
                  <Button
                     variant="outline"
                     size="sm"
                     onClick={() => setCurrentPage(1)}
                     disabled={currentPage === 1}
                  >
                     First
                  </Button>
                  <Button
                     variant="outline"
                     size="sm"
                     onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                     }
                     disabled={currentPage === 1}
                  >
                     Previous
                  </Button>

                  {/* Page Numbers with Ellipsis */}
                  {(() => {
                     const pages = [];
                     const maxVisiblePages = 5;
                     let startPage = Math.max(
                        1,
                        currentPage - Math.floor(maxVisiblePages / 2)
                     );
                     const endPage = Math.min(
                        totalPages,
                        startPage + maxVisiblePages - 1
                     );

                     if (endPage - startPage + 1 < maxVisiblePages) {
                        startPage = Math.max(1, endPage - maxVisiblePages + 1);
                     }

                     // Add first page and ellipsis if needed
                     if (startPage > 1) {
                        pages.push(
                           <Button
                              key={1}
                              variant={
                                 currentPage === 1 ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setCurrentPage(1)}
                           >
                              1
                           </Button>
                        );
                        if (startPage > 2) {
                           pages.push(
                              <span
                                 key="start-ellipsis"
                                 className="px-2"
                              >
                                 ...
                              </span>
                           );
                        }
                     }

                     // Add visible pages
                     for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                           <Button
                              key={i}
                              variant={
                                 currentPage === i ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setCurrentPage(i)}
                           >
                              {i}
                           </Button>
                        );
                     }

                     // Add last page and ellipsis if needed
                     if (endPage < totalPages) {
                        if (endPage < totalPages - 1) {
                           pages.push(
                              <span
                                 key="end-ellipsis"
                                 className="px-2"
                              >
                                 ...
                              </span>
                           );
                        }
                        pages.push(
                           <Button
                              key={totalPages}
                              variant={
                                 currentPage === totalPages
                                    ? "default"
                                    : "outline"
                              }
                              size="sm"
                              onClick={() => setCurrentPage(totalPages)}
                           >
                              {totalPages}
                           </Button>
                        );
                     }

                     return pages;
                  })()}

                  <Button
                     variant="outline"
                     size="sm"
                     onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                     }
                     disabled={currentPage === totalPages}
                  >
                     Next
                  </Button>
                  <Button
                     variant="outline"
                     size="sm"
                     onClick={() => setCurrentPage(totalPages)}
                     disabled={currentPage === totalPages}
                  >
                     Last
                  </Button>
               </div>
            </div>
         )}
      </Card>
   );
}

export default function StockLevels() {
   const [updateDialog, setUpdateDialog] = useState<{
      product: StockProduct;
      variation: any;
   } | null>(null);
   const [historyDialog, setHistoryDialog] = useState<string | null>(null);
   const [productHistoryDialog, setProductHistoryDialog] = useState<
      string | null
   >(null);

   const { data: products = [], isLoading } = useQuery({
      queryKey: ["products-stock"],
      queryFn: () => fetchProductsForStockManagement(),
      staleTime: 30 * 60 * 1000, // 30 minutes - stock data doesn't change often
      gcTime: 60 * 60 * 1000, // 1 hour
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
   });

   const inStockProducts = products.filter((p) =>
      p.variations.some((v) => v.stock > 0)
   );

   const outOfStockProducts = products.filter((p) =>
      p.variations.every((v) => v.stock <= 0)
   );

   return (
      <div className="space-y-6">
         <StockTable
            title="All Products"
            products={products}
            isLoading={isLoading}
            onUpdateDialog={setUpdateDialog}
            onHistoryDialog={setHistoryDialog}
            onProductHistoryDialog={setProductHistoryDialog}
         />

         {/* Dialogs */}
         {updateDialog && (
            <Dialog
               open={true}
               onOpenChange={() => setUpdateDialog(null)}
            >
               <StockUpdateDialog
                  product={updateDialog.product}
                  variation={updateDialog.variation}
                  onClose={() => setUpdateDialog(null)}
               />
            </Dialog>
         )}

         {historyDialog && (
            <Dialog
               open={true}
               onOpenChange={() => setHistoryDialog(null)}
            >
               <StockHistoryDialog
                  variationId={historyDialog}
                  onClose={() => setHistoryDialog(null)}
               />
            </Dialog>
         )}

         {productHistoryDialog && (
            <Dialog
               open={true}
               onOpenChange={() => setProductHistoryDialog(null)}
            >
               <ProductStockHistoryDialog
                  productId={productHistoryDialog}
                  onClose={() => setProductHistoryDialog(null)}
               />
            </Dialog>
         )}
      </div>
   );
}

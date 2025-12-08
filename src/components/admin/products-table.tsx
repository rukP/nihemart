"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
   ChevronDown,
   Edit,
   Trash2,
   ChevronLeft,
   ChevronRight,
   ChevronUp,
   Search,
   UserStar,
   MoreHorizontal,
   MoreVertical,
} from "lucide-react";

import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type {
   Product,
   Category,
   ProductListPageFilters,
   ProductStatus,
} from "@/integrations/supabase/products";

interface ProductsTableProps {
   products: Product[];
   categories: Category[];
   loading: boolean;
   filters: ProductListPageFilters;
   sort: { column: string; direction: "asc" | "desc" };
   pagination: { page: number; limit: number; totalCount: number };
   onFilterChange: (newFilters: Partial<ProductListPageFilters>) => void;
   onPageChange: (newPage: number) => void;
   onSortChange: (column: string) => void;
   onDelete: (id: string) => void;
   onStatusToggle: (id: string, currentStatus: string | undefined) => void;
   onEdit: (id: string) => void;
}

export const ProductsTable = ({
   products,
   categories,
   loading,
   filters,
   sort,
   pagination,
   onFilterChange,
   onPageChange,
   onSortChange,
   onDelete,
   onStatusToggle,
   onEdit,
}: ProductsTableProps) => {
   const totalPages = Math.ceil(pagination.totalCount / pagination.limit);

   const getSortIcon = (key: string) => {
      if (sort.column !== key)
         return <ChevronDown className="h-4 w-4 opacity-50" />;
      return sort.direction === "asc" ? (
         <ChevronUp className="h-4 w-4 text-blue-600" />
      ) : (
         <ChevronDown className="h-4 w-4 text-blue-600" />
      );
   };

   const getStatusBadge = (status: ProductStatus | undefined) => {
      const statusStyles = {
         active: "bg-green-100 text-green-700 border border-green-200",
         out_of_stock: "bg-red-100 text-red-700 border border-red-200",
         draft: "bg-orange-100 text-orange-700 border border-orange-200",
      };
      const text =
         status?.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()) ||
         "N/A";
      return (
         <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
               statusStyles[status as keyof typeof statusStyles] ||
               "bg-gray-100 text-gray-700"
            }`}
         >
            {text}
         </span>
      );
   };

   const headerColumns: {
      key: keyof Product | "actions";
      label: string;
      sortable: boolean;
      minWidth?: string;
   }[] = [
      { key: "name", label: "Product", sortable: true, minWidth: "300px" },
      { key: "category", label: "Category", sortable: true, minWidth: "150px" },
      { key: "status", label: "Status", sortable: true, minWidth: "130px" },
      { key: "stock", label: "Stock", sortable: true, minWidth: "120px" },
      { key: "price", label: "Price", sortable: true, minWidth: "120px" },
      { key: "actions", label: "Actions", sortable: false, minWidth: "120px" },
   ];

   const renderPagination = () => {
      if (totalPages <= 1) return null;
      const pages = [];
      if (totalPages <= 7) {
         for (let i = 1; i <= totalPages; i++) {
            pages.push(i);
         }
      } else {
         pages.push(1);
         if (pagination.page > 3) pages.push("...");

         let startPage = Math.max(2, pagination.page - 1);
         let endPage = Math.min(totalPages - 1, pagination.page + 1);

         if (pagination.page <= 3) {
            startPage = 2;
            endPage = 4;
         }
         if (pagination.page >= totalPages - 2) {
            startPage = totalPages - 3;
            endPage = totalPages - 1;
         }

         for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
         }

         if (pagination.page < totalPages - 2) pages.push("...");
         pages.push(totalPages);
      }
      return pages.map((p, i) =>
         typeof p === "number" ? (
            <Button
               key={p}
               onClick={() => onPageChange(p)}
               variant={pagination.page === p ? "default" : "outline"}
               size="sm"
               className={cn(
                  "w-9 h-9",
                  pagination.page === p && "bg-green-500 hover:bg-green-600"
               )}
            >
               {p}
            </Button>
         ) : (
            <span
               key={`ellipsis-${i}`}
               className="flex items-center justify-center w-9 h-9"
            >
               ...
            </span>
         )
      );
   };

   return (
      <div className="w-full min-h-[40vh]">
         <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative w-full">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
               <Input
                  placeholder="Search by name, brand, SKU..."
                  value={filters.search}
                  onChange={(e) => onFilterChange({ search: e.target.value })}
                  className="pl-9"
               />
            </div>
            <Select
               value={filters.category}
               onValueChange={(value) => onFilterChange({ category: value })}
            >
               <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="All Categories" />
               </SelectTrigger>
               <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                     <SelectItem
                        key={cat.id}
                        value={cat.id}
                     >
                        {cat.name}
                     </SelectItem>
                  ))}
               </SelectContent>
            </Select>
            <Select
               value={filters.status}
               onValueChange={(value) =>
                  onFilterChange({ status: value as ProductStatus | "all" })
               }
            >
               <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="All Statuses" />
               </SelectTrigger>
               <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
               </SelectContent>
            </Select>
         </div>

         <div className="relative overflow-hidden border rounded-lg max-h-[60vh] overflow-y-auto">
            <div
               className="overflow-x-auto"
               style={{ minWidth: "800px" }}
            >
               <Table className="w-full">
                  <TableHeader>
                     <TableRow className="border-b">
                        <TableHead className="w-12">
                           <Checkbox disabled />
                        </TableHead>
                        {headerColumns.map((col) => (
                           <TableHead
                              key={col.key}
                              style={{ minWidth: col.minWidth }}
                              className={cn(
                                 "text-gray-500 font-medium sticky top-0 bg-gray-50/90 backdrop-blur-sm",
                                 col.sortable &&
                                    "cursor-pointer hover:bg-gray-100"
                              )}
                              onClick={
                                 col.sortable
                                    ? () => onSortChange(col.key)
                                    : undefined
                              }
                           >
                              <div className="flex items-center gap-2">
                                 <span className="whitespace-nowrap uppercase text-xs">
                                    {col.label}
                                 </span>
                                 {col.sortable && getSortIcon(col.key)}
                              </div>
                           </TableHead>
                        ))}
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {loading ? (
                        <TableRow>
                           <TableCell
                              colSpan={headerColumns.length + 1}
                              className="text-center h-48"
                           >
                              Loading products...
                           </TableCell>
                        </TableRow>
                     ) : products.length > 0 ? (
                        products.map((product) => (
                           <TableRow
                              key={product.id}
                              className="border-b hover:bg-gray-50"
                           >
                              <TableCell>
                                 <Checkbox />
                              </TableCell>
                              <TableCell>
                                 <div className="flex items-center space-x-3">
                                    <div className="relative w-10 h-10 bg-gray-100 rounded flex-shrink-0">
                                       <Image
                                          src={
                                             product.main_image_url ||
                                             "/placeholder.svg"
                                          }
                                          alt={product.name}
                                          fill
                                          className="object-cover"
                                       />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                       <div
                                          className="font-medium text-gray-900 truncate max-w-[250px]"
                                          title={product.name}
                                       >
                                          {product.name}
                                       </div>
                                       <div
                                          className="text-sm text-gray-500 truncate max-w-[250px]"
                                          title={
                                             product.short_description ||
                                             "No description"
                                          }
                                       >
                                          {product.short_description ||
                                             "No description"}
                                       </div>
                                    </div>
                                 </div>
                              </TableCell>
                              <TableCell>
                                 <div className="flex flex-wrap gap-1 max-w-[200px]">
                                    {product.categories && product.categories.length > 0 ? (
                                       <>
                                          <span
                                             key={product.categories[0].id}
                                             className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap"
                                          >
                                             {product.categories[0].name}
                                          </span>
                                          {product.categories.length > 1 && (
                                             <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                   <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      className="flex items-center"
                                                   >
                                                      <span>..more</span>
                                                   </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                   {product.categories
                                                      .slice(1)
                                                      .map((cat) => (
                                                         <DropdownMenuItem key={cat.id}>
                                                            {cat.name}
                                                         </DropdownMenuItem>
                                                      ))}
                                                </DropdownMenuContent>
                                             </DropdownMenu>
                                          )}
                                       </>
                                    ) : (
                                       <span className="text-gray-500">Uncategorized</span>
                                    )}
                                 </div>
                              </TableCell>
                              <TableCell>
                                 {getStatusBadge(product.status)}
                              </TableCell>
                              <TableCell>
                                 <Switch
                                    checked={product.status === "active"}
                                    onCheckedChange={() =>
                                       onStatusToggle(
                                          product.id,
                                          product.status
                                       )
                                    }
                                 />
                              </TableCell>
                              <TableCell>
                                 {new Intl.NumberFormat("en-RW", {
                                    style: "currency",
                                    currency: "RWF",
                                    maximumFractionDigits: 0,
                                 }).format(product.price || 0)}
                              </TableCell>
                              <TableCell>
                                 <div className="flex items-center space-x-2">
                                    <Link
                                       href={`/admin/products/${product.id}/reviews`}
                                       className={cn(
                                          buttonVariants({
                                             variant: "ghost",
                                             size: "sm",
                                          }),
                                          "h-8 w-8 p-0"
                                       )}
                                    >
                                       <UserStar className="w-4 h-4 text-gray-500" />
                                    </Link>
                                    <Button
                                       onClick={() => onEdit(product.id)}
                                       variant="ghost"
                                       size="sm"
                                       className="h-8 w-8 p-0"
                                    >
                                       <Edit className="w-4 h-4 text-gray-500" />
                                    </Button>
                                    <Button
                                       variant="ghost"
                                       size="sm"
                                       className="h-8 w-8 p-0"
                                       onClick={() => onDelete(product.id)}
                                    >
                                       <Trash2 className="w-4 h-4 text-gray-500" />
                                    </Button>
                                 </div>
                              </TableCell>
                           </TableRow>
                        ))
                     ) : (
                        <TableRow>
                           <TableCell
                              colSpan={headerColumns.length + 1}
                              className="text-center h-48"
                           >
                              No products found matching your criteria.
                           </TableCell>
                        </TableRow>
                     )}
                  </TableBody>
               </Table>
            </div>
         </div>

         <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-gray-500">
               Page {pagination.page} of {totalPages}. Total{" "}
               {pagination.totalCount} products.
            </div>
            <div className="flex items-center space-x-2">
               <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
               >
                  Previous
               </Button>
               <div className="flex items-center gap-1">
                  {renderPagination()}
               </div>
               <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(pagination.page + 1)}
                  disabled={pagination.page >= totalPages}
               >
                  Next
               </Button>
            </div>
         </div>
      </div>
   );
};

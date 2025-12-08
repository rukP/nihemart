"use client";
import React, { useEffect, useRef } from "react";
import { Search } from "lucide-react";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface TableFiltersProps {
   searchTerm: string;
   onSearchChange: (term: string) => void;
   categoryFilter: string;
   onCategoryChange: (value: string) => void;
   uniqueCategories: string[];
   statusFilter: string;
   onStatusChange: (value: string) => void;
   uniqueStatuses: string[];
   stockFilter?: string;
   onStockChange?: (value: string) => void;
   stockOptions?: readonly ("all" | "in-stock" | "out-of-stock")[]; // Fixed: added 'readonly'
   columns?: string[];
   visibleColumns?: string[];
   toggleColumn?: (columnKey: string) => void;
   showViewOptions?: boolean;
   setShowViewOptions?: (show: boolean) => void;
}

export const TableFilters = ({
   searchTerm,
   onSearchChange,
   categoryFilter,
   onCategoryChange,
   uniqueCategories,
   statusFilter,
   onStatusChange,
   uniqueStatuses,
   stockFilter,
   onStockChange,
   stockOptions,
   columns,
   visibleColumns,
   toggleColumn,
   showViewOptions,
   setShowViewOptions,
}: TableFiltersProps) => {
   const viewOptionsRef = useRef<HTMLDivElement>(null);

   useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
         if (
            viewOptionsRef.current &&
            !viewOptionsRef.current.contains(event.target as Node)
         ) {
            if (setShowViewOptions) setShowViewOptions(false);
         }
      };

      if (showViewOptions) {
         document.addEventListener("mousedown", handleClickOutside);
      }

      return () =>
         document.removeEventListener("mousedown", handleClickOutside);
   }, [showViewOptions, setShowViewOptions]);

   const getColumnLabel = (column: string) => {
      const labels: Record<string, string> = {
         product: "Product",
         category: "Category",
         stock: "Stock",
         price: "Price",
         qty: "Quantity",
         status: "Status",
      };
      return labels[column] || column.charAt(0).toUpperCase() + column.slice(1);
   };

   return (
      <div className="py-4">
         {/* Search + status pills */}
         <div className="flex flex-col md:flex-row w-full md:justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-1/2">
               {/* status pills on the left in a row */}
               <div className="hidden sm:flex items-center gap-2 bg-[#E8F6FB] rounded-lg p-1">
                  {uniqueStatuses.map((s) => {
                     const val = String(s).toLowerCase();
                     const active = statusFilter === val;
                     return (
                        <button
                           key={s}
                           onClick={() => onStatusChange(val)}
                           className={`px-3 py-1 rounded-md font-medium ${
                              active ? "bg-white shadow" : "text-text-secondary"
                           }`}
                        >
                           {s === "all"
                              ? "All"
                              : s === "inactive"
                              ? "Inactive"
                              : s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                     );
                  })}
               </div>

               <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                     type="text"
                     placeholder="Search..."
                     value={searchTerm}
                     onChange={(e) => onSearchChange(e.target.value)}
                     className="pl-10 pr-4 py-2 w-full border-none shadow-none"
                  />
               </div>
            </div>

            {/* Category (vehicles) select on the right */}
            <div className="flex items-center gap-4">
               <Select
                  value={categoryFilter}
                  onValueChange={onCategoryChange}
               >
                  <SelectTrigger className="w-[160px]">
                     <SelectValue placeholder="Vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                     {uniqueCategories.map((cat) => (
                        <SelectItem
                           key={cat}
                           value={cat}
                        >
                           {cat === "all" ? "All Vehicles" : cat}
                        </SelectItem>
                     ))}
                  </SelectContent>
               </Select>
            </div>
         </div>
      </div>
   );
};

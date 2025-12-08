"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useQueryStates } from "nuqs";
import { parseAsInteger, parseAsString, parseAsArrayOf } from "nuqs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import {
   Sheet,
   SheetContent,
   SheetHeader,
   SheetTitle,
   SheetTrigger,
} from "@/components/ui/sheet";
import {
   Heart,
   ChevronDown,
   ChevronUp,
   Filter,
   Search,
   PackageSearch,
   ShoppingCart,
} from "lucide-react";
import { cn, optimizeImageUrl } from "@/lib/utils";
import {
   fetchStoreProducts,
   fetchAllCategoriesWithSubcategories,
} from "@/integrations/supabase/store";
import type {
   StoreProduct,
   StoreCategory,
   StoreSubcategory,
} from "@/integrations/supabase/store";
import { useDebounce } from "@/hooks/use-debounce";
import { useMediaQuery } from "@/hooks/user-media-query";
import Image from "next/image";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { useBuyNow } from "@/contexts/BuyNowContext";
import { WishlistButton } from "@/components/ui/wishlist-button";
import { useLanguage } from "@/contexts/LanguageContext";

const PAGE_LIMIT = 32;

function ProductListingComponent() {
   const router = useRouter();
   const { addItem } = useCart();
   const { setBuyNowItem } = useBuyNow();
   const { t } = useLanguage();
   const isMobile = useMediaQuery("(max-width: 1023px)");

   const [products, setProducts] = useState<StoreProduct[]>([]);
   const [categories, setCategories] = useState<StoreCategory[]>([]);
   const [subcategories, setSubcategories] = useState<StoreSubcategory[]>([]);
   const [loading, setLoading] = useState(true);
   const [totalCount, setTotalCount] = useState(0);
   const [ordersEnabled, setOrdersEnabled] = useState<boolean | null>(null);

   const [filters, setFilters] = useQueryStates({
      q: parseAsString.withDefault(""),
      page: parseAsInteger.withDefault(1),
      sort: parseAsString.withDefault("created_at.desc"),
      categories: parseAsArrayOf(parseAsString).withDefault([]),
      subcategories: parseAsArrayOf(parseAsString).withDefault([]),
   });

   const debouncedSearchTerm = useDebounce(filters.q, 300);

   const [expandedSections, setExpandedSections] = useState({
      category: true,
   });
   const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
      new Set()
   );
   const [isFilterOpen, setIsFilterOpen] = useState(false);

   // Get selected category subcategories for mobile display
   const selectedCategoryIds = filters.categories;
   const selectedCategorySubcategories =
      selectedCategoryIds.length > 0
         ? subcategories.filter((sc) =>
              selectedCategoryIds.includes(sc.category_id)
           )
         : [];

   const fetchProducts = useCallback(async () => {
      setLoading(true);
      try {
         const [sortColumn, sortDirection] = filters.sort.split(".");
         const { data, count } = await fetchStoreProducts({
            search: debouncedSearchTerm,
            filters: {
               categories:
                  filters.categories.length > 0
                     ? filters.categories
                     : undefined,
               subcategories:
                  filters.subcategories.length > 0
                     ? filters.subcategories
                     : undefined,
            },
            sort: {
               column: sortColumn,
               direction: sortDirection as "asc" | "desc",
            },
            pagination: { page: filters.page, limit: PAGE_LIMIT },
         });
         setProducts(data);
         setTotalCount(count);
      } catch (error) {
         console.error("Failed to fetch products", error);
      } finally {
         setLoading(false);
      }
   }, [
      filters.page,
      filters.sort,
      filters.categories,
      filters.subcategories,
      debouncedSearchTerm,
   ]);

   useEffect(() => {
      fetchProducts();
   }, [fetchProducts]);

   useEffect(() => {
      const loadFilterData = async () => {
         try {
            const { categories, subcategories } =
               await fetchAllCategoriesWithSubcategories();
            setCategories(categories);
            setSubcategories(subcategories);
         } catch (error) {
            console.error("Failed to load category data", error);
         }
      };
      loadFilterData();
   }, []);

   // Check if orders are enabled
   useEffect(() => {
      const checkOrdersEnabled = async () => {
         try {
            const res = await fetch("/api/admin/settings/orders-enabled");
            if (res.ok) {
               const data = await res.json();
               setOrdersEnabled(Boolean(data.enabled));
            }
         } catch (error) {
            console.warn("Failed to check orders enabled status", error);
            // If check fails, allow orders (fail open)
            setOrdersEnabled(true);
         }
      };
      checkOrdersEnabled();
   }, []);

   // This useEffect is no longer needed since we load all subcategories upfront
   // The filtering logic is now handled in the UI rendering

   const handleClearFilters = () => {
      setFilters({
         q: "",
         categories: [],
         subcategories: [],
         page: 1,
      });
   };

   const handleCategoryToggle = (id: string, checked: boolean) => {
      setFilters((prev) => ({
         page: 1,
         categories: checked
            ? [...prev.categories, id]
            : prev.categories.filter((catId) => catId !== id),
      }));
   };

   const handleSubcategoryToggle = (id: string, checked: boolean) => {
      setFilters((prev) => ({
         page: 1,
         subcategories: checked
            ? [...prev.subcategories, id]
            : prev.subcategories.filter((subId) => subId !== id),
      }));
   };

   const handleAddToCart = (e: React.MouseEvent, product: StoreProduct) => {
      e.stopPropagation();
      const stock = (product as any).stock ?? product.stock ?? undefined;
      if (typeof stock === "number" && stock <= 0) {
         toast.error(
            t("products.outOfStock") || "This product is out of stock."
         );
         return;
      }
      addItem({
         product_id: product.id,
         name: product.name,
         price: product.price,
         image: product.main_image_url || "/placeholder.svg",
      });
      toast.success(t("cart.added") || "Added to cart");
   };

   console.log({ products });

   const handleBuyNow = (e: React.MouseEvent, product: StoreProduct) => {
      e.stopPropagation();

      // Check if orders are disabled
      if (ordersEnabled === false) {
         toast.error(
            t("checkout.ordersDisabled") ||
               "Orders are currently disabled. Please try again later."
         );
         return;
      }

      const stock = (product as any).stock ?? product.stock ?? undefined;
      if (typeof stock === "number" && stock <= 0) {
         toast.error(
            t("products.outOfStock") || "This product is out of stock."
         );
         return;
      }
      // Use buy-now flow (do NOT add to main cart). Persist temporary item and go to checkout.
      setBuyNowItem({
         product_id: product.id,
         name: product.name,
         price: product.price,
         image: product.main_image_url || "/placeholder.svg",
         quantity: 1,
      });
      router.push("/checkout");
   };

   const renderStars = (rating: number | null) => {
      const r = Math.round(rating || 0);
      return Array.from({ length: 5 }, (_, i) => (
         <span
            key={i}
            className={cn(
               "text-sm",
               i < r ? "text-yellow-400" : "text-gray-300"
            )}
         >
            ★
         </span>
      ));
   };

   const toggleSection = (section: keyof typeof expandedSections) =>
      setExpandedSections((p) => ({ ...p, [section]: !p[section] }));

   const toggleCategory = (categoryId: string) => {
      setExpandedCategories((prev) => {
         const newSet = new Set(prev);
         if (newSet.has(categoryId)) {
            newSet.delete(categoryId);
         } else {
            newSet.add(categoryId);
         }
         return newSet;
      });
   };

   const FilterContent = () => (
      <div className="space-y-6">
         <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Filters</h2>
            <Button
               onClick={handleClearFilters}
               variant="ghost"
               size="sm"
               className="text-orange-500 hover:text-orange-600"
            >
               Clear All
            </Button>
         </div>

         <div>
            <button
               onClick={() => toggleSection("category")}
               className="flex items-center justify-between w-full mb-3"
            >
               <h3 className="font-medium">Categories</h3>
               {expandedSections.category ? (
                  <ChevronUp className="h-4 w-4" />
               ) : (
                  <ChevronDown className="h-4 w-4" />
               )}
            </button>
            {expandedSections.category && (
               <div className="space-y-1">
                  {categories.map((c) => {
                     const categorySubcategories = subcategories.filter(
                        (sc) => sc.category_id === c.id
                     );
                     console.log({ subcategories });
                     const isExpanded = expandedCategories.has(c.id);
                     const hasSubcategories = categorySubcategories.length > 0;

                     return (
                        <div
                           key={c.id}
                           className="space-y-1"
                        >
                           <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 flex-1">
                                 <Checkbox
                                    id={c.id}
                                    checked={filters.categories.includes(c.id)}
                                    onCheckedChange={(checked) =>
                                       handleCategoryToggle(c.id, !!checked)
                                    }
                                 />
                                 <label
                                    htmlFor={c.id}
                                    className="text-sm cursor-pointer flex-1"
                                 >
                                    {c.name}
                                 </label>
                                 {hasSubcategories && (
                                    <button
                                       type="button"
                                       onClick={() => toggleCategory(c.id)}
                                       className="p-1 hover:bg-gray-100 rounded"
                                       aria-label={
                                          isExpanded
                                             ? `Collapse ${c.name} subcategories`
                                             : `Expand ${c.name} subcategories`
                                       }
                                       title={
                                          isExpanded
                                             ? `Collapse ${c.name} subcategories`
                                             : `Expand ${c.name} subcategories`
                                       }
                                       aria-expanded={
                                          isExpanded ? "true" : "false"
                                       }
                                    >
                                       <span className="sr-only">
                                          {isExpanded
                                             ? `Collapse ${c.name} subcategories`
                                             : `Expand ${c.name} subcategories`}
                                       </span>
                                       {isExpanded ? (
                                          <ChevronUp className="h-3 w-3" />
                                       ) : (
                                          <ChevronDown className="h-3 w-3" />
                                       )}
                                    </button>
                                 )}
                              </div>
                           </div>
                           {isExpanded && hasSubcategories && (
                              <div className="ml-6 space-y-1 border-l border-gray-200 pl-2">
                                 {categorySubcategories.map((sc) => (
                                    <div
                                       key={sc.id}
                                       className="flex items-center space-x-2"
                                    >
                                       <Checkbox
                                          id={sc.id}
                                          checked={filters.subcategories.includes(
                                             sc.id
                                          )}
                                          onCheckedChange={(checked) =>
                                             handleSubcategoryToggle(
                                                sc.id,
                                                !!checked
                                             )
                                          }
                                       />
                                       <label
                                          htmlFor={sc.id}
                                          className="text-sm cursor-pointer"
                                       >
                                          {sc.name}
                                       </label>
                                    </div>
                                 ))}
                              </div>
                           )}
                        </div>
                     );
                  })}
               </div>
            )}
         </div>
      </div>
   );

   const totalPages = Math.ceil(totalCount / PAGE_LIMIT);

   return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
         <div className="container mx-auto px-2 lg:px-4 py-6">
            <div className="flex gap-6">
               <div className="hidden lg:block w-80 flex-shrink-0">
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 sticky top-28 max-h-[calc(100vh-10rem)] overflow-y-auto">
                     <div className="p-6">
                        <FilterContent />
                     </div>
                  </div>
               </div>

               <div className="flex-1 min-w-0 space-y-6">
                  {/* Mobile Subcategories Filter */}
                  {isMobile && selectedCategorySubcategories.length > 0 && (
                     <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">
                           Filter by Subcategories
                        </h3>
                        <div className="flex flex-wrap gap-2">
                           {selectedCategorySubcategories.map((subcategory) => (
                              <Button
                                 key={subcategory.id}
                                 variant={
                                    filters.subcategories.includes(
                                       subcategory.id
                                    )
                                       ? "default"
                                       : "outline"
                                 }
                                 size="sm"
                                 onClick={() => {
                                    const isSelected =
                                       filters.subcategories.includes(
                                          subcategory.id
                                       );
                                    handleSubcategoryToggle(
                                       subcategory.id,
                                       !isSelected
                                    );
                                 }}
                                 className={cn(
                                    "text-xs",
                                    filters.subcategories.includes(
                                       subcategory.id
                                    )
                                       ? "bg-orange-500 hover:bg-orange-600 text-white"
                                       : "hover:bg-orange-50"
                                 )}
                              >
                                 {subcategory.name}
                              </Button>
                           ))}
                        </div>
                     </div>
                  )}

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                     <div className="flex items-center gap-4 flex-1">
                        <div className="relative w-full max-w-xs">
                           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                           <Input
                              placeholder="Search products..."
                              value={filters.q}
                              onChange={(e) =>
                                 setFilters({ q: e.target.value, page: 1 })
                              }
                              className="pl-9 bg-slate-50 border-slate-200"
                           />
                        </div>
                        <Sheet
                           open={isFilterOpen}
                           onOpenChange={setIsFilterOpen}
                        >
                           <SheetTrigger asChild>
                              <Button
                                 variant="outline"
                                 size="sm"
                                 className="lg:hidden bg-transparent"
                              >
                                 <Filter className="h-4 w-4 mr-2" />
                                 Categories
                              </Button>
                           </SheetTrigger>
                           <SheetContent
                              side="right"
                              className="w-full sm:w-96 overflow-y-auto z-[9999999999999]"
                           >
                              <SheetHeader className="mb-6">
                                 <SheetTitle>Filter Products</SheetTitle>
                              </SheetHeader>
                              <FilterContent />
                           </SheetContent>
                        </Sheet>
                     </div>
                     <div className="flex items-center gap-4">
                        {/* <p className="text-sm text-gray-600 hidden md:block">
                  <span className="font-medium">{totalCount}</span> Products
                </p> */}
                        <Select
                           value={filters.sort}
                           onValueChange={(value) =>
                              setFilters({ sort: value })
                           }
                        >
                           <SelectTrigger className="w-48">
                              <SelectValue />
                           </SelectTrigger>
                           <SelectContent>
                              <SelectItem value="created_at.desc">
                                 Newest
                              </SelectItem>
                              <SelectItem value="price.asc">
                                 Price: Low to High
                              </SelectItem>
                              <SelectItem value="price.desc">
                                 Price: High to Low
                              </SelectItem>
                              <SelectItem value="average_rating.desc">
                                 Rating
                              </SelectItem>
                           </SelectContent>
                        </Select>
                     </div>
                  </div>

            {!loading && products.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-20 bg-white rounded-xl shadow-sm border border-slate-200">
                <PackageSearch className="w-20 h-20 text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700">
                  No Products Found
                </h3>
                <p className="text-gray-500 mt-2">
                  Try adjusting your filters or search term.
                </p>
                <Button
                  onClick={handleClearFilters}
                  className="mt-6 bg-orange-500 hover:bg-orange-600"
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-5 mb-8">
                {loading
                  ? Array.from({ length: PAGE_LIMIT }).map((_, i) => (
                      <Card
                        key={i}
                        className="animate-pulse bg-gray-200 h-80 border-0"
                      >
                        <CardContent className="p-3">
                          <div className="aspect-square bg-gray-300 rounded-lg mb-3"></div>
                          <div className="h-4 bg-gray-300 rounded mb-2"></div>
                          <div className="h-3 bg-gray-300 rounded w-3/4"></div>
                        </CardContent>
                      </Card>
                    ))
                  : products.map((product) => (
                      <Card
                        key={product.id}
                        onClick={() => router.push(`/products/${product?.id}`)}
                        className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white border-0 shadow-md cursor-pointer overflow-hidden"
                      >
                        <CardContent className="md:p-5 p-2">
                          <div className="relative mb-4">
                            <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl p-4 aspect-square">
                              <Image
                                src={
                                  product?.main_image_url || "/placeholder.svg"
                                }
                                alt={product?.name}
                                fill
                                className="object-cover rounded-lg"
                              //   priority
                              //   loading="eager"
                              />
                            </div>
                            <div className="absolute z-20 left-3 top-3">
                              {((product as any).stock ??
                                product?.stock ??
                                0) <= 0 ? (
                                <span className="inline-block bg-red-600 text-white text-xs font-bold rounded-lg px-3 py-1 shadow-md">
                                  Out of Stock
                                </span>
                              ) : (
                                <span className="hidden md:inline-block bg-orange-500 text-white text-xs font-bold rounded-lg px-3 py-1 shadow-md">
                                  RWF{" "}
                                  {(product as any).minPrice &&
                                  (product as any).maxPrice
                                    ? (product as any).minPrice ===
                                      (product as any).maxPrice
                                      ? (
                                          product as any
                                        ).minPrice.toLocaleString()
                                      : `${(product as any).minPrice.toLocaleString()}-${(product as any).maxPrice.toLocaleString()}`
                                    : product?.price.toLocaleString()}
                                </span>
                              )}
                            </div>
                            {/* Wishlist Button (disabled for OOS) */}
                            <div className="absolute top-2 right-2">
                              {((product as any).stock ?? product?.stock) <=
                              0 ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toast.error(
                                      t("products.outOfStock") ||
                                        "This product is out of stock."
                                    );
                                  }}
                                  className="bg-white/90 backdrop-blur-sm rounded-full p-1.5 opacity-60 cursor-not-allowed"
                                  aria-disabled
                                >
                                  <Heart className="h-4 w-4 text-gray-300" />
                                </button>
                              ) : (
                                <WishlistButton
                                  productId={product.id}
                                  size="sm"
                                  variant="ghost"
                                  className="bg-white/90 backdrop-blur-sm hover:bg-white shadow-sm rounded-full p-1.5"
                                />
                              )}
                            </div>
                          </div>

                          {/* Content */}
                          <div className="space-y-2">
                            <p className="md:hidden font-bold text-orange-500 text-lg">
                              {(product as any).minPrice &&
                              (product as any).maxPrice
                                ? (product as any).minPrice ===
                                  (product as any).maxPrice
                                  ? (product as any).minPrice.toLocaleString()
                                  : `${(product as any).minPrice.toLocaleString()}-${(product as any).maxPrice.toLocaleString()}`
                                : product?.price.toLocaleString()}{" "}
                              frw
                            </p>
                            <h3 className="font-semibold text-gray-900 text-sm md:text-lg truncate">
                              {product?.name}
                            </h3>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => handleAddToCart(e, product)}
                                  disabled={
                                    ((product as any).stock ??
                                      product?.stock ??
                                      0) <= 0
                                  }
                                  className={cn(
                                    "h-10 w-10 rounded-md flex items-center justify-center bg-white border transition",
                                    ((product as any).stock ??
                                      product?.stock ??
                                      0) <= 0
                                      ? "opacity-50 cursor-not-allowed border-gray-300"
                                      : "border-gray-300 hover:border-orange-500"
                                  )}
                                  aria-label="Add to cart"
                                >
                                  <ShoppingCart
                                    className={cn(
                                      "h-5 w-5",
                                      ((product as any).stock ??
                                        product?.stock ??
                                        0) <= 0
                                        ? "text-gray-400"
                                        : "text-orange-500"
                                    )}
                                  />
                                </button>

                                               <Button
                                                  onClick={(e) =>
                                                     handleBuyNow(e, product)
                                                  }
                                                  disabled={
                                                     ((product as any).stock ??
                                                        product?.stock ??
                                                        0) <= 0
                                                  }
                                                  variant="default"
                                                  className={cn(
                                                     "flex-1 h-10 text-sm font-medium bg-gradient-to-r from-orange-500 to-orange-600 text-white transition",
                                                     ((product as any).stock ??
                                                        product?.stock ??
                                                        0) <= 0 &&
                                                        "opacity-50 cursor-not-allowed hover:from-orange-500 hover:to-orange-600"
                                                  )}
                                               >
                                                  {((product as any).stock ??
                                                     product?.stock ??
                                                     0) <= 0
                                                     ? "Out of Stock"
                                                     : t("products.buyNow")}
                                               </Button>
                                            </div>
                                         </div>
                                      </div>
                                   </CardContent>
                                </Card>
                             ))}
                     </div>
                  )}

                  {!loading && totalPages > 1 && (
                     <div className="flex justify-center items-center flex-wrap gap-2 bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200">
                        <Button
                           onClick={() =>
                              setFilters({
                                 page: Math.max(1, filters.page - 1),
                              })
                           }
                           disabled={filters.page === 1}
                           variant="outline"
                           size="sm"
                           className="hover:bg-orange-50 bg-transparent"
                        >
                           Previous
                        </Button>

                        {(() => {
                           const pages = [];
                           const delta = 2; // Number of pages to show around current page
                           const range = [];
                           const rangeWithDots = [];

                           // Calculate range around current page
                           const start = Math.max(2, filters.page - delta);
                           const end = Math.min(
                              totalPages - 1,
                              filters.page + delta
                           );

                           // Always show first page
                           if (totalPages >= 1) {
                              range.push(1);
                           }

                           // Add pages around current page
                           for (let i = start; i <= end; i++) {
                              if (i !== 1 && i !== totalPages) {
                                 range.push(i);
                              }
                           }

                           // Always show last page
                           if (totalPages > 1) {
                              range.push(totalPages);
                           }

                           // Remove duplicates and sort
                           const uniqueRange = [...new Set(range)].sort(
                              (a, b) => a - b
                           );

                           // Add ellipsis where needed
                           for (let i = 0; i < uniqueRange.length; i++) {
                              const page = uniqueRange[i];
                              rangeWithDots.push(page);

                              // Add ellipsis if there's a gap
                              if (
                                 i < uniqueRange.length - 1 &&
                                 uniqueRange[i + 1] - page > 1
                              ) {
                                 rangeWithDots.push("...");
                              }
                           }

                           return rangeWithDots.map((item, index) => {
                              if (item === "...") {
                                 return (
                                    <span
                                       key={`ellipsis-${index}`}
                                       className="px-2 py-1 text-gray-500"
                                    >
                                       ...
                                    </span>
                                 );
                              }

                              const pageNum = item as number;
                              return (
                                 <Button
                                    key={pageNum}
                                    onClick={() =>
                                       setFilters({ page: pageNum })
                                    }
                                    variant={
                                       filters.page === pageNum
                                          ? "default"
                                          : "outline"
                                    }
                                    size="sm"
                                    className={cn(
                                       "w-10 h-10",
                                       filters.page === pageNum
                                          ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md"
                                          : "hover:bg-orange-50"
                                    )}
                                 >
                                    {pageNum}
                                 </Button>
                              );
                           });
                        })()}

                        <Button
                           onClick={() =>
                              setFilters({
                                 page: Math.min(totalPages, filters.page + 1),
                              })
                           }
                           disabled={filters.page === totalPages}
                           variant="outline"
                           size="sm"
                           className="hover:bg-orange-50 bg-transparent"
                        >
                           Next
                        </Button>
                     </div>
                  )}
               </div>
            </div>
         </div>
      </div>
   );
}

export default function ProductListingPageContainer() {
   return (
      <Suspense
         fallback={
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
               <p>Loading products...</p>
            </div>
         }
      >
         <ProductListingComponent />
      </Suspense>
   );
}

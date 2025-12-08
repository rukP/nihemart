"use client";

import {
  fetchLandingPageProducts,
  StoreProduct,
} from "@/integrations/supabase/store";
import React, { FC, useEffect, useState } from "react";
import { Button } from "../ui/button";
import Image from "next/image";
import { optimizeImageUrl } from "@/lib/utils";
import Link from "next/link";
import MaxWidthWrapper from "../MaxWidthWrapper";
import { useLanguage } from "@/contexts/LanguageContext";
import { WishlistButton } from "../ui/wishlist-button";
// import { toast } from "sonner";
// import { Heart } from "lucide-react";

interface MoreToLoveProps {}

const ProductGridSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="grid grid-cols-2 min-[500px]:grid-cols-3 min-[1000px]:grid-cols-4 xl:grid-cols-4 gap-1.5 md:gap-5">
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className="shrink-0 aspect-[3/3.8] sm:aspect-[4/5] bg-gray-200 rounded-xl animate-pulse"
      />
    ))}
  </div>
);

const ProductCard = ({ product }: { product: StoreProduct }) => {
  const { t } = useLanguage();

  // Display price range if min/max prices exist, otherwise show single price
  // const displayPrice =
  //   product.minPrice && product.maxPrice
  //     ? product.minPrice === product.maxPrice
  //       ? `RWF ${product.minPrice.toLocaleString()}`
  //       : `RWF ${product.minPrice.toLocaleString()} - ${product.maxPrice.toLocaleString()}`
  //     : `RWF ${product.price.toLocaleString()}`;

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col bg-white rounded-xl overflow-hidden shadow hover:shadow-lg transition-all duration-300 border border-gray-100 h-full relative"
      aria-label={`View details for ${product.name}`}
      tabIndex={0}
    >
      {/* Wishlist Button */}
      {/* <div className="absolute z-20 right-2 top-2">
        <WishlistButton
          productId={product.id}
          size="sm"
          variant="ghost"
          className="bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm"
        />
      </div> */}

      {/* <div className="relative w-full h-[120px] md:h-[35vh] bg-gray-100">
        <Image
          src={product.main_image_url || "/placeholder.svg"}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, 33vw"
        />
      </div> */}
      {/* <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl p-4 aspect-square">
        <Image
          src={product.main_image_url || "/placeholder.svg"}
          alt={product.name}
          fill
          className="object-cover rounded-lg"
        />
      </div> */}

      {/* ✅ More compact text area */}
      {/* <div className="flex flex-col flex-1 px-2 pt-1 pb-2 gap-0.5 sm:gap-1.5">
        <span className="text-orange-500 text-xs sm:text-sm md:text-lg font-bold">
          {displayPrice}
        </span>
        <h4 className="font-semibold text-gray-900 text-[11px] sm:text-sm md:text-base line-clamp-2">
          {product.name}
        </h4>
      </div> */}
      <div className="p-2">
        <div className="relative mb-4">
          <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl p-4 aspect-square">
            <Image
              src={optimizeImageUrl(
                product?.main_image_url || "/placeholder.svg",
                {
                  width: 800,
                  quality: 75,
                }
              )}
              alt={product?.name}
              fill
              className="object-cover rounded-lg"
              // priority
              // loading="eager"
            />
          </div>
          <div className="absolute z-20 left-3 top-3">
            {/* {((product as any).stock ?? product?.stock ?? 0) <= 0 ? (
              <span className="inline-block bg-red-600 text-white text-xs font-bold rounded-lg px-3 py-1 shadow-md">
                Out of Stock
              </span>
            ) : ( */}
            {/* <span className="hidden md:inline-block bg-orange-500 text-white text-xs font-bold rounded-lg px-3 py-1 shadow-md">
                RWF{" "}
                {(product as any).minPrice && (product as any).maxPrice
                  ? (product as any).minPrice === (product as any).maxPrice
                    ? (product as any).minPrice.toLocaleString()
                    : `${(product as any).minPrice.toLocaleString()}-${(product as any).maxPrice.toLocaleString()}`
                  : product?.price.toLocaleString()}
              </span> */}
            {/* )} */}
          </div>
          {/* Wishlist Button (disabled for OOS) */}
          <div className="absolute top-2 right-2">
            {/* {((product as any).stock ?? product?.stock) <= 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toast.error(
                    t("products.outOfStock") || "This product is out of stock."
                  );
                }}
                className="bg-white/90 backdrop-blur-sm rounded-full p-1.5 opacity-60 cursor-not-allowed"
                aria-label={`${t("products.addToWishlist") || "Add to wishlist"} - ${product?.name || "product"}`}
                aria-disabled="true"
              >
                <Heart className="h-4 w-4 text-gray-300" aria-hidden="true" />
              </button>
            ) : ( */}
            <WishlistButton
              productId={product.id}
              size="sm"
              variant="ghost"
              className="bg-white/90 backdrop-blur-sm hover:bg-white shadow-sm p-2"
            />
            {/* )} */}
          </div>
        </div>

        {/* Content */}
        <div className="">
          <p className="font-bold text-orange-500 text-lg">
            {(product as any).minPrice && (product as any).maxPrice
              ? (product as any).minPrice === (product as any).maxPrice
                ? (product as any).minPrice.toLocaleString()
                : `${(product as any).minPrice.toLocaleString()}-${(product as any).maxPrice.toLocaleString()}`
              : product?.price.toLocaleString()}{" "}
            frw
          </p>
          <h3 className="font-semibold text-gray-900 text-sm md:text-lg truncate">
            {product?.name}
          </h3>
          {/* <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => handleAddToCart(e, product)}
                disabled={((product as any).stock ?? product?.stock ?? 0) <= 0}
                className={cn(
                  "h-10 w-10 rounded-md flex items-center justify-center bg-white border transition",
                  ((product as any).stock ?? product?.stock ?? 0) <= 0
                    ? "opacity-50 cursor-not-allowed border-gray-300"
                    : "border-gray-300 hover:border-orange-500"
                )}
                aria-label="Add to cart"
              >
                <ShoppingCart
                  className={cn(
                    "h-5 w-5",
                    ((product as any).stock ?? product?.stock ?? 0) <= 0
                      ? "text-gray-400"
                      : "text-orange-500"
                  )}
                />
              </button>

              <Button
                onClick={(e) => handleBuyNow(e, product)}
                disabled={((product as any).stock ?? product?.stock ?? 0) <= 0}
                variant="default"
                className={cn(
                  "flex-1 h-10 text-sm font-medium bg-gradient-to-r from-orange-500 to-orange-600 text-white transition",
                  ((product as any).stock ?? product?.stock ?? 0) <= 0 &&
                    "opacity-50 cursor-not-allowed hover:from-orange-500 hover:to-orange-600"
                )}
              >
                {((product as any).stock ?? product?.stock ?? 0) <= 0
                  ? "Out of Stock"
                  : t("products.buyNow")}
              </Button>
            </div>
          </div> */}
        </div>
      </div>
    </Link>
  );
};

const MoreToLove: FC<MoreToLoveProps> = ({}) => {
  const { t } = useLanguage();

  const [moreToLove, setMoreToLove] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const initialLimit = 15;
  const loadMoreLimit = 10;

  // Load initial products
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const products = await fetchLandingPageProducts({
          limit: initialLimit,
          offset: 0,
          sortBy: "short_description",
        });
        setMoreToLove(products);
        setOffset(initialLimit);
      } catch (error) {
        console.error("Failed to load landing page data", error);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // Load more products
  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const newProducts = await fetchLandingPageProducts({
        limit: loadMoreLimit,
        offset,
        sortBy: "short_description",
      });
      setMoreToLove((prev) => [...prev, ...newProducts]);
      setOffset((prev) => prev + loadMoreLimit);
    } catch (error) {
      console.error("Failed to fetch more products", error);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="mb-20">
      <MaxWidthWrapper size={"lg"}>
        <h3 className="lg:text-4xl md:text-2xl text-xl font-bold text-neutral-900 mb-5">
          {t("home.more")}
        </h3>

        {loading ? (
          <ProductGridSkeleton count={15} />
        ) : (
          <>
            {/* ✅ Compact grid layout for better mobile fit */}
            <div className="grid grid-cols-2 min-[500px]:grid-cols-3 min-[1000px]:grid-cols-4 xl:grid-cols-5 gap-1.5 md:gap-5">
              {moreToLove.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            <div className="flex justify-center mt-10">
              <Button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-3 rounded-full"
              >
                {loadingMore ? t("common.loading") : t("common.loadMore")}
              </Button>
            </div>
          </>
        )}
      </MaxWidthWrapper>
    </div>
  );
};

export default MoreToLove;

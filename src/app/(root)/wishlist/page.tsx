"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useWishlist } from "@/contexts/WishlistContext";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import MaxWidthWrapper from "@/components/MaxWidthWrapper";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export default function WishlistPage() {
  const { t } = useLanguage(); // Use the language context for translations
  const { wishlistItems, removeFromWishlist, isLoading } = useWishlist();
  const { addItem } = useCart();
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  const handleAddToCart = async (product: any) => {
    setAddingToCart(product.id);
    try {
      const stock = (product as any).stock ?? product.stock ?? 0;
      if (stock <= 0) {
        toast.error(
          t("products.outOfStock") || "This product is out of stock."
        );
        return;
      }
      await addItem(product);
      toast.success(t("cart.addedToCart") || "Added to cart successfully");
    } catch (error) {
      toast.error("Failed to add to cart");
    } finally {
      setAddingToCart(null);
    }
  };

  const handleRemoveFromWishlist = async (productId: string) => {
    try {
      await removeFromWishlist(productId);
      toast.success(t("wishlist.removedFromWishlist"));
    } catch (error) {
      toast.error(t("wishlist.failedRemoveFromWishlist"));
    }
  };

  if (isLoading) {
    return (
      <MaxWidthWrapper className="py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-8">{t("wishlist.title")}</h1>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </MaxWidthWrapper>
    );
  }

  return (
    <MaxWidthWrapper className="py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {t("wishlist.title")}
        </h1>
        <p className="text-gray-600 mt-2">
          {wishlistItems.length === 0
            ? t("wishlist.empty")
            : wishlistItems.length === 1
              ? `${wishlistItems.length} ${t("wishlist.item")}`
              : `${wishlistItems.length} ${t("wishlist.items")}`}
        </p>
      </div>

      {wishlistItems.length === 0 ? (
        <div className="text-center py-16">
          <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">
            {t("wishlist.emptyTitle")}
          </h2>
          <p className="text-gray-500 mb-6">{t("wishlist.emptyDesc")}</p>
          <Button asChild>
            <Link href="/products">{t("wishlist.browseProducts")}</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlistItems.map((item) => (
            <Card key={item.id} className="group overflow-hidden">
              <CardContent className="p-0">
                <Link href={`/products/${item.product.id}`}>
                  <div className="relative aspect-square bg-gray-100 rounded-md overflow-hidden p-2 sm:p-3">
                    <Image
                      src={item.product.main_image_url || "/placeholder.svg"}
                      alt={item.product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300 rounded-sm"
                    />
                  </div>
                </Link>

                <div className="p-3 sm:p-4">
                  <Link href={`/products/${item.product.id}`}>
                    <h3 className="font-semibold text-base sm:text-lg mb-1 line-clamp-2 hover:text-orange-600 transition-colors">
                      {item.product.name}
                    </h3>
                  </Link>

                  <p className="text-gray-600 text-sm mb-2 line-clamp-1 sm:line-clamp-2">
                    {item.product.short_description}
                  </p>

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg sm:text-xl font-bold text-orange-600">
                      {t("wishlist.price")}{" "}
                      {(item.product as any).minPrice &&
                      (item.product as any).maxPrice
                        ? (item.product as any).minPrice ===
                          (item.product as any).maxPrice
                          ? (item.product as any).minPrice.toLocaleString()
                          : `${(item.product as any).minPrice.toLocaleString()}-${(item.product as any).maxPrice.toLocaleString()}`
                        : item.product.price.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleAddToCart(item.product)}
                      disabled={
                        addingToCart === item.product.id ||
                        (item.product?.stock ?? 0) <= 0
                      }
                      className={cn(
                        "flex-1 h-9 text-sm",
                        (item.product?.stock ?? 0) <= 0
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : "bg-orange-600 hover:bg-orange-700"
                      )}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {(item.product?.stock ?? 0) <= 0
                        ? t("products.outOfStock") || "Out of Stock"
                        : addingToCart === item.product.id
                          ? t("wishlist.adding")
                          : t("wishlist.addToCart")}
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleRemoveFromWishlist(item.product.id)}
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </MaxWidthWrapper>
  );
}

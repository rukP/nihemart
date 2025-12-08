"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import LookingGlass from "@/components/LookingGlass";
import {
   Star,
   Minus,
   Plus,
   Truck,
   RotateCcw,
   Upload,
   X,
   ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
   Carousel,
   CarouselContent,
   CarouselItem,
   CarouselNext,
   CarouselPrevious,
   type CarouselApi,
} from "@/components/ui/carousel";
import { createStoreReview } from "@/integrations/supabase/store";
import type {
   ProductPageData,
   ProductReview,
} from "@/integrations/supabase/store";
import { useCart } from "@/contexts/CartContext";
import { useBuyNow } from "@/contexts/BuyNowContext";
import { cn, optimizeImageUrl } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WishlistButton } from "@/components/ui/wishlist-button";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProductClientPageProps {
   initialData: ProductPageData;
}

export default function ProductClientPage({
   initialData,
}: ProductClientPageProps) {
   const router = useRouter();
   const { addItem } = useCart();
   const { setBuyNowItem } = useBuyNow();
   const { t } = useLanguage();
   const [data] = useState<ProductPageData>(initialData);

   const [carouselApi, setCarouselApi] = useState<CarouselApi>();
   const [currentIndex, setCurrentIndex] = useState(0);
   const [quantity, setQuantity] = useState(1);
   const [reviews, setReviews] = useState<ProductReview[]>(data.reviews || []);
   const [user, setUser] = useState<User | null>(null);
   const [ordersEnabled, setOrdersEnabled] = useState<boolean | null>(null);

   const [selectedOptions, setSelectedOptions] = useState<
      Record<string, string>
   >({});

   const { product, variations, images, similarProducts } = data;

   useEffect(() => {
      const getUser = async () => {
         const {
            data: { session },
         } = await supabase.auth.getSession();
         setUser(session?.user ?? null);
      };
      getUser();
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

   const uniqueAttributeValues = useMemo(() => {
      const attributes: Record<string, Set<string>> = {};
      variations.forEach((v) => {
         Object.entries(v.attributes).forEach(([key, value]) => {
            if (!attributes[key]) attributes[key] = new Set();
            value
               .split(",")
               .map((s) => s.trim())
               .forEach((val) => attributes[key].add(val));
         });
      });
      return Object.fromEntries(
         Object.entries(attributes).map(([key, valueSet]) => [
            key,
            Array.from(valueSet),
         ])
      );
   }, [variations]);

   useEffect(() => {
      if (variations.length === 1) {
         const attrs = Object.keys(variations[0].attributes);
         if (attrs.length === 1) {
            const attr = attrs[0];
            const value = variations[0].attributes[attr];
            setSelectedOptions({ [attr]: value });
         }
      }
   }, [variations]);

   const possibleVariants = useMemo(() => {
      if (Object.keys(selectedOptions).length === 0) return variations;
      return variations.filter((variant) =>
         Object.entries(selectedOptions).every(([key, value]) =>
            variant.attributes[key]
               ?.split(",")
               .map((s) => s.trim())
               .includes(value)
         )
      );
   }, [selectedOptions, variations]);

   const singleSelectedVariation = useMemo(() => {
      if (possibleVariants.length === 1) {
         const finalVariant = possibleVariants[0];
         const userSelectionCount = Object.keys(selectedOptions).length;
         const variantAttributeCount = Object.keys(
            finalVariant.attributes
         ).length;
         if (userSelectionCount === variantAttributeCount) {
            return finalVariant;
         }
      }
      return null;
   }, [possibleVariants, selectedOptions]);

   const availableOptions = useMemo(() => {
      const available: Record<string, Set<string>> = {};
      Object.keys(uniqueAttributeValues).forEach((key) => {
         available[key] = new Set();
         const tempSelection = { ...selectedOptions };
         delete (tempSelection as any)[key];

         const potentialVariants = variations.filter((variant) =>
            Object.entries(tempSelection).every(([k, v]) =>
               variant.attributes[k]
                  ?.split(",")
                  .map((s) => s.trim())
                  .includes(v as string)
            )
         );

         potentialVariants.forEach((variant) => {
            variant.attributes[key]
               ?.split(",")
               .map((s) => s.trim())
               .forEach((val) => available[key].add(val));
         });
      });
      return available;
   }, [selectedOptions, variations, uniqueAttributeValues]);

   const displayImages = useMemo(() => {
      const allImages = [
         ...images
            .filter((img) => !img.product_variation_id)
            .map((img) => img.url),
         ...images
            .filter((img) => img.product_variation_id)
            .map((img) => img.url),
      ];
      if (allImages.length > 0) return allImages;
      return product.main_image_url
         ? [product.main_image_url]
         : ["/placeholder.svg"];
   }, [images, product.main_image_url]);

   useEffect(() => {
      if (singleSelectedVariation && carouselApi) {
         const variantImageIndex = displayImages.findIndex((imgUrl) => {
            const imageObj = images.find(
               (img) =>
                  img.url === imgUrl &&
                  img.product_variation_id === singleSelectedVariation.id
            );
            return imageObj !== undefined;
         });
         if (variantImageIndex !== -1) {
            carouselApi.scrollTo(variantImageIndex);
         }
      }
   }, [singleSelectedVariation, displayImages, images, carouselApi]);

   useEffect(() => {
      if (!carouselApi) return;
      setCurrentIndex(carouselApi.selectedScrollSnap());
      const onSelect = () => setCurrentIndex(carouselApi.selectedScrollSnap());
      carouselApi.on("select", onSelect);
      return () => {
         carouselApi.off("select", onSelect);
      };
   }, [carouselApi]);

   const handleOptionSelect = (type: string, value: string) => {
      setSelectedOptions((prev) => {
         const newOptions = { ...prev };
         if (newOptions[type] === value) {
            delete newOptions[type];
         } else {
            newOptions[type] = value;
         }
         return newOptions;
      });
   };

   const handleAddToCart = () => {
      const hasVariants = variations.length > 0;
      if (hasVariants && !singleSelectedVariation) {
         toast.error("Please select a complete and valid product combination.");
         return;
      }

      if (!inStock) {
         toast.error(
            t("products.outOfStock") || "This item is currently out of stock."
         );
         return;
      }

      const itemToAdd = {
         product_id: product.id,
         name: product.name,
         price: singleSelectedVariation?.price ?? product.price,
         image: product.main_image_url || "/placeholder.svg",
         variant: singleSelectedVariation
            ? Object.values(singleSelectedVariation.attributes).join(" / ")
            : undefined,
         id: singleSelectedVariation
            ? `${product.id}-${singleSelectedVariation.id}`
            : product.id,
      };

      for (let i = 0; i < quantity; i++) {
         addItem(itemToAdd);
      }
      // friendly feedback
      toast.success(t("cart.continue") || "Added to cart");
   };

   const handleBuyNow = () => {
      // Check if orders are disabled
      if (ordersEnabled === false) {
         toast.error(
            t("checkout.ordersDisabled") ||
               "Orders are currently disabled. Please try again later."
         );
         return;
      }

      // Do not touch the main cart. Use buy-now temporary session and go to checkout.
      const hasVariants = variations.length > 0;
      if (hasVariants && !singleSelectedVariation) {
         toast.error("Please select a complete and valid product combination.");
         return;
      }

      if (!inStock) {
         toast.error(
            t("products.outOfStock") || "This item is currently out of stock."
         );
         return;
      }

      const itemToBuy = {
         product_id: product.id,
         name: product.name,
         price: singleSelectedVariation?.price ?? product.price,
         image: product.main_image_url || "/placeholder.svg",
         variant: singleSelectedVariation
            ? Object.values(singleSelectedVariation.attributes).join(" / ")
            : undefined,
         quantity: quantity,
      };

      setBuyNowItem(itemToBuy);
      router.push("/checkout");
   };

   const reviewStats = useMemo(() => {
      if (!reviews || reviews.length === 0)
         return { average: 0, distribution: [] };
      const total = reviews.reduce((acc, r) => acc + r.rating, 0);
      const distribution = Array(5)
         .fill(0)
         .map((_, i) => {
            const star = 5 - i;
            const count = reviews.filter((r) => r.rating === star).length;
            return { stars: star, percentage: (count / reviews.length) * 100 };
         });
      return { average: total / reviews.length, distribution };
   }, [reviews]);

  const getSocialMeta = (url?: string) => {
    if (!url) return null;
    const u = url.toLowerCase();
    if (u.includes("instagram"))
      return {
        name: "Instagram",
        emoji: "📷",
        color: "from-pink-500 to-pink-600",
      };
    if (u.includes("facebook"))
      return {
        name: "Facebook",
        emoji: "👍",
        color: "from-blue-600 to-blue-700",
      };
    if (u.includes("whatsapp") || u.includes("wa.me"))
      return {
        name: "WhatsApp",
        emoji: "💬",
        color: "from-green-500 to-green-600",
      };
    if (u.includes("youtu"))
      return { name: "YouTube", emoji: "🎥", color: "from-red-600 to-red-700" };
    if (u.includes("tiktok"))
      return {
        name: "TikTok",
        emoji: "🎵",
        color: "from-gray-900 to-gray-800",
      };
    if (u.includes("twitter") || u.includes("x.com"))
      return {
        name: "Twitter/X",
        emoji: "𝕏",
        color: "from-sky-500 to-sky-600",
      };
    if (u.includes("linkedin"))
      return {
        name: "LinkedIn",
        emoji: "💼",
        color: "from-blue-700 to-blue-800",
      };
    return {
      name: "Website",
      emoji: "🔗",
      color: "from-slate-700 to-slate-800",
    };
  };

  // Calculate price range from variations
  const priceRange = useMemo(() => {
    if (variations.length === 0) return null;
    const prices = variations
      .map((v) => v.price)
      .filter((p) => p != null && p !== undefined)
      .sort((a, b) => (a ?? 0) - (b ?? 0));
    if (prices.length === 0) return null;
    return {
      min: prices[0],
      max: prices[prices.length - 1],
    };
  }, [variations]);

   const currentPrice = singleSelectedVariation?.price ?? product.price;
   const comparePrice = product.compare_at_price;
   const inStock =
      variations.length > 0
         ? (singleSelectedVariation?.stock ?? 0) > 0
         : (product.stock ?? 0) > 0;

   const isAddToCartDisabled =
      (variations.length > 0 && !singleSelectedVariation) || !inStock;

   const onReviewSubmitted = (newReview: ProductReview) => {
      setReviews((prev) => [newReview, ...prev]);
   };

   return (
      <div className="min-h-screen bg-gray-50">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
               <div className="space-y-4">
                  <Carousel
                     setApi={setCarouselApi}
                     opts={{ loop: true }}
                     className="w-full"
                  >
                     <CarouselContent>
                        {displayImages.map((image, index) => (
                           <CarouselItem key={index}>
                              <div className="relative aspect-square bg-white rounded-lg overflow-hidden">
                                 <LookingGlass
                                    src={optimizeImageUrl(image, {
                                       width: 800,
                                       height: 800,
                                       quality: 85,
                                    })}
                                    alt={`${product.name} - Image ${index + 1}`}
                                    zoomSrc={optimizeImageUrl(image, {
                                       width: 1600,
                                       height: 1600,
                                       quality: 90,
                                    })}
                                    zoomFactor={2}
                                    squareMagnifier={false}
                                    size={200}
                                    cursorOffset={{ x: 0, y: 0 }}
                                    imageClassName="object-contain"
                                 />
                              </div>
                           </CarouselItem>
                        ))}
                     </CarouselContent>
                     <CarouselPrevious className="left-5 text-orange-500 hover:text-orange-600 border border-orange-500 bg-white/80" />
                     <CarouselNext className="right-5 text-orange-500 hover:text-orange-600 border border-orange-500 bg-white/80" />
                  </Carousel>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                     {displayImages.map((image, index) => (
                        <button
                           key={index}
                           onClick={() => carouselApi?.scrollTo(index)}
                           title={`Select image ${index + 1}`}
                           className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                              currentIndex === index
                                 ? "border-orange-500"
                                 : "border-gray-200"
                           }`}
                        >
                           <Image
                              src={optimizeImageUrl(image, {
                                 width: 80,
                                 height: 80,
                                 quality: 70,
                              })}
                              alt={`Thumbnail ${index + 1}`}
                              width={80}
                              height={80}
                              className="object-cover w-full h-full"
                              quality={70}
                           />
                        </button>
                     ))}
                  </div>
               </div>

          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* <div className="flex items-baseline gap-2"><span className="text-3xl font-bold text-orange-600">{currentPrice.toFixed(2)} frw</span>{comparePrice && <span className="text-lg text-gray-500 line-through">€{comparePrice.toFixed(2)}</span>}</div> */}
                <div className="flex items-baseline gap-2 md:hidden">
                  {!singleSelectedVariation && priceRange ? (
                    <>
                      <span className="text-3xl font-bold text-orange-600">
                        {priceRange.min === priceRange.max
                          ? `${priceRange.min.toLocaleString()} frw`
                          : `${priceRange.min.toLocaleString()} - ${priceRange.max.toLocaleString()} frw`}
                      </span>
                    </>
                  ) : (
                    <span className="text-3xl font-bold text-orange-600">
                      {currentPrice.toLocaleString()} frw
                    </span>
                  )}
                  {comparePrice && (
                    <span className="text-lg text-gray-500 line-through">
                      {comparePrice} frw
                    </span>
                  )}
                </div>
                <h1 className="text-lg md:text-2xl lg:text-3xl font-bold text-gray-900">
                  {product.name}
                </h1>
                <p
                  className="text-gray-600 mt-1 text-sm md:text-md"
                  dangerouslySetInnerHTML={{
                    __html: product?.short_description || "",
                  }}
                />
              </div>
              <WishlistButton
                productId={product.id}
                size="lg"
                variant="outline"
                showText={false}
                className="ml-4"
              />
            </div>
            <div className="space-y-2">
              {/* <div className="flex items-baseline gap-2"><span className="text-3xl font-bold text-orange-600">{currentPrice.toFixed(2)} frw</span>{comparePrice && <span className="text-lg text-gray-500 line-through">€{comparePrice.toFixed(2)}</span>}</div> */}
              <div className="md:flex items-baseline gap-2 hidden">
                {!singleSelectedVariation && priceRange ? (
                  <>
                    <span className="text-3xl font-bold text-orange-600">
                      {priceRange.min === priceRange.max
                        ? `${priceRange.min.toLocaleString()} frw`
                        : `${priceRange.min.toLocaleString()} - ${priceRange.max.toLocaleString()} frw`}
                    </span>
                  </>
                ) : (
                  <span className="text-3xl font-bold text-orange-600">
                    {currentPrice.toLocaleString()} frw
                  </span>
                )}
                {comparePrice && (
                  <span className="text-lg text-gray-500 line-through">
                    {comparePrice} frw
                  </span>
                )}
              </div>

                     <div className="flex items-center gap-2">
                        <div className="flex items-center">
                           {[...Array(5)].map((_, i) => (
                              <Star
                                 key={i}
                                 className={`h-4 w-4 ${
                                    i < Math.round(reviewStats.average)
                                       ? "fill-yellow-400 text-yellow-400"
                                       : "text-gray-300"
                                 }`}
                              />
                           ))}
                           <span className="ml-1 text-sm font-medium">
                              {reviewStats.average.toFixed(1)}
                           </span>
                        </div>
                        <span className="text-sm text-gray-500">
                           {reviews?.length || 0} Reviews
                        </span>
                     </div>
                  </div>

                  {Object.entries(uniqueAttributeValues).map(
                     ([attr, values]) => (
                        <div
                           key={attr}
                           className="space-y-3"
                        >
                           <Label className="text-base font-medium capitalize">
                              Choose a {attr}
                           </Label>
                           <div className="flex gap-2 flex-wrap">
                              {values.map((value) => {
                                 const isSelected =
                                    selectedOptions[attr] === value;
                                 const isDisabled =
                                    !availableOptions[attr]?.has(value) &&
                                    !isSelected;
                                 return (
                                    <button
                                       key={value}
                                       onClick={() =>
                                          handleOptionSelect(attr, value)
                                       }
                                       disabled={isDisabled}
                                       className={cn(
                                          "px-4 py-2 rounded-lg border text-sm font-medium",
                                          isSelected
                                             ? "border-orange-500 bg-orange-50 text-orange-600"
                                             : "border-gray-300",
                                          isDisabled &&
                                             "opacity-50 cursor-not-allowed bg-gray-100 text-gray-400"
                                       )}
                                    >
                                       {value}
                                    </button>
                                 );
                              })}
                           </div>
                        </div>
                     )
                  )}

                  <div className="flex items-center gap-3">
                     <div className="flex items-center border rounded-lg">
                        <Button
                           variant="ghost"
                           size="icon"
                           onClick={() =>
                              setQuantity((q) => Math.max(1, q - 1))
                           }
                        >
                           <Minus className="h-4 w-4" />
                        </Button>
                        <span className="px-4 py-2 min-w-[3rem] text-center">
                           {quantity}
                        </span>
                        <Button
                           variant="ghost"
                           size="icon"
                           onClick={() => setQuantity((q) => q + 1)}
                        >
                           <Plus className="h-4 w-4" />
                        </Button>
                     </div>
                     <div className="flex-1 flex items-center gap-3">
                        <Button
                           onClick={() => handleAddToCart()}
                           aria-label="Add to cart"
                           className={cn(
                              "h-12 w-12 p-0 flex items-center justify-center rounded-md border bg-white",
                              (!inStock ||
                                 (variations.length > 0 &&
                                    !singleSelectedVariation)) &&
                                 "opacity-60 cursor-not-allowed"
                           )}
                        >
                           <ShoppingCart className="h-5 w-5 text-orange-500" />
                        </Button>

                <Button
                  onClick={() => handleBuyNow()}
                  className={cn(
                    "flex-1 h-12 text-base font-medium bg-gradient-to-r from-orange-500 to-orange-600 text-white",
                    (variations.length > 0 && !singleSelectedVariation) ||
                      !inStock
                      ? "opacity-60 cursor-not-allowed"
                      : "hover:shadow-lg"
                  )}
                >
                  {variations.length > 0 && !singleSelectedVariation
                    ? "Select Options"
                    : !inStock
                      ? t("products.outOfStock")
                      : t("products.buyNow")}
                </Button>
              </div>
            </div>
            <div className="space-y-4 pt-6 border-t">
              {product.social_media_link &&
                (() => {
                  const meta = getSocialMeta(product.social_media_link);
                  return (
                    <div className="w-full">
                      <h3 className="font-bold text-lg text-gray-900 mb-3">
                        {t("products.more")}
                      </h3>
                      <a
                        href={product.social_media_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`group relative block w-full overflow-hidden rounded-xl bg-gradient-to-r ${meta?.color} p-1 shadow-lg transition-all hover:shadow-xl`}
                      >
                        <div className="flex items-center gap-4 rounded-[10px] bg-white px-5 py-4 transition group-hover:bg-gray-50 sm:px-6 sm:py-5">
                          <span className="flex-shrink-0 text-4xl sm:text-5xl">
                            {meta?.emoji}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-gray-900">
                              {t("products.visit")} {meta?.name}
                            </div>
                            <div className="text-xs text-gray-600 truncate sm:text-sm">
                              {product.social_media_link.replace(
                                /^https?:\/\/(?:www\.)?/,
                                ""
                              )}
                            </div>
                          </div>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 flex-shrink-0 text-gray-400 transition group-hover:translate-x-1 group-hover:text-gray-600 sm:h-6 sm:w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                            />
                          </svg>
                        </div>
                      </a>
                    </div>
                  );
                })()}
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-600">We Deliver</p>
                  <p className="text-sm text-gray-600">
                    Delivery fee is calculated at checkout based on your
                    location.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <RotateCcw className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-600">Return Delivery</p>
                  <p className="text-sm text-gray-600">
                    If you are not satisfied with your purchase, you can return
                    it within 24 hours.
                    <Link
                      href="/returns"
                      className="text-orange-600 underline decoration-dotted cursor-pointer"
                    >
                      Details
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16">
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="reviews">
                Reviews ({reviews?.length || 0})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="description" className="mt-8">
              <Card>
                <CardContent
                  className="p-6 prose max-w-none prose-p:my-2 prose-h3:mb-2 prose-h3:mt-4"
                  dangerouslySetInnerHTML={{
                    __html: product.description || "No description available.",
                  }}
                />
              </Card>
              {product.social_media_link &&
                (() => {
                  const meta = getSocialMeta(product.social_media_link);
                  return (
                    <Card className="mt-6 border-0 shadow-md overflow-hidden">
                      <div className={`h-2 bg-gradient-to-r ${meta?.color}`} />
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <span className="text-3xl">{meta?.emoji}</span>
                          {meta?.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-2">
                        <a
                          href={product.social_media_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`group flex w-full items-center justify-between gap-3 rounded-lg bg-gradient-to-r ${meta?.color} px-4 py-3 font-medium text-white shadow-sm transition hover:shadow-md`}
                        >
                          <span className="truncate text-sm sm:text-base">
                            {product.social_media_link.replace(
                              /^https?:\/\/(?:www\.)?/,
                              ""
                            )}
                          </span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 flex-shrink-0 transition group-hover:translate-x-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                            />
                          </svg>
                        </a>
                      </CardContent>
                    </Card>
                  );
                })()}
            </TabsContent>
            <TabsContent value="reviews" className="mt-8 space-y-8">
              {reviews.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Customers Feedback</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="text-center">
                        <div className="text-5xl font-bold text-orange-600 mb-2">
                          {reviewStats.average.toFixed(1)}
                        </div>
                        <div className="flex justify-center mb-2">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-5 w-5 ${
                                i < Math.round(reviewStats.average)
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-gray-600">Product Rating</p>
                      </div>
                      <div className="space-y-2">
                        {reviewStats.distribution.map((item) => (
                          <div
                            key={item.stars}
                            className="flex items-center gap-2"
                          >
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3 w-3 ${
                                    i < item.stars
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <Progress
                              value={item.percentage}
                              className="flex-1 h-2"
                            />
                            <span className="text-sm text-gray-600 w-8">
                              {item.percentage.toFixed(0)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold">Customer Reviews</h3>
                {reviews?.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Avatar>
                          <AvatarFallback>
                            {review.author?.full_name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">
                              {review.author?.full_name || "Anonymous"}
                            </h4>
                            <span className="text-sm text-gray-500">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          {review.image_url && (
                            <div className="mb-4">
                              <Image
                                src={optimizeImageUrl(
                                  review.image_url || "/placeholder.svg",
                                  {
                                    width: 600,
                                    height: 400,
                                    quality: 75,
                                  }
                                )}
                                alt="Review image"
                                width={300}
                                height={200}
                                className="rounded-lg object-cover max-w-full h-auto"
                              />
                            </div>
                          )}
                          <h5 className="font-medium mb-2">{review.title}</h5>
                          <p className="text-gray-600">{review.content}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

                     {user ? (
                        <ReviewForm
                           productId={product.id}
                           userId={user.id}
                           onReviewSubmitted={onReviewSubmitted}
                        />
                     ) : (
                        <Card className="text-center">
                           <CardContent className="p-6">
                              <p>
                                 You must be{" "}
                                 <Link
                                    href="/login"
                                    className="text-orange-600 underline"
                                 >
                                    logged in
                                 </Link>{" "}
                                 to leave a review.
                              </p>
                           </CardContent>
                        </Card>
                     )}
                  </TabsContent>
               </Tabs>
            </div>

        {similarProducts && similarProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-8">
              Similar Items You Might Also Like
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {similarProducts.map((p) => (
                <Card
                  key={p.id}
                  className="group cursor-pointer"
                  onClick={() => router.push(`/products/${p.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="relative aspect-square mb-3 bg-gray-100 rounded-lg overflow-hidden">
                      <Image
                        src={optimizeImageUrl(p.main_image_url, {
                          width: 200,
                          height: 200,
                          quality: 75,
                        })}
                        alt={p.name}
                        fill
                        className="object-cover transition-transform"
                        sizes="(max-width: 1024px) 50vw, 25vw"
                        quality={75}
                      />
                      <div className="absolute top-2 right-2">
                        <WishlistButton
                          productId={p.id}
                          size="sm"
                          variant="ghost"
                          className="bg-white/80 backdrop-blur-sm shadow-sm"
                        />
                      </div>
                    </div>
                    <p className="font-bold text-orange-600">
                      FRW{" "}
                      {p.minPrice && p.maxPrice
                        ? p.minPrice === p.maxPrice
                          ? p.minPrice.toLocaleString()
                          : `${p.minPrice.toLocaleString()} - ${p.maxPrice.toLocaleString()}`
                        : p.price.toLocaleString()}
                    </p>
                    <h3 className="font-medium text-sm mb-1 truncate">
                      {p.name}
                    </h3>
                    {/* <div className="flex items-center gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${
                            i < Math.floor(p.average_rating || 0)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div> */}
                           </CardContent>
                        </Card>
                     ))}
                  </div>
               </div>
            )}
         </div>
      </div>
   );
}

function ReviewForm({
   productId,
   userId,
   onReviewSubmitted,
}: {
   productId: string;
   userId: string;
   onReviewSubmitted: (review: ProductReview) => void;
}) {
   const [rating, setRating] = useState(0);
   const [hoverRating, setHoverRating] = useState(0);
   const [title, setTitle] = useState("");
   const [content, setContent] = useState("");
   const [imageFile, setImageFile] = useState<File | null>(null);
   const [imagePreview, setImagePreview] = useState<string | null>(null);
   const [isSubmitting, setIsSubmitting] = useState(false);

   const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
         if (file.size > 5 * 1024 * 1024) {
            // 5MB limit
            toast.error("Image size must be less than 5MB");
            return;
         }
         if (!file.type.startsWith("image/")) {
            toast.error("Please select a valid image file");
            return;
         }
         setImageFile(file);
         setImagePreview(URL.createObjectURL(file));
      }
   };

   const removeImage = () => {
      setImageFile(null);
      setImagePreview(null);
   };

   const handleSubmit = async () => {
      if (rating === 0) {
         toast.error("Please select a star rating.");
         return;
      }
      setIsSubmitting(true);
      try {
         const newReview = await createStoreReview(
            {
               product_id: productId,
               user_id: userId,
               rating,
               title,
               content,
            },
            imageFile || undefined
         );
         toast.success("Thank you for your review!");
         onReviewSubmitted(newReview);
         setRating(0);
         setTitle("");
         setContent("");
         setImageFile(null);
         setImagePreview(null);
      } catch (error: any) {
         toast.error(error.message || "Failed to submit review.");
      } finally {
         setIsSubmitting(false);
      }
   };

   return (
      <Card>
         <CardHeader>
            <CardTitle>Write a Review</CardTitle>
         </CardHeader>
         <CardContent className="space-y-4">
            <div>
               <Label>Your Rating</Label>
               <div
                  className="flex gap-1 mt-2"
                  onMouseLeave={() => setHoverRating(0)}
               >
                  {[1, 2, 3, 4, 5].map((star) => (
                     <Star
                        key={star}
                        className={cn(
                           "h-6 w-6 cursor-pointer",
                           (hoverRating || rating) >= star
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-gray-300"
                        )}
                        onMouseEnter={() => setHoverRating(star)}
                        onClick={() => setRating(star)}
                     />
                  ))}
               </div>
            </div>
            <div>
               <Label htmlFor="review-title">Review Title</Label>
               <Input
                  id="review-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Great Product!"
                  className="mt-2"
               />
            </div>
            <div>
               <Label htmlFor="review-content">Your Review</Label>
               <Textarea
                  id="review-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Tell us what you think..."
                  className="mt-2 min-h-[120px]"
               />
            </div>
            <div>
               <Label>Review Image (Optional)</Label>
               <div className="mt-2">
                  {!imagePreview ? (
                     <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                        <input
                           type="file"
                           accept="image/*"
                           onChange={handleImageChange}
                           className="hidden"
                           id="review-image"
                        />
                        <label
                           htmlFor="review-image"
                           className="cursor-pointer"
                        >
                           <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                           <p className="text-sm text-gray-600">
                              Click to upload an image
                           </p>
                           <p className="text-xs text-gray-500 mt-1">
                              Max 5MB, JPG, PNG, GIF
                           </p>
                        </label>
                     </div>
                  ) : (
                     <div className="relative">
                        <Image
                           src={imagePreview}
                           alt="Review preview"
                           width={200}
                           height={200}
                           className="rounded-lg object-cover"
                        />
                        <Button
                           type="button"
                           variant="destructive"
                           size="icon"
                           className="absolute -top-2 -right-2 h-6 w-6"
                           onClick={removeImage}
                        >
                           <X className="h-3 w-3" />
                        </Button>
                     </div>
                  )}
               </div>
            </div>
            <Button
               onClick={handleSubmit}
               disabled={isSubmitting}
               className="bg-gradient-to-r from-orange-500 to-orange-600 text-white"
            >
               {isSubmitting ? "Submitting..." : "Submit Review"}
            </Button>
         </CardContent>
      </Card>
   );
}

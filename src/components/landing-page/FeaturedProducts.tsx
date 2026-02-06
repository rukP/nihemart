'use client';
import { FC, useState, useEffect, useMemo } from 'react';
import MaxWidthWrapper from '../MaxWidthWrapper';
import { Button } from '../ui/button';
import { useMediaQuery } from '@/hooks/user-media-query';
import {
  fetchAllStoreProductsCached,
  fetchStoreCategories,
  type StoreProduct,
  type StoreCategorySimple,
} from '@/lib/api/products';
import Link from 'next/link';
import Image from 'next/image';
import { optimizeImageUrl, isLocalhostUrl } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { WishlistButton } from '../ui/wishlist-button';

// ✅ Import Carousel
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';

interface FeaturedProductsProps {}

const promos = [
  'Delivery is only 40 mins in Kigali',
  'Delivery is only 40 mins in Kigali',
  'Delivery is only 40 mins in Kigali',
  'Delivery is only 40 mins in Kigali',
];

// ProductCard with separate mobile and desktop UI
const ProductCard = ({ product }: { product: StoreProduct }) => (
  <Link
    href={`/products/${product.id}`}
    className="group flex flex-col bg-white rounded-xl overflow-hidden shadow hover:shadow-lg transition-all duration-300 border border-gray-100 h-full relative"
    aria-label={`View details for ${product.name}`}
    tabIndex={0}
  >
    {/* ======== MOBILE LAYOUT ======== */}
    <div className="md:hidden">
      {/* Mobile price badge */}
      <div className="absolute z-20 top-3 flex justify-between w-full px-2">
        <span className="text-white bg-orange-500 my-auto p-1.5 text-center rounded-lg text-sm font-bold">
          RWF{' '}
          {product.minPrice && product.maxPrice
            ? product.minPrice === product.maxPrice
              ? product.minPrice.toLocaleString()
              : `${product.minPrice.toLocaleString()}-${product.maxPrice.toLocaleString()}`
            : product?.price.toLocaleString()}
        </span>
        <WishlistButton
          productId={product.id}
          size="sm"
          variant="ghost"
          className="bg-white/90 backdrop-blur-sm hover:bg-white shadow-sm p-1.5"
        />
      </div>

      {/* Mobile Image */}
      <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl p-4 aspect-square">
        <Image
          src={optimizeImageUrl(product.main_image_url || '/placeholder.svg', {
            width: 800,
            quality: 75,
          })}
          alt={product.name}
          fill
          className="object-cover rounded-lg"
          sizes="(max-width: 768px) 100vw, 33vw"
          unoptimized={isLocalhostUrl(product.main_image_url)}
          // priority
          // loading="eager"
        />
      </div>
    </div>

    {/* ======== DESKTOP LAYOUT ======== */}
    <div className="hidden md:block">
      <div className="p-2">
        <div className="relative mb-4">
          <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl p-4 aspect-square">
            <Image
              src={optimizeImageUrl(
                product?.main_image_url || '/placeholder.svg',
                {
                  width: 900,
                  quality: 80,
                }
              )}
              alt={product?.name}
              fill
              className="object-cover rounded-lg"
              sizes="(max-width: 768px) 100vw, 33vw"
              priority
              loading="eager"
              unoptimized={isLocalhostUrl(product?.main_image_url)}
            />
          </div>
          <div className="absolute z-20 left-3 top-3"></div>
          {/* Wishlist Button */}
          <div className="absolute top-2 right-2">
            <WishlistButton
              productId={product.id}
              size="sm"
              variant="ghost"
              className="bg-white/90 backdrop-blur-sm hover:bg-white shadow-sm p-2"
            />
          </div>
        </div>

        {/* Content */}
        <div className="">
          <p className="font-bold text-orange-500 text-lg">
            {(product as any).minPrice && (product as any).maxPrice
              ? (product as any).minPrice === (product as any).maxPrice
                ? (product as any).minPrice.toLocaleString()
                : `${(product as any).minPrice.toLocaleString()}-${(product as any).maxPrice.toLocaleString()}`
              : product?.price.toLocaleString()}{' '}
            frw
          </p>
          <h3 className="font-semibold text-gray-900 text-sm md:text-lg truncate">
            {product?.name}
          </h3>
        </div>
      </div>
    </div>
  </Link>
);

const FeaturedProducts: FC<FeaturedProductsProps> = () => {
  const { t } = useLanguage();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [categories, setCategories] = useState<StoreCategorySimple[]>([]);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [_offset, setOffset] = useState(0);

  const isDesktop = useMediaQuery('(min-width: 768px)');
  const BUTTONSIZE = isDesktop ? 'lg' : 'sm';
  const MAXFEATURED = 15;

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setLoadingFilters(true);
      try {
        const [cats, all] = await Promise.all([
          fetchStoreCategories(),
          fetchAllStoreProductsCached(),
        ]);
        // Filter products under 15k
        const prods = (all || []).filter((p: any) => {
          const max = p.maxPrice ?? p.max_price ?? p.price ?? 0;
          return Number(max) <= 15000;
        });
        // Randomize products for 'under 15k' (show completely random products)
        const shuffled = (() => {
          const arr = prods.slice();
          for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
          }
          return arr;
        })();

        // Show all products on mobile, cap to MAXFEATURED on desktop
        const visibleProds = isDesktop
          ? shuffled.slice(0, MAXFEATURED)
          : shuffled;
        setProducts(visibleProds);
        setOffset(Math.min(shuffled.length, MAXFEATURED));

        // Show only categories that have products among the visible products
        const visibleCatIds = new Set(
          visibleProds.map((p: any) => p.category?.id).filter(Boolean)
        );
        const filteredCats = (cats || []).filter((c: any) =>
          visibleCatIds.has(c.id)
        );
        setCategories(filteredCats);
      } catch (_error) {
        console.error('Failed to load featured products data:', _error);
      } finally {
        setLoading(false);
        setLoadingFilters(false);
      }
    };
    loadInitialData();
  }, [isDesktop]);

  useEffect(() => {
    if (loadingFilters) return;
    const loadFilteredProducts = async () => {
      setLoading(true);
      try {
        const all = await fetchAllStoreProductsCached();
        const prods = (all || []).filter((p: any) => {
          const max = p.maxPrice ?? p.max_price ?? p.price ?? 0;
          if (selectedCategoryId !== 'all') {
            return (
              Number(max) <= 15000 && p.category?.id === selectedCategoryId
            );
          }
          return Number(max) <= 15000;
        });
        // Sort products: in-stock first, then out-of-stock (better UX)
        const sortedProds = (() => {
          const inStock = prods.filter((p: any) => (p.stock ?? 0) > 0);
          const outOfStock = prods.filter((p: any) => (p.stock ?? 0) <= 0);
          return [...inStock, ...outOfStock];
        })();
        // Show all products on mobile, cap to MAXFEATURED on desktop
        const visibleProds = isDesktop
          ? sortedProds.slice(0, MAXFEATURED)
          : sortedProds;
        setProducts(visibleProds);
        setOffset(Math.min(sortedProds.length, MAXFEATURED));
        // Derive categories from visible products (only those that have visible products)
        const catMap = new Map<string, { id: string; name: string }>();
        visibleProds.forEach((p: any) => {
          if (p.category && p.category.id) {
            catMap.set(p.category.id, {
              id: p.category.id,
              name: p.category.name,
            });
          }
        });
        setCategories(Array.from(catMap.values()));
      } catch (_error) {
        console.error('Failed to filter products:', _error);
      } finally {
        setLoading(false);
      }
    };
    loadFilteredProducts();
  }, [selectedCategoryId, loadingFilters, isDesktop]);

  // Group products into groups of 4 (2 columns x 2 rows)
  const productGroups = useMemo(() => {
    const groups = [];
    for (let i = 0; i < products.length; i += 4) {
      groups.push(products.slice(i, i + 4));
    }
    return groups;
  }, [products]);

  return (
    <MaxWidthWrapper size={'lg'} className="lg:my-14">
      <h3 className="lg:text-4xl md:text-2xl text-xl font-bold text-neutral-900 lg:mb-5">
        {t('home.under')} <span className="text-brand-orange">RWF 15,000</span>
      </h3>

      {/* Category Buttons */}
      <div className="hidden md:flex items-center flex-wrap gap-3 mb-8">
        <Button
          size={BUTTONSIZE}
          className="rounded-full hidden md:block"
          variant={selectedCategoryId === 'all' ? 'default' : 'secondary'}
          onClick={() => setSelectedCategoryId('all')}
        >
          All
        </Button>
        {categories.map(cat => (
          <Button
            size={BUTTONSIZE}
            className="rounded-full hidden md:block"
            key={cat.id}
            variant={selectedCategoryId === cat.id ? 'default' : 'secondary'}
            onClick={() => setSelectedCategoryId(cat.id)}
          >
            {cat.name}
          </Button>
        ))}
      </div>

      {/* ✅ Desktop Grid / ✅ Mobile Carousel with 2 columns x 2 rows */}
      {loading ? (
        <div className="grid grid-cols-2 min-[500px]:grid-cols-3 min-[1000px]:grid-cols-4 xl:grid-cols-5 gap-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="shrink-0 aspect-[9/12] bg-gray-200 rounded-2xl"
            />
          ))}
        </div>
      ) : isDesktop ? (
        <div className="grid grid-cols-2 min-[500px]:grid-cols-3 min-[1000px]:grid-cols-4 xl:grid-cols-5 gap-5">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        // ✅ Mobile: 2 columns x 2 rows carousel (4 products per slide)
        <Carousel
          opts={{ loop: true }}
          plugins={[Autoplay()]}
          className="relative pt-6"
        >
          <CarouselContent>
            {productGroups.map((group, index) => (
              <CarouselItem key={index} className="basis-full">
                <div className="grid grid-cols-2 gap-3 px-3">
                  {group.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 text-orange-500 hover:text-orange-600 bg-white/80 backdrop-blur-sm rounded-full shadow-sm" />
          <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 text-orange-500 hover:text-orange-600 bg-white/80 backdrop-blur-sm rounded-full shadow-sm" />
        </Carousel>
      )}

      {/* Promo Marquee */}
      <div className="bg-brand-orange my-5 sm:my-20 text-white rounded-xl py-2 overflow-hidden">
        <div className="flex items-center">
          {promos.map((promo, i) => (
            <p
              key={`promo1-${i}`}
              className="shrink-0 pl-5 whitespace-nowrap animate-marquee"
            >
              {promo}
            </p>
          ))}
          {promos.map((promo, i) => (
            <p
              key={`promo2-${i}`}
              className="shrink-0 pl-5 whitespace-nowrap animate-marquee"
              style={{ animationDelay: '15s' }}
            >
              {promo}
            </p>
          ))}
        </div>
      </div>
    </MaxWidthWrapper>
  );
};

export default FeaturedProducts;

import { unauthorizedAPI, authorizedAPI } from '@/lib/api';
import handleApiRequest from '@/lib/handleApiRequest';
import type { StoreCategory, StoreSubcategory } from '@/lib/api/products';
import { fetchAllStoreProductsCached } from '@/lib/api/products';

export type { StoreCategory, StoreSubcategory };

export interface StoreProduct {
  id: string;
  name: string;
  description?: string;
  shortDescription?: string;
  short_description?: string;
  price: number;
  compareAtPrice?: number;
  compare_at_price?: number | null;
  sku?: string;
  mainImageUrl?: string;
  main_image_url?: string | null;
  images?: string[];
  stock: number;
  status: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  social_media_link?: string;
  category?: {
    id: string;
    name: string;
    iconUrl?: string;
  };
  subcategory?: {
    id: string;
    name: string;
  };
  variations?: Array<{
    id: string;
    name: string;
    price: number;
    stock: number;
    sku?: string;
    imageUrl?: string;
    url?: string;
    product_variation_id?: string;
  }>;
  reviews?: Array<{
    id: string;
    rating: number;
    comment?: string;
    user?: {
      id: string;
      fullName?: string;
    };
    created_at: string;
  }>;
  averageRating?: number;
  reviewCount?: number;
  product?: StoreProduct; // For nested product references
}

export interface SearchResult {
  id: string;
  name: string;
  price: number;
  mainImageUrl?: string;
  main_image_url?: string;
  short_description?: string;
  category?: {
    id: string;
    name: string;
  };
}

export interface ProductReview {
  id: string;
  rating: number;
  comment?: string;
  title?: string;
  content?: string;
  image_url?: string;
  user?: {
    id: string;
    fullName?: string;
  };
  author?: {
    full_name?: string | null;
  } | null;
  created_at: string;
}

export interface ProductPageData {
  product: StoreProduct;
  variations: Array<{
    id: string;
    name: string;
    price: number;
    stock: number;
    sku?: string;
    imageUrl?: string;
    url?: string;
    product_variation_id?: string;
    attributes: Record<string, string>;
  }>;
  images: Array<string | { url?: string; product_variation_id?: string }>;
  reviews: ProductReview[];
  similarProducts: StoreProduct[];
}

/**
 * Fetch a single product by ID for store
 * - Client: attempt to read from client cache (populated by fetchAllStoreProductsCached)
 * - Server or cache miss: fall back to original API behaviour
 */
export async function fetchStoreProductById(
  productId: string
): Promise<ProductPageData | null> {
  // Try cache first on client
  if (typeof window !== 'undefined') {
    try {
      const all = await fetchAllStoreProductsCached();

      const found = (all || []).find((p: any) => p.id === productId);
      if (found) {
        // Get category IDs from the found product
        let categoryIds: string[] = [];
        if (found.categories && Array.isArray(found.categories)) {
          categoryIds = found.categories
            .map((c: any) => c.id || c)
            .filter(Boolean);
        } else if (found.category?.id) {
          categoryIds = [found.category.id];
        }

        // Find similar products by matching any of the categories
        const similar =
          categoryIds.length > 0
            ? (all || [])
                .filter(
                  (p: any) =>
                    p.id !== productId &&
                    (p.categories && Array.isArray(p.categories)
                      ? p.categories.some((c: any) =>
                          categoryIds.includes(c.id || c)
                        )
                      : p.category?.id && categoryIds.includes(p.category.id))
                )
                .slice(0, 10)
            : [];

        return {
          product: found as any,
          variations: found.variations || [],
          images: found.images || [],
          reviews: found.reviews || [],
          similarProducts: similar as any,
        };
      }
    } catch (_err) {
      // console.warn('store.fetchStoreProductById cache lookup failed', _err);
    }
  }

  // Fallback: original API behaviour (keeps SSR and server paths unchanged)
  try {
    // Try the store-specific endpoint first (existing API)
    let result: any;
    try {
      const response = await unauthorizedAPI.get(
        `/products/store/${productId}`
      );
      result = response.data;
    } catch (err: any) {
      // If the store endpoint returns 404, try the generic product endpoint
      if (err?.response?.status === 404) {
        try {
          const resp2 = await unauthorizedAPI.get(`/products/${productId}`);
          result = resp2.data;
        } catch (err2: any) {
          if (err2?.response?.status === 404) return null;
          throw err2;
        }
      } else {
        // Re-throw other errors from the first attempt
        throw err;
      }
    }

    // Fetch similar products from the same category - using all products list
    let similarProducts = result.similarProducts || [];

    if (!similarProducts || similarProducts.length === 0) {
      try {
        // Get category IDs from various possible locations
        const product = result.product || result;

        let categoryIds: string[] = [];

        // Check for categories (array) first
        if (product?.categories && Array.isArray(product.categories)) {
          categoryIds = product.categories
            .map((c: any) => c.id || c)
            .filter(Boolean);
        }

        // Fallback to single category
        if (categoryIds.length === 0 && product?.category?.id) {
          categoryIds = [product.category.id];
        }

        // Final fallback: try category_id field
        if (categoryIds.length === 0 && product?.category_id) {
          categoryIds = [product.category_id];
        }

        // If we have category IDs, fetch similar products
        if (categoryIds.length > 0) {
          const _categoryParam = categoryIds.join(',');

          try {
            // Fetch all products from cache (client) or API (server)
            let allProducts: any[] = [];

            // Try fetching the full product list
            try {
              const allProductsResponse = await handleApiRequest(() =>
                unauthorizedAPI.get('/products/store?limit=10000&page=1')
              );

              if (Array.isArray(allProductsResponse)) {
                allProducts = allProductsResponse;
              } else if (
                allProductsResponse?.data &&
                Array.isArray(allProductsResponse.data)
              ) {
                allProducts = allProductsResponse.data;
              } else if (
                allProductsResponse &&
                typeof allProductsResponse === 'object'
              ) {
                allProducts = (Object.values(allProductsResponse).find(
                  (v: any) => Array.isArray(v)
                ) || []) as any[];
              }
            } catch (_e) {
              // Failed to fetch products, continue
            }

            // Filter similar products from the list if we got it
            if (allProducts.length > 0) {
              similarProducts = allProducts
                .filter((p: any) => {
                  // Filter out current product
                  if (p.id === productId) return false;

                  // Check if product is in same category
                  if (p.categories && Array.isArray(p.categories)) {
                    return p.categories.some((c: any) =>
                      categoryIds.includes(c.id || c)
                    );
                  } else if (p.category?.id) {
                    return categoryIds.includes(p.category.id);
                  } else if (p.category_id) {
                    return categoryIds.includes(p.category_id);
                  }
                  return false;
                })
                .slice(0, 10);
            }
          } catch (_apiError) {
            // Failed to fetch similar products, continue
          }
        }
      } catch (_error) {
        // Failed to process similar products, continue
      }
    }

    return {
      product: result.product || result,
      variations: result.variations || [],
      images: result.images || [],
      reviews: result.reviews || [],
      similarProducts: similarProducts || [],
    };
  } catch (error: any) {
    // If outer-level catch hits (unexpected), handle 404 gracefully
    if (error?.response?.status === 404) return null;
    throw error;
  }
}

/**
 * Search products by name
 * - Client: use cached full-product list and perform local search
 * - Server: fall back to API
 */
export async function searchProductsByName(
  query: string
): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  // Try server-side search first (works both server and client)
  try {
    const params = new URLSearchParams({
      search: String(query),
      limit: '10',
      page: '1',
    });
    const response = await handleApiRequest(() =>
      unauthorizedAPI.get(`/products/store?${params.toString()}`)
    );

    // Normalize possible response shapes
    let data: any = response?.data ?? response?.products ?? response;
    if (data && data.data && Array.isArray(data.data)) data = data.data;

    if (Array.isArray(data) && data.length > 0) {
      return data.map((p: any) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        mainImageUrl: p.main_image_url ?? p.mainImageUrl,
        main_image_url: p.main_image_url ?? p.mainImageUrl,
        short_description: p.short_description ?? p.shortDescription ?? null,
        category: p.category ?? null,
      }));
    }
  } catch (_err) {
    // If server search fails, fall back to local cached search
    // console.warn('searchProductsByName server search failed', _err);
  }

  // Fallback: client-side cached search (only on client)
  if (typeof window !== 'undefined') {
    try {
      const all = await fetchAllStoreProductsCached();
      const q = (query || '').toLowerCase();
      return (all || [])
        .filter((p: any) => (p.name || '').toLowerCase().includes(q))
        .slice(0, 10)
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          mainImageUrl: p.main_image_url ?? p.mainImageUrl,
          main_image_url: p.main_image_url ?? p.mainImageUrl,
          short_description: p.short_description ?? p.shortDescription ?? null,
          category: p.category || null,
        }));
    } catch (_err) {
      // console.warn('searchProductsByName cache lookup failed', _err);
    }
  }

  return [];
}

/**
 * Get store products with filters
 * - Client: use cached list and perform local filtering/pagination
 * - Server: call API
 */
export async function getStoreProducts(
  options: {
    search?: string;
    categories?: string[];
    subcategories?: string[];
    page?: number;
    limit?: number;
  } = {}
): Promise<{ products: StoreProduct[]; total: number; pages: number }> {
  if (typeof window !== 'undefined') {
    const all = await fetchAllStoreProductsCached();
    let filtered = (all || []).slice();
    if (options.search) {
      const q = options.search.toLowerCase();
      filtered = filtered.filter((p: any) =>
        (p.name || '').toLowerCase().includes(q)
      );
    }
    if (options.categories?.length) {
      filtered = filtered.filter((p: any) =>
        (p.categories || []).some((c: any) =>
          options.categories!.includes(c.id || c)
        )
      );
    }
    if (options.subcategories?.length) {
      filtered = filtered.filter((p: any) =>
        (p.subcategories || []).some((s: any) =>
          options.subcategories!.includes(s.id || s)
        )
      );
    }
    const total = filtered.length;
    const limit = options.limit ?? 10;
    const page = options.page ?? 1;
    const pages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const products = filtered.slice(start, start + limit);
    return { products, total, pages };
  }

  const params = new URLSearchParams();
  if (options.search) params.append('search', options.search);
  if (options.categories) {
    options.categories.forEach(cat => params.append('categories', cat));
  }
  if (options.subcategories) {
    options.subcategories.forEach(sub => params.append('subcategories', sub));
  }
  if (options.page) params.append('page', String(options.page));
  if (options.limit) params.append('limit', String(options.limit));

  return handleApiRequest(() =>
    unauthorizedAPI.get(`/products/store?${params.toString()}`)
  );
}

/**
 * Get landing page products
 * - Client: attempt to return featured products from the cached list
 * - Server: fall back to the landing endpoint
 */
export async function getLandingPageProducts(): Promise<StoreProduct[]> {
  if (typeof window !== 'undefined') {
    try {
      const all = await fetchAllStoreProductsCached();
      return (all || []).filter((p: any) => p.featured).slice(0, 12);
    } catch (_err) {
      // console.warn('getLandingPageProducts cache lookup failed', _err);
    }
  }

  const response = await handleApiRequest(() =>
    unauthorizedAPI.get('/products/landing')
  );
  return response.products || response.data || [];
}

/**
 * Create a product review
 */
export async function createStoreReview(
  productId: string,
  data: {
    rating: number;
    comment?: string;
    title?: string;
    content?: string;
  }
): Promise<ProductReview> {
  return handleApiRequest(() =>
    authorizedAPI.post(`/products/${productId}/reviews`, {
      rating: data.rating,
      comment: data.comment,
      title: data.title,
      content: data.content,
    })
  );
}

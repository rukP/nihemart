import { supabase } from "@/integrations/supabase/client";
import { cache } from "react";

const sb = supabase as any;

// --- TYPES FOR PRODUCT LISTING PAGE ---
export interface StoreProduct {
  id: string;
  name: string;
  price: number;
  minPrice?: number | null;
  maxPrice?: number | null;
  main_image_url: string | null;
  average_rating: number | null;
  review_count: number | null;
  brand: string | null;
  category: { id: string; name: string } | null;
  stock?: number | null | undefined;
}
export interface StoreCategory {
  id: string;
  name: string;
  products_count: number;
}
export interface StoreSubcategory {
  id: string;
  name: string;
  category_id: string;
  products_count: number;
}
export interface StoreFilters {
  categories?: string[];
  subcategories?: string[];
  rating?: number;
}
export interface StoreQueryOptions {
  search?: string;
  filters?: StoreFilters;
  sort?: { column: string; direction: "asc" | "desc" };
  pagination: { page: number; limit: number };
}

// --- TYPES FOR PRODUCT DETAIL PAGE ---
export interface ProductDetail extends StoreProduct {
  description: string | null;
  short_description: string | null;
  compare_at_price: number | null;
  stock?: number | null | undefined;
  social_media_link?: string | null;
}
export interface ProductVariationDetail {
  id: string;
  name: string | null;
  price: number | null;
  stock: number;
  attributes: Record<string, string>;
}
export interface ProductImageDetail {
  id: string;
  url: string;
  product_variation_id: string | null;
}
export interface ProductReview {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  image_url: string | null;
  created_at: string;
  author: { full_name: string | null } | null;
}
export interface ProductPageData {
  product: ProductDetail;
  variations: ProductVariationDetail[];
  images: ProductImageDetail[];
  reviews: ProductReview[];
  similarProducts: StoreProduct[];
}
export interface ReviewBase {
  product_id: string;
  user_id: string;
  rating: number;
  title?: string;
  content?: string;
  image_url?: string;
}
export interface StoreCategorySimple {
  id: string;
  name: string;
}

// --- HELPER FUNCTIONS ---

/**
 * Calculate the min and max price from product variations
 * @param variations Array of product variations with prices
 * @returns Object with minPrice and maxPrice, or null if no variations
 */
function calculatePriceRange(
  variations: any[]
): { minPrice: number; maxPrice: number } | null {
  if (!variations || variations.length === 0) return null;

  const prices = variations
    .map((v) => v.price)
    .filter((p) => p != null && p !== undefined)
    .sort((a, b) => a - b);

  if (prices.length === 0) return null;

  return {
    minPrice: prices[0],
    maxPrice: prices[prices.length - 1],
  };
}

// --- DATA FETCHING FUNCTIONS ---

const applyStoreFilters = (
  query: any,
  { search = "", filters = {} }: Pick<StoreQueryOptions, "search" | "filters">
) => {
  let q = query.in("status", ["active", "out_of_stock"]);

  // Apply category and subcategory filters using junction tables
  if (filters.categories && filters.categories.length > 0) {
    // For category filtering, we need to use a different approach since we're using junction tables
    // This will be handled in the main query function
  }
  if (filters.subcategories && filters.subcategories.length > 0) {
    // For subcategory filtering, we need to use a different approach since we're using junction tables
    // This will be handled in the main query function
  }
  if (filters.rating) {
    q = q.gte("average_rating", filters.rating);
  }

  // Apply search filter - use FTS if available, fallback to ILIKE
  if (search.trim()) {
    // Try FTS first, but since we need to combine with other filters,
    // we'll use a more targeted approach
    q = q.or(
      `name.ilike.%${search.trim()}%,brand.ilike.%${search.trim()}%,short_description.ilike.%${search.trim()}%`
    );
  }

  return q;
};

export const fetchStoreProducts = cache(
  async (
    options: StoreQueryOptions
  ): Promise<{ data: StoreProduct[]; count: number }> => {
    // If filtering by categories or subcategories, we need to use a different approach
    if (
      (options.filters?.categories && options.filters.categories.length > 0) ||
      (options.filters?.subcategories &&
        options.filters.subcategories.length > 0)
    ) {
      // First get product IDs that match the category/subcategory filters
      let productIds: string[] = [];

      if (options.filters.categories && options.filters.categories.length > 0) {
        const { data: catProductIds, error: catError } = await sb
          .from("product_categories")
          .select("product_id")
          .in("category_id", options.filters.categories);

        if (catError) throw catError;
        productIds = (catProductIds || []).map((pc: any) => pc.product_id);
      }

      if (
        options.filters.subcategories &&
        options.filters.subcategories.length > 0
      ) {
        const { data: subProductIds, error: subError } = await sb
          .from("product_subcategories")
          .select("product_id")
          .in("subcategory_id", options.filters.subcategories);

        if (subError) throw subError;
        const subIds = (subProductIds || []).map((ps: any) => ps.product_id);

        // If we have both category and subcategory filters, intersect the results
        if (productIds.length > 0) {
          productIds = productIds.filter((id) => subIds.includes(id));
        } else {
          productIds = subIds;
        }
      }

      if (productIds.length === 0) {
        return { data: [], count: 0 };
      }

      // Now query products with these IDs and apply other filters
      let query = sb
        .from("products")
        .select("id", { count: "exact", head: true })
        .in("id", productIds)
        .in("status", ["active", "out_of_stock"]);

      // Apply other filters
      if (options.filters.rating) {
        query = query.gte("average_rating", options.filters.rating);
      }
      if (options.search && options.search.trim()) {
        const searchTerm = options.search.trim();
        query = query.or(
          `name.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%,short_description.ilike.%${searchTerm}%`
        );
      }

      const { count, error: countError } = await query;
      if (countError) throw countError;

      const from = (options.pagination.page - 1) * options.pagination.limit;
      const to = from + options.pagination.limit - 1;

      // Now get the actual data
      let dataQuery = sb
        .from("products")
        .select(
          "id, name, price, stock, short_description, main_image_url, average_rating, review_count, brand, category:categories(id, name)"
        )
        .in("id", productIds)
        .in("status", ["active", "out_of_stock"]);

      // Apply other filters again
      if (options.filters.rating) {
        dataQuery = dataQuery.gte("average_rating", options.filters.rating);
      }
      if (options.search && options.search.trim()) {
        const searchTerm = options.search.trim();
        dataQuery = dataQuery.or(
          `name.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%,short_description.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await dataQuery
        .order(options.sort?.column || "created_at", {
          ascending: options.sort?.direction === "asc",
        })
        .range(from, to);

      if (error) throw error;

      // Fetch variations for price range calculation
      if (data && data.length > 0) {
        const productIdsForVariations = data.map((p: any) => p.id);
        const { data: variationsData } = await sb
          .from("product_variations")
          .select("product_id, price")
          .in("product_id", productIdsForVariations);

        // Map variations by product_id and calculate price ranges
        const variationsByProduct: { [key: string]: any[] } = {};
        (variationsData || []).forEach((v: any) => {
          if (!variationsByProduct[v.product_id]) {
            variationsByProduct[v.product_id] = [];
          }
          variationsByProduct[v.product_id].push(v);
        });

        // Add price ranges to products
        return {
          data: (data as StoreProduct[]).map((p: any) => {
            const priceRange = calculatePriceRange(variationsByProduct[p.id]);
            return {
              ...p,
              minPrice: priceRange?.minPrice,
              maxPrice: priceRange?.maxPrice,
            };
          }),
          count: count ?? 0,
        };
      }

      return { data: data as StoreProduct[], count: count ?? 0 };
    }

    // Standard query without category/subcategory filtering
    let countQuery = sb
      .from("products")
      .select("id", { count: "exact", head: true });
    // Apply all filters
    countQuery = applyStoreFilters(countQuery, options);

    const { count, error: countError } = await countQuery;
    if (countError) throw countError;

    const from = (options.pagination.page - 1) * options.pagination.limit;
    const to = from + options.pagination.limit - 1;

    // Start the data query chain with a select
    let dataQuery = sb
      .from("products")
      .select(
        "id, name, price, stock, short_description, main_image_url, average_rating, review_count, brand, category:categories(id, name)"
      );
    // Apply all filters again
    dataQuery = applyStoreFilters(dataQuery, options);

    const { data, error } = await dataQuery
      .order(options.sort?.column || "created_at", {
        ascending: options.sort?.direction === "asc",
      })
      .range(from, to);

    if (error) throw error;

    // Fetch variations for price range calculation
    if (data && data.length > 0) {
      const productIds = data.map((p: any) => p.id);
      const { data: variationsData } = await sb
        .from("product_variations")
        .select("product_id, price")
        .in("product_id", productIds);

      // Map variations by product_id and calculate price ranges
      const variationsByProduct: { [key: string]: any[] } = {};
      (variationsData || []).forEach((v: any) => {
        if (!variationsByProduct[v.product_id]) {
          variationsByProduct[v.product_id] = [];
        }
        variationsByProduct[v.product_id].push(v);
      });

      // Add price ranges to products
      return {
        data: (data as StoreProduct[]).map((p: any) => {
          const priceRange = calculatePriceRange(variationsByProduct[p.id]);
          return {
            ...p,
            minPrice: priceRange?.minPrice,
            maxPrice: priceRange?.maxPrice,
          };
        }),
        count: count ?? 0,
      };
    }

    return { data: data as StoreProduct[], count: count ?? 0 };
  }
);

export const fetchStoreFilterData = cache(
  async (): Promise<{ categories: StoreCategory[] }> => {
    const { data, error } = await sb.rpc("get_categories_with_product_count");
    if (error) throw error;
    return { categories: data as StoreCategory[] };
  }
);

export const fetchAllCategoriesWithSubcategories = cache(
  async (): Promise<{
    categories: StoreCategory[];
    subcategories: StoreSubcategory[];
  }> => {
    try {
      const [categoriesRes, subcategoriesRes] = await Promise.all([
        sb.rpc("get_categories_with_product_count"),
        sb.from("subcategories").select("id, name, category_id").order("name"),
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (subcategoriesRes.error) throw subcategoriesRes.error;

      // Add products_count to subcategories (we'll calculate this client-side or set to 0 for now)
      const subcategoriesWithCount = (subcategoriesRes.data || []).map(
        (sub: any) => ({
          ...sub,
          products_count: 0, // We'll calculate this properly later if needed
        })
      );

      return {
        categories: categoriesRes.data as StoreCategory[],
        subcategories: subcategoriesWithCount as StoreSubcategory[],
      };
    } catch (error) {
      console.error("Error in fetchAllCategoriesWithSubcategories:", error);
      throw error;
    }
  }
);
export async function fetchStoreSubcategories(categoryIds: string[] = []) {
  const { data, error } = await sb.rpc("get_subcategories_with_product_count", {
    parent_category_ids: categoryIds,
  });
  if (error) throw error;
  return { subcategories: data as StoreSubcategory[] };
}
export const fetchStoreProductById = cache(
  async (id: string): Promise<ProductPageData | null> => {
    const { data: product, error } = await sb
      .from("products")
      .select(
        `id, name, description, short_description, stock, price, compare_at_price, main_image_url, average_rating, review_count, brand, social_media_link, category:categories(id, name), categories:product_categories(category:categories(id, name)), subcategories:product_subcategories(subcategory:subcategories(id, name))`
      )
      .eq("id", id)
      .in("status", ["active", "out_of_stock"])
      .maybeSingle();
    if (error || !product) {
      return null;
    }

    // Transform the product data to flatten nested relations
    const transformedProduct = {
      ...product,
      categories:
        product.categories?.map((pc: any) => pc.category).filter(Boolean) || [],
      subcategories:
        product.subcategories
          ?.map((ps: any) => ps.subcategory)
          .filter(Boolean) || [],
    };

    const [variationsRes, imagesRes, reviewsRes] = await Promise.all([
      sb
        .from("product_variations")
        .select("id, name, price, stock, attributes")
        .eq("product_id", id),
      sb
        .from("product_images")
        .select("id, url, product_variation_id")
        .eq("product_id", id),
      sb
        .from("reviews")
        .select(
          "id, rating, title, content, image_url, created_at, author:profiles!user_id(full_name)"
        )
        .eq("product_id", id),
    ]);
    if (variationsRes.error) throw variationsRes.error;
    if (imagesRes.error) throw imagesRes.error;
    if (reviewsRes.error) throw reviewsRes.error;

    // Get similar products based on shared categories
    let similarProducts: StoreProduct[] = [];
    const productCategories = transformedProduct.categories;
    if (productCategories && productCategories.length > 0) {
      // Get product IDs that share categories with this product
      const categoryIds = productCategories.map((cat: any) => cat.id);
      const { data: similarProductIds, error: similarError } = await sb
        .from("product_categories")
        .select("product_id")
        .in("category_id", categoryIds)
        .neq("product_id", id);

      if (!similarError && similarProductIds && similarProductIds.length > 0) {
        const uniqueProductIds = [
          ...new Set(similarProductIds.map((sp: any) => sp.product_id)),
        ];

        const { data: similarData } = await sb
          .from("products")
          .select(
            "id, name, price, main_image_url, short_description, average_rating, category:categories(id, name)"
          )
          .in("id", uniqueProductIds)
          .in("status", ["active", "out_of_stock"])
          .limit(6);

        if (similarData && similarData.length > 0) {
          // Fetch variations for price range calculation
          const { data: variationsData } = await sb
            .from("product_variations")
            .select("product_id, price")
            .in("product_id", uniqueProductIds);

          // Map variations by product_id and calculate price ranges
          const variationsByProduct: { [key: string]: any[] } = {};
          (variationsData || []).forEach((v: any) => {
            if (!variationsByProduct[v.product_id]) {
              variationsByProduct[v.product_id] = [];
            }
            variationsByProduct[v.product_id].push(v);
          });

          // Add price ranges to products
          similarProducts = similarData.map((p: any) => {
            const priceRange = calculatePriceRange(variationsByProduct[p.id]);
            return {
              ...p,
              minPrice: priceRange?.minPrice,
              maxPrice: priceRange?.maxPrice,
            };
          });
        }
      }
    }

    return {
      product: transformedProduct as ProductDetail,
      variations: (variationsRes.data || []) as ProductVariationDetail[],
      images: (imagesRes.data || []) as ProductImageDetail[],
      reviews: (reviewsRes.data || []) as ProductReview[],
      similarProducts,
    };
  }
);
export async function createStoreReview(
  reviewData: ReviewBase,
  imageFile?: File
): Promise<ProductReview> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("You must be logged in to leave a review.");
  }
  if (reviewData.user_id !== session.user.id) {
    throw new Error("User ID mismatch.");
  }

  let imageUrl = reviewData.image_url || null;

  // Upload image if provided
  if (imageFile) {
    const fileExt = imageFile.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const { error: uploadError } = await sb.storage
      .from("reviews-images")
      .upload(fileName, imageFile);
    if (uploadError) throw uploadError;

    const { data: urlData } = sb.storage
      .from("reviews-images")
      .getPublicUrl(fileName);
    imageUrl = urlData.publicUrl;
  }

  const reviewToInsert = {
    ...reviewData,
    image_url: imageUrl,
  };

  const { data, error } = await sb
    .from("reviews")
    .insert(reviewToInsert)
    .select("*, author:profiles!user_id(full_name)")
    .single();
  if (error) {
    if (error.code === "23505") {
      throw new Error("You have already submitted a review for this product.");
    }
    throw error;
  }
  return data as ProductReview;
}
export const fetchStoreCategories = cache(
  async (): Promise<StoreCategorySimple[]> => {
    const { data, error } = await sb
      .from("categories")
      .select("id, name")
      .limit(8);
    if (error) throw error;
    return data || [];
  }
);
export const fetchProductsUnder15k = cache(
  async (categoryId?: string): Promise<StoreProduct[]> => {
    let query = sb
      .from("products")
      .select(
        "id, name, price, stock, main_image_url, short_description, average_rating, brand, category:categories(id, name)"
      )
      .in("status", ["active", "out_of_stock"])
      .lte("price", 15000)
      .order("description", { ascending: false })
      .limit(15);
    if (categoryId && categoryId !== "all") {
      query = query.eq("category_id", categoryId);
    }
    const { data, error } = await query;
    if (error) throw error;

    // Fetch variations for price range calculation
    if (data && data.length > 0) {
      const productIds = (data as any[]).map((p) => p.id);
      const { data: variationsData } = await sb
        .from("product_variations")
        .select("product_id, price")
        .in("product_id", productIds);

      // Map variations by product_id and calculate price ranges
      const variationsByProduct: { [key: string]: any[] } = {};
      (variationsData || []).forEach((v: any) => {
        if (!variationsByProduct[v.product_id]) {
          variationsByProduct[v.product_id] = [];
        }
        variationsByProduct[v.product_id].push(v);
      });

      // Add price ranges to products
      return (data as StoreProduct[]).map((p: any) => {
        const priceRange = calculatePriceRange(variationsByProduct[p.id]);
        return {
          ...p,
          minPrice: priceRange?.minPrice,
          maxPrice: priceRange?.maxPrice,
        };
      });
    }

    return data as StoreProduct[];
  }
);
// export async function fetchLandingPageProducts({ categoryId, featured, limit }: { categoryId?: string, featured?: boolean, limit: number }): Promise<StoreProduct[]> {
//     let query = sb.from('products').select('id, name, price, short_description, main_image_url, average_rating, brand, category:categories(id, name)').in('status', ['active', 'out_of_stock']).order('created_at', { ascending: false }).limit(limit);
//     if (featured !== undefined) { query = query.eq('featured', featured); }
//     if (categoryId && categoryId !== 'all') { query = query.eq('category_id', categoryId); }
//     const { data, error } = await query;
//     if (error) throw error;
//     return data as StoreProduct[];
// }

export const fetchLandingPageProducts = cache(
  async ({
    categoryId,
    featured,
    limit,
    offset = 0,
    sortBy,
  }: {
    categoryId?: string;
    featured?: boolean;
    limit: number;
    offset?: number;
    sortBy?: string;
  }): Promise<StoreProduct[]> => {
    let query = sb
      .from("products")
      .select(
        "id, name, price, stock, short_description, main_image_url, average_rating, brand, category:categories(id, name)"
      )
      .in("status", ["active", "out_of_stock"]);

    if (featured !== undefined) {
      query = query.eq("featured", featured);
    }
    if (categoryId && categoryId !== "all") {
      query = query.eq("category_id", categoryId);
    }

    // Apply ordering and pagination
    if (sortBy) {
      // Custom sorting by specified column, with secondary sort by id for stability
      query = query
        .order(sortBy, { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + limit - 1);
    } else {
      // Default to latest ordering
      query = query
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(offset, offset + limit - 1);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Fetch variations for price range calculation
    if (data && data.length > 0) {
      const productIds = (data as any[]).map((p) => p.id);
      const { data: variationsData } = await sb
        .from("product_variations")
        .select("product_id, price")
        .in("product_id", productIds);

      // Map variations by product_id and calculate price ranges
      const variationsByProduct: { [key: string]: any[] } = {};
      (variationsData || []).forEach((v: any) => {
        if (!variationsByProduct[v.product_id]) {
          variationsByProduct[v.product_id] = [];
        }
        variationsByProduct[v.product_id].push(v);
      });

      // Add price ranges to products
      return (data as StoreProduct[]).map((p: any) => {
        const priceRange = calculatePriceRange(variationsByProduct[p.id]);
        return {
          ...p,
          minPrice: priceRange?.minPrice,
          maxPrice: priceRange?.maxPrice,
        };
      });
    }

    return data as StoreProduct[];
  }
);

export interface SearchResult {
  id: string;
  name: string;
  main_image_url: string | null;
  short_description: string | null;
}
export const searchProductsByName = cache(
  async (query: string): Promise<SearchResult[]> => {
    if (!query.trim() || query.trim().length < 2) {
      return [];
    }

    const searchTerm = query.trim();

    // Use the new Full-Text Search RPC function for better relevance and ranking
    const { data, error } = await sb.rpc("search_products_fts", {
      search_term: searchTerm,
    });

    if (error) {
      console.error("Error searching products with FTS:", error);
      // Fallback to basic search if FTS is not available
      const { data: fallbackData, error: fallbackError } = await sb
        .from("products")
        .select("id, name, main_image_url, short_description")
        .in("status", ["active", "out_of_stock"])
        .or(
          `name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,short_description.ilike.%${searchTerm}%,tags.cs.{${searchTerm}}`
        )
        .limit(5);

      if (fallbackError) {
        console.error("Error with fallback search:", fallbackError);
        return [];
      }
      return fallbackData as SearchResult[];
    }

    return data as SearchResult[];
  }
);

export const fetchAllProductIds = cache(async (): Promise<string[]> => {
  const { data, error } = await sb
    .from("products")
    .select("id")
    .in("status", ["active", "out_of_stock"]);

  if (error) throw error;
  return (data || []).map((product: { id: string }) => product.id);
});

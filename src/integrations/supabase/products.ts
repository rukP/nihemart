import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type ProductStatus = "active" | "draft" | "out_of_stock";

export interface ProductBase {
    name: string;
    description?: string | null;
    short_description?: string | null;
    price: number;
    compare_at_price?: number | null;
    cost_price?: number | null;
    sku?: string | null;
    barcode?: string | null;
    weight_kg?: number | null;
    dimensions?: string | null;
    category_id?: string | null;
    subcategory_id?: string | null;
    categories?: string[];
    subcategories?: string[];
    brand?: string | null;
    tags?: string[] | null;
    featured?: boolean;
    status?: ProductStatus;
    track_quantity?: boolean;
    continue_selling_when_oos?: boolean;
    requires_shipping?: boolean;
    taxable?: boolean;
    stock?: number;
    main_image_url?: string | null;
    social_media_link?: string | null;
}

export interface Product
   extends Omit<ProductBase, "categories" | "subcategories"> {
   id: string;
   created_at: string;
   updated_at: string;
   category?: { id: string; name: string } | null;
   subcategory?: { id: string; name: string } | null;
   categories?: { id: string; name: string }[];
   subcategories?: { id: string; name: string }[];
}

export interface ProductImage {
   id: string;
   product_id: string;
   product_variation_id?: string | null;
   url: string;
   is_primary: boolean;
   position: number;
}

export interface ProductVariation {
   id?: string;
   product_id?: string;
   price?: number | null;
   stock?: number;
   sku?: string | null;
   barcode?: string | null;
   attributes: Record<string, string>;
   images?: ProductImage[];
}

export interface ProductVariationInput
   extends Omit<ProductVariation, "images"> {
   imageFiles?: File[];
   existingImages?: ProductImage[];
}

export interface Category {
   id: string;
   name: string;
}
export interface Subcategory {
   id: string;
   name: string;
   category_id: string;
}
export interface CategoryWithSubcategories extends Category {
   subcategories: Subcategory[];
}

export interface ProductListPageFilters {
   search?: string;
   category?: string;
   status?: ProductStatus | "all";
}

export interface ProductQueryOptions {
   filters?: ProductListPageFilters;
   pagination?: {
      page: number;
      limit: number;
   };
   sort?: {
      column: string;
      direction: "asc" | "desc";
   };
}

const uploadFile = async (file: File, bucket: string): Promise<string> => {
   const filePath = `${Date.now()}-${file.name}`;
   const { error } = await sb.storage.from(bucket).upload(filePath, file);
   if (error) throw error;
   const { data } = sb.storage.from(bucket).getPublicUrl(filePath);
   return data.publicUrl;
};

export async function createProductWithImages(
   productData: ProductBase,
   mainImageFiles: File[],
   variationsData: ProductVariationInput[],
   selectedMainImageIndex: number = 0
) {
   const { categories, subcategories, ...productDataWithoutJunctions } =
      productData;

   const mainImageUrls = await Promise.all(
      mainImageFiles.map((file) => uploadFile(file, "product-images"))
   );
   if (mainImageUrls.length > 0) {
      productDataWithoutJunctions.main_image_url =
         mainImageUrls[selectedMainImageIndex] || mainImageUrls[0];
   }

   const { data: createdProduct, error: productError } = await sb
      .from("products")
      .insert(productDataWithoutJunctions)
      .select()
      .single();
   if (productError) throw productError;

   // Insert into junction tables
   if (categories && categories.length > 0) {
      const categoryInserts = categories.map((catId) => ({
         product_id: createdProduct.id,
         category_id: catId,
      }));
      const { error: catError } = await sb
         .from("product_categories")
         .insert(categoryInserts);
      if (catError) throw catError;
   }

   if (subcategories && subcategories.length > 0) {
      const subcategoryInserts = subcategories.map((subId) => ({
         product_id: createdProduct.id,
         subcategory_id: subId,
      }));
      const { error: subError } = await sb
         .from("product_subcategories")
         .insert(subcategoryInserts);
      if (subError) throw subError;
   }

   if (mainImageUrls.length > 0) {
      const mainImagesToInsert = mainImageUrls.map((url, index) => ({
         product_id: createdProduct.id,
         url,
         position: index,
         is_primary: index === selectedMainImageIndex,
      }));
      const { error: mainImagesError } = await sb
         .from("product_images")
         .insert(mainImagesToInsert);
      if (mainImagesError) throw mainImagesError;
   }

   for (const variation of variationsData) {
      const { imageFiles = [], ...variationDetails } = variation;
      const { data: createdVariation, error: variationError } = await sb
         .from("product_variations")
         .insert({ ...variationDetails, product_id: createdProduct.id })
         .select("id")
         .single();
      if (variationError) throw variationError;

      if (imageFiles.length > 0) {
         const variantImageUrls = await Promise.all(
            imageFiles.map((file) => uploadFile(file, "product-images"))
         );
         const variantImagesToInsert = variantImageUrls.map((url, index) => ({
            product_id: createdProduct.id,
            product_variation_id: createdVariation.id,
            url,
            position: index,
         }));
         const { error: variantImagesError } = await sb
            .from("product_images")
            .insert(variantImagesToInsert);
         if (variantImagesError) throw variantImagesError;
      }
   }
   return createdProduct;
}

export async function updateProductWithImages(
   productId: string,
   productData: Partial<ProductBase>,
   mainImages: { url: string; file?: File; isExisting?: boolean }[],
   variationsData: ProductVariationInput[],
   selectedMainImageIndex: number = 0
) {
   console.log("updateProductWithImages called", {
      productId,
      productData,
      mainImagesLength: mainImages.length,
      variationsDataLength: variationsData.length,
   });

   const { categories, subcategories, ...productDataWithoutJunctions } =
      productData;

   await sb.from("product_variations").delete().eq("product_id", productId);
   await sb
      .from("product_images")
      .delete()
      .eq("product_id", productId)
      .neq("product_variation_id", null);

   // Update junction tables
   if (categories !== undefined) {
      await sb.from("product_categories").delete().eq("product_id", productId);
      if (categories.length > 0) {
         const categoryInserts = categories.map((catId) => ({
            product_id: productId,
            category_id: catId,
         }));
         const { error: catError } = await sb
            .from("product_categories")
            .insert(categoryInserts);
         if (catError) throw catError;
      }
   }

   if (subcategories !== undefined) {
      await sb
         .from("product_subcategories")
         .delete()
         .eq("product_id", productId);
      if (subcategories.length > 0) {
         const subcategoryInserts = subcategories.map((subId) => ({
            product_id: productId,
            subcategory_id: subId,
         }));
         const { error: subError } = await sb
            .from("product_subcategories")
            .insert(subcategoryInserts);
         if (subError) throw subError;
      }
   }

   // Separate existing and new images
   const existingImages = mainImages.filter((img) => img.isExisting);
   const newFiles = mainImages
      .filter((img) => img.file)
      .map((img) => img.file!);

   // URLs to keep
   const urlsToKeep = existingImages.map((img) => img.url);

   // Delete removed main images
   if (urlsToKeep.length > 0) {
      await sb
         .from("product_images")
         .delete()
         .eq("product_id", productId)
         .is("product_variation_id", null)
         .not(
            "url",
            "in",
            `(${urlsToKeep.map((url) => `"${url}"`).join(",")})`
         );
   } else {
      await sb
         .from("product_images")
         .delete()
         .eq("product_id", productId)
         .is("product_variation_id", null);
   }

   // Upload new files
   const newImageUrls = await Promise.all(
      newFiles.map((file) => uploadFile(file, "product-images"))
   );

   // Update is_primary for kept existing images
   for (let i = 0; i < existingImages.length; i++) {
      const shouldBePrimary = i === selectedMainImageIndex;
      await sb
         .from("product_images")
         .update({ is_primary: shouldBePrimary })
         .eq("url", existingImages[i].url)
         .eq("product_id", productId);
   }

   // Set main_image_url based on selected image
   if (mainImages.length > 0) {
      const selectedImage = mainImages[selectedMainImageIndex];
      if (selectedImage) {
         if (selectedImage.isExisting) {
            productDataWithoutJunctions.main_image_url = selectedImage.url;
         } else if (
            newImageUrls[selectedMainImageIndex - existingImages.length]
         ) {
            productDataWithoutJunctions.main_image_url =
               newImageUrls[selectedMainImageIndex - existingImages.length];
         }
      }
   }

   const { data: updatedProduct, error: productError } = await sb
      .from("products")
      .update(productDataWithoutJunctions)
      .eq("id", productId)
      .select()
      .single();
   if (productError) throw productError;

   // Insert new images
   if (newImageUrls.length > 0) {
      const imagesToInsert = newImageUrls.map((url, i) => ({
         product_id: productId,
         url,
         position: existingImages.length + i,
         is_primary: existingImages.length + i === selectedMainImageIndex,
      }));
      await sb.from("product_images").insert(imagesToInsert);
   }

   for (const variation of variationsData) {
      const {
         imageFiles = [],
         existingImages = [],
         ...variationDetails
      } = variation;
      const { data: newVar, error: varErr } = await sb
         .from("product_variations")
         .insert({ ...variationDetails, product_id: productId })
         .select("id")
         .single();
      if (varErr) throw varErr;
      if (existingImages.length > 0) {
         const existingImgs = existingImages.map((img, i) => ({
            product_id: productId,
            product_variation_id: newVar.id,
            url: img.url,
            position: i,
            is_primary: false,
         }));
         await sb.from("product_images").insert(existingImgs);
      }
      if (imageFiles.length > 0) {
         const varUrls = await Promise.all(
            imageFiles.map((f) => uploadFile(f, "product-images"))
         );
         const varImgs = varUrls.map((url, i) => ({
            product_id: productId,
            product_variation_id: newVar.id,
            url,
            position: existingImages.length + i,
         }));
         await sb.from("product_images").insert(varImgs);
      }
   }
   return updatedProduct;
}

export async function fetchProductForEdit(id: string) {
   const { data: product, error } = await sb
      .from("products")
      .select("*")
      .eq("id", id)
      .single();
   if (error) throw error;

   // Fetch categories and subcategories
   const { data: productCategories } = await sb
      .from("product_categories")
      .select("category_id")
      .eq("product_id", id);
   const { data: productSubcategories } = await sb
      .from("product_subcategories")
      .select("subcategory_id")
      .eq("product_id", id);

   const { data: images } = await sb
      .from("product_images")
      .select("*")
      .eq("product_id", id)
      .order("position");
   const { data: variations } = await sb
      .from("product_variations")
      .select("*")
      .eq("product_id", id);

   const mainImages = (images || []).filter(
      (img: { product_variation_id: any }) => !img.product_variation_id
   );
   const variationsWithImages = (variations || []).map((v: { id: any }) => ({
      ...v,
      images: (images || []).filter(
         (img: { product_variation_id: any }) =>
            img.product_variation_id === v.id
      ),
   }));

   return {
      product: {
         ...product,
         categories: (productCategories || []).map((pc: any) => pc.category_id),
         subcategories: (productSubcategories || []).map(
            (ps: any) => ps.subcategory_id
         ),
      },
      mainImages,
      variations: variationsWithImages,
   };
}

export async function fetchProductsPage({
   filters = {},
   pagination = { page: 1, limit: 10 },
   sort = { column: "created_at", direction: "desc" },
}: ProductQueryOptions) {
   const from = (pagination.page - 1) * pagination.limit;
   const to = from + pagination.limit - 1;

   // If filtering by category, we need to use a different approach
   if (filters.category && filters.category !== "all") {
      // First get product IDs that belong to the selected category
      const { data: productIds, error: idsError } = await sb
         .from("product_categories")
         .select("product_id")
         .eq("category_id", filters.category);

      if (idsError) throw idsError;

      const ids = productIds?.map((pc: any) => pc.product_id) || [];

      if (ids.length === 0) {
         return { data: [], count: 0 };
      }

      // Now query products with these IDs
      let query = sb
         .from("products")
         .select(
            `
             *,
             category:categories(id, name),
             categories:product_categories(category:categories(id, name)),
             subcategories:product_subcategories(subcategory:subcategories(id, name))
          `,
            { count: "exact" }
         )
         .in("id", ids);

      // Apply other filters
      if (filters.search && filters.search.trim()) {
         const term = `%${filters.search.trim()}%`;
         query = query.or(
            `name.ilike.${term},brand.ilike.${term},sku.ilike.${term}`
         );
      }

      if (filters.status && filters.status !== "all") {
         query = query.eq("status", filters.status);
      }

      // Apply sorting and pagination
      const { data, error, count } = await query
         .order(sort.column, { ascending: sort.direction === "asc" })
         .range(from, to);

      if (error) throw error;

      // Transform the data to flatten the nested relations
      const transformedData = (data || []).map((product: any) => ({
         ...product,
         categories:
            product.categories?.map((pc: any) => pc.category).filter(Boolean) ||
            [],
         subcategories:
            product.subcategories
               ?.map((ps: any) => ps.subcategory)
               .filter(Boolean) || [],
      }));

      return { data: transformedData as Product[], count: count ?? 0 };
   }

   // Standard query without category filtering
   let query = sb.from("products").select(
      `
          *,
          category:categories(id, name),
          categories:product_categories(category:categories(id, name)),
          subcategories:product_subcategories(subcategory:subcategories(id, name))
       `,
      { count: "exact" }
   );

   // Apply filters
   if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      query = query.or(
         `name.ilike.${term},brand.ilike.${term},sku.ilike.${term}`
      );
   }

   if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
   }

   // Apply sorting and pagination
   const { data, error, count } = await query
      .order(sort.column, { ascending: sort.direction === "asc" })
      .range(from, to);

   if (error) throw error;

   // Transform the data to flatten the nested relations
   const transformedData = (data || []).map((product: any) => ({
      ...product,
      categories:
         product.categories?.map((pc: any) => pc.category).filter(Boolean) ||
         [],
      subcategories:
         product.subcategories
            ?.map((ps: any) => ps.subcategory)
            .filter(Boolean) || [],
   }));

   return { data: transformedData as Product[], count: count ?? 0 };
}

export async function fetchAllProductsForExport({
   filters = {},
   sort = { column: "created_at", direction: "desc" },
}: Omit<ProductQueryOptions, "pagination">) {
   // If filtering by category, we need to use a different approach
   if (filters.category && filters.category !== "all") {
      // First get product IDs that belong to the selected category
      const { data: productIds, error: idsError } = await sb
         .from("product_categories")
         .select("product_id")
         .eq("category_id", filters.category);

      if (idsError) throw idsError;

      const ids = productIds?.map((pc: any) => pc.product_id) || [];

      if (ids.length === 0) {
         return [];
      }

      // Now query products with these IDs
      let query = sb
         .from("products")
         .select(
            `
             *,
             category:categories(id, name),
             categories:product_categories(category:categories(id, name)),
             subcategories:product_subcategories(subcategory:subcategories(id, name))
          `
         )
         .in("id", ids);

      // Apply other filters
      if (filters.search && filters.search.trim()) {
         const term = `%${filters.search.trim()}%`;
         query = query.or(
            `name.ilike.${term},brand.ilike.${term},sku.ilike.${term}`
         );
      }

      if (filters.status && filters.status !== "all") {
         query = query.eq("status", filters.status);
      }

      const { data, error } = await query
         .order(sort.column, { ascending: sort.direction === "asc" })
         .limit(5000);

      if (error) throw error;

      // Transform the data to flatten the nested relations
      const transformedData = (data || []).map((product: any) => ({
         ...product,
         categories:
            product.categories?.map((pc: any) => pc.category).filter(Boolean) ||
            [],
         subcategories:
            product.subcategories
               ?.map((ps: any) => ps.subcategory)
               .filter(Boolean) || [],
      }));

      return transformedData as Product[];
   }

   // Standard query without category filtering
   let query = sb.from("products").select(`
          *,
          category:categories(id, name),
          categories:product_categories(category:categories(id, name)),
          subcategories:product_subcategories(subcategory:subcategories(id, name))
       `);

   // Apply filters
   if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      query = query.or(
         `name.ilike.${term},brand.ilike.${term},sku.ilike.${term}`
      );
   }

   if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
   }

   const { data, error } = await query
      .order(sort.column, { ascending: sort.direction === "asc" })
      .limit(5000);

   if (error) throw error;

   // Transform the data to flatten the nested relations
   const transformedData = (data || []).map((product: any) => ({
      ...product,
      categories:
         product.categories?.map((pc: any) => pc.category).filter(Boolean) ||
         [],
      subcategories:
         product.subcategories
            ?.map((ps: any) => ps.subcategory)
            .filter(Boolean) || [],
   }));

   return transformedData as Product[];
}

export async function deleteProduct(id: string) {
   const { error } = await sb.from("products").delete().eq("id", id);
   if (error) throw error;
}

export async function updateProduct(id: string, updates: Partial<ProductBase>) {
   if (Object.keys(updates).length) {
      const { error } = await sb.from("products").update(updates).eq("id", id);
      if (error) throw error;
   }
}

export async function fetchCategories(): Promise<Category[]> {
   const { data, error } = await sb
      .from("categories")
      .select("id, name")
      .order("name");
   if (error) throw error;
   return data || [];
}

export async function fetchCategoriesWithSubcategories(): Promise<
   CategoryWithSubcategories[]
> {
   const { data, error } = await sb
      .from("categories")
      .select(`*, subcategories:subcategories(*)`)
      .order("name");
   if (error) throw error;
   return data || [];
}

export async function createBulkProducts(products: ProductBase[]) {
   const { data, error } = await sb.from("products").insert(products);
   if (error) throw error;
   return data;
}

export async function createProduct(
   product: ProductBase,
   variations?: ProductVariation[]
) {
   const { data, error } = await sb
      .from("products")
      .insert(product)
      .select()
      .single();
   if (error) throw error;

   if (variations && variations.length > 0) {
      const variationsWithProductId = variations.map((v) => ({
         ...v,
         product_id: data.id,
      }));
      const { error: variationsError } = await sb
         .from("product_variations")
         .insert(variationsWithProductId);
      if (variationsError) throw variationsError;
   }

   return data;
}

export interface ProductReview {
   id: string;
   rating: number;
   title: string | null;
   content: string | null;
   image_url: string | null;
   created_at: string;
   author: {
      full_name: string | null;
   } | null;
}

export async function fetchProductWithReviews(productId: string) {
   const { data: product, error: productError } = await sb
      .from("products")
      .select("id, name")
      .eq("id", productId)
      .single();

   if (productError) throw productError;

   const { data: reviews, error: reviewsError } = await sb
      .from("reviews")
      .select(
         "id, rating, title, content, image_url, created_at, author:profiles!user_id(full_name)"
      )
      .eq("product_id", productId)
      .order("created_at", { ascending: false });

   if (reviewsError) throw reviewsError;

   return { product, reviews: reviews as ProductReview[] };
}

export async function deleteReview(reviewId: string) {
   // First, fetch the review to get the image_url
   const { data: review, error: fetchError } = await sb
      .from("reviews")
      .select("image_url")
      .eq("id", reviewId)
      .single();

   if (fetchError) throw fetchError;

   // If there's an image, delete it from storage
   if (review?.image_url) {
      try {
         // Extract the file path from the URL
         const urlParts = review.image_url.split("/");
         const fileName = urlParts[urlParts.length - 1];

         if (fileName) {
            const { error: storageError } = await sb.storage
               .from("reviews-images")
               .remove([fileName]);

            if (storageError) {
               console.warn(
                  "Failed to delete review image from storage:",
                  storageError
               );
               // Don't throw here - we still want to delete the review even if image deletion fails
            }
         }
      } catch (storageErr) {
         console.warn("Error deleting review image:", storageErr);
         // Continue with review deletion
      }
   }

   // Delete the review
   const { error } = await sb.from("reviews").delete().eq("id", reviewId);

   if (error) throw error;
}

// Lightweight product fetch for selectors to avoid heavy joins and timeouts
export async function fetchProductsLight(limit = 500) {
   const { data, error } = await sb
      .from("products")
      .select("id, name, price, main_image_url")
      .order("created_at", { ascending: false })
      .limit(limit);

   if (error) throw error;
   return (data || []) as Product[];
}

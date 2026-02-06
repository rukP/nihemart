'use client';

import React, { use, useEffect, useState } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { fetchProductForEdit } from '@/lib/api/products';
import AddEditProductForm from '@/components/admin/add-edit-product-form';
import { Loader2 } from 'lucide-react';

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const productData = await fetchProductForEdit(id);

        console.log('[EditProductPage] Fetched product data:', productData);

        // FIXED: Check for product data structure - backend returns { product, mainImages, variations, categoryIds, subcategoryIds }
        if (!productData) {
          console.error('[EditProductPage] No product data returned');
          setError('Product not found');
          setLoading(false);
          return;
        }

        // Backend returns the product directly or nested in product field
        const product = productData.product || productData;

        if (!product || !product.id) {
          console.error('[EditProductPage] Invalid product data:', product);
          setError('Invalid product data');
          setLoading(false);
          return;
        }

        // FIXED: Transform backend response to match AddEditProductForm expectations
        // Backend returns: { product, mainImages, variations, categoryIds, subcategoryIds }
        // Form expects: { product: { ...product, categories: [...], subcategories: [...] }, mainImages, variations }
        // The form expects categories/subcategories as arrays of ID strings
        const categoryIds =
          productData.categoryIds ||
          product.categories?.map((cat: any) => {
            if (typeof cat === 'string') return cat;
            // Handle junction table entries: { category: { id, name } } or direct { id }
            return cat.id || cat.category?.id || cat.categoryId;
          }) ||
          [];

        const subcategoryIds =
          productData.subcategoryIds ||
          product.subcategories?.map((sub: any) => {
            if (typeof sub === 'string') return sub;
            // Handle junction table entries: { subcategory: { id, name } } or direct { id }
            return sub.id || sub.subcategory?.id || sub.subcategoryId;
          }) ||
          [];

        const formattedData = {
          product: {
            ...product,
            // FIXED: Set categories and subcategories as arrays of ID strings (form expects this)
            categories: categoryIds,
            subcategories: subcategoryIds,
          },
          mainImages:
            productData.mainImages ||
            productData.images?.filter((img: any) => !img.productVariationId) ||
            [],
          variations: productData.variations || [],
        };

        console.log('[EditProductPage] Formatted data:', formattedData);
        setData(formattedData);
      } catch (error: any) {
        console.error('Error fetching product:', error);
        const errorMessage =
          error?.message || error?.error || 'Failed to load product';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadProduct();
    }
  }, [id]);

  // FIXED: Show proper loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading product...</p>
        </div>
      </div>
    );
  }

  // FIXED: Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4 p-6">
          <p className="text-destructive font-medium">{error}</p>
          <button
            onClick={() => router.back()}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  // FIXED: Show not found if no data
  if (!data || !data.product) {
    notFound();
    return null;
  }

  return <AddEditProductForm initialData={data} />;
}

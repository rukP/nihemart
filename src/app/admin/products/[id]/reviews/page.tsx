'use client';

import React, { use, useEffect, useState } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { fetchProductWithReviews } from '@/lib/api/products';
import ProductReviewsClientPage from './product-reviews-client-page';
import { Loader2 } from 'lucide-react';

export default function ProductReviewsPage({
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
    const loadProductReviews = async () => {
      try {
        setLoading(true);
        setError(null);
        const productData = await fetchProductWithReviews(id);

        // console.log(
        //   '[ProductReviewsPage] Fetched product reviews data:',
        //   productData
        // );

        // FIXED: Check for product data structure - backend returns { product, reviews }
        if (!productData) {
          // console.error('[ProductReviewsPage] No product data returned');
          setError('Product not found');
          setLoading(false);
          return;
        }

        // Backend returns { product: { id, name, ... }, reviews: [...] }
        const product = productData.product;
        const reviews = productData.reviews || [];

        if (!product || !product.id) {
          // console.error('[ProductReviewsPage] Invalid product data:', product);
          setError('Invalid product data');
          setLoading(false);
          return;
        }

        // FIXED: Ensure data structure matches what ProductReviewsClientPage expects
        const formattedData = {
          product: product,
          reviews: reviews,
        };

        // console.log('[ProductReviewsPage] Formatted data:', formattedData);
        setData(formattedData);
      } catch (error: any) {
        // console.error('Error fetching product reviews:', error);
        const errorMessage =
          error?.message || error?.error || 'Failed to load product reviews';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadProductReviews();
    }
  }, [id]);

  // FIXED: Show proper loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading reviews...</p>
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

  return (
    <ProductReviewsClientPage
      productName={data.product.name || 'Unknown Product'}
      initialReviews={data.reviews || []}
    />
  );
}

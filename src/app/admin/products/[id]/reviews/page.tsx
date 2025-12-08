"use client";

import React, { use, useEffect, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import { fetchProductWithReviews } from "@/integrations/supabase/products";
import ProductReviewsClientPage from "./product-reviews-client-page";

export default function ProductReviewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProductReviews = async () => {
      try {
        const productData = await fetchProductWithReviews(id);
        if (!productData || !productData.product) {
          return notFound();
        } else {
          setData(productData);
        }
      } catch (error) {
        console.error("Error fetching product reviews:", error);
        return notFound();
      } finally {
        setLoading(false);
      }
    };

    loadProductReviews();
  }, [id, router]);

  if (loading) return <p className="p-5">Loading reviews...</p>;

  return data ? (
    <ProductReviewsClientPage
      productName={data.product.name}
      initialReviews={data.reviews}
    />
  ) : null;
}

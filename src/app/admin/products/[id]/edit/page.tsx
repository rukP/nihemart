"use client";

import React, { use, useEffect, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import { fetchProductForEdit } from "@/integrations/supabase/products";
import AddEditProductForm from "@/components/admin/add-edit-product-form";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const productData = await fetchProductForEdit(id);
        if (!productData || !productData.product) {
          return notFound()
        } else {
          setData(productData);
        }
      } catch (error) {
        console.error("Error fetching product:", error);
        return notFound()
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id, router]);

  if (loading) return <p className="p-5">Loading...</p>;

  return data ? <AddEditProductForm initialData={data} /> : null;
}

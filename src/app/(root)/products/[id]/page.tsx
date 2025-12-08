import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  fetchStoreProductById,
  fetchAllProductIds,
} from "@/integrations/supabase/store";
import ProductClientPage from "./product-client-page";

// Make this page dynamic to avoid build-time database calls
export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nihemart.rw";

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const resolved = (await params) as { id?: string } | undefined;
  const id = resolved?.id;

  if (!id) notFound();

  const isValidUUID =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      id
    );
  if (!isValidUUID) notFound();

  try {
    const productData = await fetchStoreProductById(id);

    if (!productData || !productData.product) {
      notFound();
    }

    const product = productData.product;
    const title = product.name || "Ibicuruzwa";
    const description =
      product.short_description ||
      product.description ||
      "Reba iyi saha ku bicuruzwa bitandukanye kuri Nihemart.";

    // Resolve image URL (if relative, prefix with BASE_URL)
    let imageUrl = product.main_image_url || `${BASE_URL}/open-graph.png`;
    if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
      // Trim leading slashes to avoid double slashes
      imageUrl = imageUrl.replace(/^\/+/, "");
      imageUrl = `${BASE_URL}/${imageUrl}`;
    }

    const canonical = `${BASE_URL}/products/${id}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: canonical,
        type: "website",
        images: [
          {
            url: imageUrl,
            alt: title,
            width: 1200,
            height: 630,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [imageUrl],
      },
      alternates: {
        canonical,
      },
    };
  } catch (error) {
    // Fallback metadata if product fetch fails
    return {
      title: "Ibicuruzwa - Nihemart",
      description: "Reba iyi saha ku bicuruzwa bitandukanye kuri Nihemart.",
      openGraph: {
        title: "Ibicuruzwa - Nihemart",
        description: "Reba iyi saha ku bicuruzwa bitandukanye kuri Nihemart.",
        type: "website",
        images: [
          {
            url: `${BASE_URL}/open-graph.png`,
            alt: "Ibicuruzwa - Nihemart",
            width: 1200,
            height: 630,
          },
        ],
      },
    };
  }
}

// Generate static params for all products (only if database is available during build)
export async function generateStaticParams() {
  try {
    // Only attempt to fetch product IDs if we have the necessary environment variables
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      console.warn(
        "Supabase environment variables not available during build, skipping static param generation"
      );
      return [];
    }

    const productIds = await fetchAllProductIds();
    return productIds.map((id) => ({
      id: id,
    }));
  } catch (error) {
    console.error("Failed to generate static params for products:", error);
    // Return empty array to prevent build failure, but page will still work with dynamic rendering
    return [];
  }
}

export default async function ProductPage({ params }: any) {
  // Next may provide params as a Promise or undefined during some checks.
  const resolved = (await params) as { id?: string } | undefined;
  const id = resolved?.id;

  if (!id) notFound();

  const isValidUUID =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      id
    );

  if (!isValidUUID) {
    notFound();
  }

  try {
    const productData = await fetchStoreProductById(id);

    if (!productData) {
      notFound();
    }

    return <ProductClientPage initialData={productData} />;
  } catch (error) {
    console.error("Failed to fetch product data:", error);
    // If we can't fetch the product, show not found
    notFound();
  }
}

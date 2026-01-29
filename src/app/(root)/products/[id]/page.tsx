import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  fetchStoreProductById,
} from "@/lib/api/store";
import type { ProductPageData, StoreProduct } from "@/lib/api/store";
import {
  fetchAllProductIds,
} from "@/lib/api/products";
import ProductClientPage from "./product-client-page";

// Allow dynamic params not in generateStaticParams to prevent 404 errors
export const dynamicParams = true;

// Use dynamic rendering with revalidation for better performance
// This ensures all products are accessible while still caching
export const revalidate = 60;

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

    // Handle null return (product not found)
    if (!productData) {
      notFound();
    }

    // Handle both ProductPageData and StoreProduct formats
    const product = 'product' in productData ? productData.product : productData;
    if (!product) {
      notFound();
    }
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
    // Only attempt to fetch product IDs if we have the API base URL
    if (!process.env.NEXT_PUBLIC_API_BASE) {
      console.warn(
        "API base URL not available during build, skipping static param generation"
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

    if (!productData.product) {
      console.error("Product data is missing or invalid:", productData);
      notFound();
    }

    // Ensure product has status property and all required fields
    const pageData: ProductPageData = {
      product: {
        ...productData.product,
        status: (productData.product as any).status || 'active',
      } as any as StoreProduct,
      variations: (productData.variations || []).map((v: any) => ({
        ...v,
        attributes: v.attributes || {},
      })),
      images: productData.images || [],
      reviews: productData.reviews || [],
      similarProducts: (productData as any).similarProducts || [],
    };

    return <ProductClientPage initialData={pageData} />;
  } catch (error: any) {
    console.error("Failed to fetch product data:", error);
    console.error("Error details:", error?.response?.data || error?.message);
    // If we can't fetch the product, show not found
    notFound();
  }
}

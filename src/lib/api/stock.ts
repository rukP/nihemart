import { authorizedAPI } from "@/lib/api";
import handleApiRequest from "@/lib/handleApiRequest";

export interface StockProduct {
  id: string;
  name: string;
  price?: number;
  stock?: number;
  mainImageUrl?: string | null;
  category?: {
    id: string;
    name: string;
  } | null;
  variations: {
    id: string;
    name: string | null;
    stock: number;
    price?: number;
    attributes: Record<string, string>;
  }[];
}

export interface StockHistoryItem {
  id: string;
  createdAt: string;
  change: number;
  newQuantity: number;
  reason: string | null;
  user: {
    fullName: string | null;
  } | null;
}

export interface StockHistoryWithDetails {
  id: string;
  createdAt: string;
  change: number;
  newQuantity: number;
  reason: string | null;
  product: {
    id: string;
    name: string;
  } | null;
  variation: {
    id: string;
    name: string | null;
  } | null;
  user: {
    id: string;
    fullName: string | null;
  } | null;
}

export interface UpdateStockRequest {
  productId: string;
  variationId?: string | null;
  change: number;
  reason: string;
}

// Helper to convert relative image URLs to absolute backend URLs
function getAbsoluteImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  // If already absolute, return as is
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // Convert relative path to absolute URL using backend API base
  const apiBase =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_API_BASE ||
        process.env.NEXT_PUBLIC_API_URL ||
        "https://api.nihemart.rw/api"
      : "https://api.nihemart.rw/api";

  // Remove /api suffix if present to get base backend URL
  const backendBase = apiBase.replace(/\/api$/, "");
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${backendBase}${cleanPath}`;
}

// Transform backend camelCase to frontend snake_case for compatibility
function transformStockProduct(product: any): StockProduct {
  const imageUrl = product.mainImageUrl || product.main_image_url || null;
  const absoluteImageUrl = getAbsoluteImageUrl(imageUrl);

  const transformed: any = {
    id: product.id,
    name: product.name,
    price: product.price,
    stock: product.stock,
    mainImageUrl: absoluteImageUrl,
    category: product.category
      ? {
          id: product.category.id,
          name: product.category.name,
        }
      : null,
    variations: (product.variations || []).map((v: any) => ({
      id: v.id,
      name: v.name,
      stock: v.stock,
      price: v.price,
      attributes: v.attributes || {},
    })),
  };
  // Also include snake_case version for backward compatibility
  transformed.main_image_url = absoluteImageUrl;
  return transformed as StockProduct;
}

function transformStockHistoryItem(item: any): StockHistoryItem {
  return {
    id: item.id,
    createdAt: item.createdAt || item.created_at,
    change: item.change,
    newQuantity: item.newQuantity || item.new_quantity,
    reason: item.reason,
    user: item.user
      ? {
          fullName: item.user.fullName || item.user.full_name,
        }
      : null,
  };
}

function transformStockHistoryWithDetails(item: any): StockHistoryWithDetails {
  return {
    id: item.id,
    createdAt: item.createdAt || item.created_at,
    change: item.change,
    newQuantity: item.newQuantity || item.new_quantity,
    reason: item.reason,
    product: item.product
      ? {
          id: item.product.id,
          name: item.product.name,
        }
      : null,
    variation: item.variation
      ? {
          id: item.variation.id,
          name: item.variation.name,
        }
      : null,
    user: item.user
      ? {
          id: item.user.id,
          fullName: item.user.fullName || item.user.full_name,
        }
      : null,
  };
}

export async function fetchProductsForStockManagement(
  search: string = "",
): Promise<StockProduct[]> {
  const params = new URLSearchParams();
  if (search.trim()) {
    params.append("search", search.trim());
  }

  const result = await handleApiRequest(() =>
    authorizedAPI.get(
      `/stock/products${params.toString() ? `?${params.toString()}` : ""}`,
    ),
  );

  return Array.isArray(result)
    ? result.map(transformStockProduct)
    : (result?.data || []).map(transformStockProduct);
}

export async function updateStockLevel({
  productId,
  variationId,
  change,
  reason,
}: {
  productId: string;
  variationId: string;
  change: number;
  reason: string;
}): Promise<number> {
  const result = await handleApiRequest(() =>
    authorizedAPI.post("/stock/variation", {
      productId,
      variationId,
      change,
      reason,
    }),
  );

  return result.newStock || result.new_quantity || 0;
}

export async function updateProductStock({
  productId,
  change,
  reason,
}: {
  productId: string;
  change: number;
  reason: string;
}): Promise<number> {
  const result = await handleApiRequest(() =>
    authorizedAPI.post("/stock/product", {
      productId,
      change,
      reason,
    }),
  );

  return result.newStock || result.new_quantity || 0;
}

export async function fetchStockHistory(
  variationId: string,
): Promise<StockHistoryItem[]> {
  const result = await handleApiRequest(() =>
    authorizedAPI.get(`/stock/history/variation/${variationId}`),
  );

  return Array.isArray(result)
    ? result.map(transformStockHistoryItem)
    : (result?.data || []).map(transformStockHistoryItem);
}

export async function fetchProductStockHistory(
  productId: string,
): Promise<StockHistoryItem[]> {
  const result = await handleApiRequest(() =>
    authorizedAPI.get(`/stock/history/product/${productId}`),
  );

  return Array.isArray(result)
    ? result.map(transformStockHistoryItem)
    : (result?.data || []).map(transformStockHistoryItem);
}

export async function fetchAllStockHistory(
  options: {
    search?: string;
    productId?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<{ data: StockHistoryWithDetails[]; count: number }> {
  const params = new URLSearchParams();
  if (options.search) params.append("search", options.search);
  if (options.productId) params.append("productId", options.productId);
  if (options.userId) params.append("userId", options.userId);
  if (options.dateFrom) params.append("dateFrom", options.dateFrom);
  if (options.dateTo) params.append("dateTo", options.dateTo);
  if (options.limit) params.append("limit", String(options.limit));
  if (options.offset) params.append("offset", String(options.offset));

  const result = await handleApiRequest(() =>
    authorizedAPI.get(
      `/stock/history${params.toString() ? `?${params.toString()}` : ""}`,
    ),
  );

  return {
    data: (result?.data || []).map(transformStockHistoryWithDetails),
    count: result?.count || 0,
  };
}

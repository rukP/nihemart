import { authorizedAPI, unauthorizedAPI } from "@/lib/api";
import handleApiRequest from "@/lib/handleApiRequest";

export interface WishlistItemWithProduct {
  id: string;
  product_id: string;
  user_id: string;
  created_at: string;
  product?: {
    id: string;
    name: string;
    price: number;
    stock?: number;
    mainImageUrl?: string;
  };
}

/**
 * Get user's wishlist
 */
export async function getWishlist(): Promise<WishlistItemWithProduct[]> {
  return handleApiRequest(() => authorizedAPI.get("/users/profile/wishlist"));
}

/**
 * Add product to wishlist
 */
export async function addToWishlist(productId: string): Promise<void> {
  return handleApiRequest(() =>
    authorizedAPI.post("/users/profile/wishlist", { productId }),
  );
}

/**
 * Remove product from wishlist
 */
export async function removeFromWishlist(productId: string): Promise<void> {
  return handleApiRequest(() =>
    authorizedAPI.delete(`/users/profile/wishlist/${productId}`),
  );
}

/**
 * Toggle wishlist item
 */
export async function toggleWishlist(productId: string): Promise<boolean> {
  // Check if item exists first
  const wishlist = await getWishlist();
  const exists = wishlist.some((item) => item.product_id === productId);

  if (exists) {
    await removeFromWishlist(productId);
    return false;
  } else {
    await addToWishlist(productId);
    return true;
  }
}

/**
 * Get wishlist count
 */
export async function getWishlistCount(): Promise<number> {
  const wishlist = await getWishlist();
  return wishlist.length;
}

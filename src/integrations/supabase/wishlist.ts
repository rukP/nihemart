import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/integrations/supabase/products";

const sb = supabase as any;

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
}

export interface WishlistItemWithProduct extends WishlistItem {
  product: Product;
}

// Add product to wishlist
export async function addToWishlist(productId: string): Promise<WishlistItem> {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data, error } = await sb
    .from("wishlist")
    .insert({ product_id: productId, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Remove product from wishlist
export async function removeFromWishlist(productId: string): Promise<void> {
  const { error } = await sb
    .from("wishlist")
    .delete()
    .eq("product_id", productId);

  if (error) throw error;
}

// Check if product is in wishlist
export async function isInWishlist(productId: string): Promise<boolean> {
  const { data, error } = await sb
    .from("wishlist")
    .select("id")
    .eq("product_id", productId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
  return !!data;
}

// Get user's wishlist with products
export async function getWishlist(): Promise<WishlistItemWithProduct[]> {
  const { data, error } = await sb
    .from("wishlist")
    .select(`
      id,
      user_id,
      product_id,
      created_at,
      product:products(*)
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// Get wishlist item count for user
export async function getWishlistCount(): Promise<number> {
  const { count, error } = await sb
    .from("wishlist")
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count || 0;
}

// Toggle product in wishlist (add if not exists, remove if exists)
export async function toggleWishlist(productId: string): Promise<{ added: boolean; item?: WishlistItem }> {
  const isInWishlistAlready = await isInWishlist(productId);

  if (isInWishlistAlready) {
    await removeFromWishlist(productId);
    return { added: false };
  } else {
    const item = await addToWishlist(productId);
    return { added: true, item };
  }
}
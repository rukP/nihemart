"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
  getWishlistCount,
  type WishlistItemWithProduct
} from "@/integrations/supabase/wishlist";

interface WishlistContextType {
  wishlistItems: WishlistItemWithProduct[];
  wishlistCount: number;
  isInWishlist: (productId: string) => boolean;
  addToWishlist: (productId: string) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  toggleWishlist: (productId: string) => Promise<void>;
  refreshWishlist: () => Promise<void>;
  isLoading: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlistItems, setWishlistItems] = useState<WishlistItemWithProduct[]>([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const refreshWishlist = async () => {
    if (!user) {
      setWishlistItems([]);
      setWishlistCount(0);
      return;
    }

    try {
      setIsLoading(true);
      const [items, count] = await Promise.all([
        getWishlist(),
        getWishlistCount()
      ]);
      setWishlistItems(items);
      setWishlistCount(count);
    } catch (error) {
      console.error("Error refreshing wishlist:", error);
      toast.error("Failed to load wishlist");
    } finally {
      setIsLoading(false);
    }
  };

  const isInWishlist = (productId: string): boolean => {
    return wishlistItems.some(item => item.product_id === productId);
  };

  const handleAddToWishlist = async (productId: string) => {
    if (!user) {
      toast.error("Please sign in to add items to your wishlist");
      return;
    }

    try {
      await addToWishlist(productId);
      await refreshWishlist();
      toast.success("Added to wishlist");
    } catch (error: any) {
      console.error("Error adding to wishlist:", error);
      if (error.code === '23505') { // unique constraint violation
        toast.info("Item is already in your wishlist");
      } else {
        toast.error("Failed to add to wishlist");
      }
    }
  };

  const handleRemoveFromWishlist = async (productId: string) => {
    try {
      await removeFromWishlist(productId);
      await refreshWishlist();
      toast.success("Removed from wishlist");
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      toast.error("Failed to remove from wishlist");
    }
  };

  const handleToggleWishlist = async (productId: string) => {
    if (!user) {
      toast.error("Please sign in to manage your wishlist");
      return;
    }

    try {
      const result = await toggleWishlist(productId);
      await refreshWishlist();
      toast.success(result.added ? "Added to wishlist" : "Removed from wishlist");
    } catch (error) {
      console.error("Error toggling wishlist:", error);
      toast.error("Failed to update wishlist");
    }
  };

  useEffect(() => {
    refreshWishlist();
  }, [user]);

  const value: WishlistContextType = {
    wishlistItems,
    wishlistCount,
    isInWishlist,
    addToWishlist: handleAddToWishlist,
    removeFromWishlist: handleRemoveFromWishlist,
    toggleWishlist: handleToggleWishlist,
    refreshWishlist,
    isLoading,
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
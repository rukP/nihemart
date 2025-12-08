"use client";

import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/contexts/WishlistContext";
import { cn } from "@/lib/utils";

interface WishlistButtonProps {
  productId: string;
  className?: string;
  size?: "sm" | "default" | "lg";
  variant?: "ghost" | "outline" | "default";
  showText?: boolean;
}

export function WishlistButton({
  productId,
  className,
  size = "default",
  variant = "ghost",
  showText = false
}: WishlistButtonProps) {
  const { isInWishlist, toggleWishlist, isLoading } = useWishlist();
  const isWishlisted = isInWishlist(productId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(productId);
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={cn(
        "flex items-center gap-2 transition-colors",
        isWishlisted && "text-red-500 hover:text-red-600",
        className
      )}
      onClick={handleClick}
      disabled={isLoading}
    >
      <Heart
        className={cn(
          "h-4 w-4 transition-all",
          isWishlisted && "fill-current"
        )}
      />
      {showText && (
        <span className="text-sm">
          {isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
        </span>
      )}
    </Button>
  );
}
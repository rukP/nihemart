"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star, Trash2, ArrowLeft } from "lucide-react";
import Image from "next/image";

import type { ProductReview } from "@/integrations/supabase/products";
import { deleteReview } from "@/integrations/supabase/products";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface ProductReviewsClientPageProps {
  productName: string;
  initialReviews: ProductReview[];
}

const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={cn("h-4 w-4", i < rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300")} />
    ));
};

export default function ProductReviewsClientPage({ productName, initialReviews }: ProductReviewsClientPageProps) {
  const router = useRouter();
  const [reviews, setReviews] = useState(initialReviews);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (reviewId: string) => {
    setIsDeleting(reviewId);
    const toastId = toast.loading("Deleting review...");
    try {
      await deleteReview(reviewId);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      toast.success("Review deleted successfully.", { id: toastId });
    } catch (error) {
      console.error("Failed to delete review", error);
      toast.error("Failed to delete review.", { id: toastId });
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Reviews for</h1>
            <p className="text-muted-foreground">{productName}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Reviews ({reviews.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reviews.length > 0 ? (
              reviews.map(review => (
                <div key={review.id} className="flex items-start gap-4 p-4 border rounded-lg">
                  <Avatar>
                    <AvatarFallback>{review.author?.full_name?.charAt(0) || 'A'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{review.author?.full_name || 'Anonymous'}</p>
                      <span className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center">{renderStars(review.rating)}</div>
                    {review.image_url && (
                      <div className="mb-2">
                        <Image
                          src={review.image_url}
                          alt="Review image"
                          width={200}
                          height={150}
                          className="rounded-lg object-cover max-w-full h-auto"
                        />
                      </div>
                    )}
                    {review.title && <p className="font-medium">{review.title}</p>}
                    <p className="text-sm text-muted-foreground">{review.content}</p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <Button variant="ghost" size="icon" disabled={isDeleting === review.id}>
                         <Trash2 className="h-4 w-4 text-destructive" />
                       </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete this review.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(review.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No reviews found for this product.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
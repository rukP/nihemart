'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
} from '@/components/ui/alert-dialog';
import {
  Star,
  Search,
  MoreVertical,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
} from 'lucide-react';
import { Review } from '@/lib/api/reviews';
import { deleteReview } from '@/lib/api/reviews';
import { toast } from 'sonner';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface ReviewsTableProps {
  reviews: Review[];
  loading: boolean;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onRefresh?: () => void;
}

export default function ReviewsTable({
  reviews,
  loading,
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onRefresh,
}: ReviewsTableProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [ratingFilter, setRatingFilter] = useState<string>('all');

  const handleDelete = async (reviewId: string) => {
    setIsDeleting(reviewId);
    const toastId = toast.loading('Deleting review...');
    try {
      await deleteReview(reviewId);
      toast.success('Review deleted successfully.', { id: toastId });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['review-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-reviews'] });
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (error: any) {
      console.error('Failed to delete review', error);
      toast.error(error.message || 'Failed to delete review.', { id: toastId });
    } finally {
      setIsDeleting(null);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  const filteredReviews = useMemo(() => {
    if (ratingFilter === 'all') return reviews;
    const rating = parseInt(ratingFilter);
    return reviews.filter((review) => review.rating === rating);
  }, [reviews, ratingFilter]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'bg-green-100 text-green-800';
    if (rating === 3) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ratings</SelectItem>
            <SelectItem value="5">5 Stars</SelectItem>
            <SelectItem value="4">4 Stars</SelectItem>
            <SelectItem value="3">3 Stars</SelectItem>
            <SelectItem value="2">2 Stars</SelectItem>
            <SelectItem value="1">1 Star</SelectItem>
          </SelectContent>
        </Select>
        {ratingFilter !== 'all' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRatingFilter('all')}
            className="h-8"
          >
            <X className="h-4 w-4 mr-2" />
            Clear filter
          </Button>
        )}
        <div className="ml-auto text-sm text-gray-600">
          Showing {filteredReviews.length} of {totalCount} reviews
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Rating</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Review</TableHead>
              <TableHead>Author</TableHead>
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Loading reviews...
                </TableCell>
              </TableRow>
            ) : filteredReviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No reviews found.
                </TableCell>
              </TableRow>
            ) : (
              filteredReviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-1">
                        {renderStars(review.rating)}
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs ${getRatingColor(review.rating)}`}
                      >
                        {review.rating} Star{review.rating !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {review.product?.main_image_url && (
                        <div className="w-10 h-10 relative rounded overflow-hidden">
                          <Image
                            src={review.product.main_image_url}
                            alt={review.product.name}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm text-gray-900">
                          {review.product?.name || 'Unknown Product'}
                        </p>
                        <Button
                          variant="link"
                          className="h-auto p-0 text-xs text-blue-600"
                          onClick={() => router.push(`/admin/products/${review.productId}/edit`)}
                        >
                          View Product
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[400px]">
                    <div className="space-y-1">
                      {review.title && (
                        <p className="font-semibold text-sm text-gray-900">{review.title}</p>
                      )}
                      {review.content && (
                        <p className="text-sm text-gray-600 line-clamp-2">{review.content}</p>
                      )}
                      {review.imageUrl && (
                        <div className="mt-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 text-xs">
                                View Image
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Review Image</DialogTitle>
                                <DialogDescription>
                                  Image attached to this review
                                </DialogDescription>
                              </DialogHeader>
                              <div className="relative w-full h-[400px]">
                                <Image
                                  src={review.imageUrl}
                                  alt="Review image"
                                  fill
                                  className="object-contain"
                                  sizes="(max-width: 768px) 100vw, 400px"
                                />
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {(review.author?.full_name ||
                            review.user?.fullName ||
                            'A')
                            .charAt(0)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {review.author?.full_name || review.user?.fullName || 'Anonymous'}
                        </p>
                        {review.user?.email && (
                          <p className="text-xs text-gray-500">{review.user.email}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                    <br />
                    <span className="text-xs text-gray-500">
                      {new Date(review.createdAt).toLocaleTimeString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setSelectedReview(review)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(`/admin/products/${review.productId}/reviews`)
                          }
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Product Reviews
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-red-600"
                              disabled={isDeleting === review.id}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Review
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete this
                                review.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(review.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Rows per page:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Review Detail Dialog */}
      {selectedReview && (
        <Dialog open={!!selectedReview} onOpenChange={() => setSelectedReview(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review Details</DialogTitle>
              <DialogDescription>Complete review information</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {(selectedReview.author?.full_name ||
                        selectedReview.user?.fullName ||
                        'A')
                        .charAt(0)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">
                      {selectedReview.author?.full_name ||
                        selectedReview.user?.fullName ||
                        'Anonymous'}
                    </p>
                    {selectedReview.user?.email && (
                      <p className="text-sm text-gray-500">{selectedReview.user.email}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    {renderStars(selectedReview.rating)}
                  </div>
                  <Badge
                    variant="outline"
                    className={`mt-1 ${getRatingColor(selectedReview.rating)}`}
                  >
                    {selectedReview.rating} Star{selectedReview.rating !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {selectedReview.product?.main_image_url && (
                  <div className="w-16 h-16 relative rounded overflow-hidden">
                    <Image
                      src={selectedReview.product.main_image_url}
                      alt={selectedReview.product.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                )}
                <div>
                  <p className="font-semibold">{selectedReview.product?.name || 'Unknown Product'}</p>
                  <Button
                    variant="link"
                    className="h-auto p-0 text-sm"
                    onClick={() =>
                      router.push(`/admin/products/${selectedReview.productId}/edit`)
                    }
                  >
                    View Product
                  </Button>
                </div>
              </div>

              {selectedReview.title && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Title</p>
                  <p className="font-semibold">{selectedReview.title}</p>
                </div>
              )}

              {selectedReview.content && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Review</p>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedReview.content}</p>
                </div>
              )}

              {selectedReview.imageUrl && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Image</p>
                  <div className="relative w-full h-[300px] rounded-lg overflow-hidden">
                    <Image
                      src={selectedReview.imageUrl}
                      alt="Review image"
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 400px"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-500">
                  Submitted on {new Date(selectedReview.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}


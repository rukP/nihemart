// Client-side only import
let getAuthToken: (() => string | null) | null = null;
if (typeof window !== 'undefined') {
  try {
    const { useAuthStore } = require('@/store/auth.store');
    getAuthToken = () => useAuthStore.getState().token;
  } catch (_error) {
    // Store not available
  }
}

export interface Review {
  id: string;
  productId: string;
  userId?: string | null;
  rating: number;
  title?: string | null;
  content?: string | null;
  imageUrl?: string | null;
  createdAt: string;
  product?: {
    id: string;
    name: string;
    main_image_url?: string | null;
  };
  user?: {
    id: string;
    fullName?: string | null;
    email?: string | null;
  };
  author?: {
    full_name?: string | null;
  } | null;
}

export interface ReviewFilters {
  rating?: number;
  productId?: string;
  userId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ReviewQueryOptions {
  filters?: ReviewFilters;
  pagination?: {
    page: number;
    limit: number;
  };
  sort?: {
    column: string;
    direction: 'asc' | 'desc';
  };
}

/**
 * Fetch all reviews using the Next.js API route
 */
export async function fetchAllReviews(
  options: ReviewQueryOptions = {}
): Promise<{
  data: Review[];
  count: number;
}> {
  const {
    filters = {},
    pagination = { page: 1, limit: 50 },
    sort = { column: 'created_at', direction: 'desc' },
  } = options;

  try {
    const params = new URLSearchParams();

    if (pagination.page) params.append('page', String(pagination.page));
    if (pagination.limit) params.append('limit', String(pagination.limit));
    if (filters.rating) params.append('rating', String(filters.rating));
    if (filters.productId) params.append('productId', filters.productId);
    if (filters.search) params.append('search', filters.search);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);

    // Map frontend column names to backend
    const columnMap: Record<string, string> = {
      created_at: 'createdAt',
      rating: 'rating',
      product_name: 'product.name',
    };
    const backendColumn = columnMap[sort.column] || sort.column;
    params.append('sortColumn', backendColumn);
    params.append('sortDirection', sort.direction);

    // Get auth token from store (client-side only)
    const token = getAuthToken ? getAuthToken() : null;

    const response = await fetch(`/api/admin/reviews?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch reviews: ${response.statusText}`);
    }

    const result = await response.json();

    // Transform the response to match Review interface
    const reviews: Review[] = (result.data || []).map((review: any) => ({
      id: review.id,
      productId: review.productId || review.product?.id,
      userId: review.userId || review.user?.id || null,
      rating: review.rating,
      title: review.title || null,
      content: review.content || review.comment || null,
      imageUrl: review.imageUrl || review.image_url || null,
      createdAt:
        review.createdAt || review.created_at || new Date().toISOString(),
      product: review.product || null,
      user: review.user || null,
      author: review.author || null,
    }));

    return {
      data: reviews,
      count: result.count || 0,
    };
  } catch (_error) {
    console.error('Error fetching reviews:', _error);
    return { data: [], count: 0 };
  }
}

/**
 * Delete a review
 */
export async function deleteReview(reviewId: string): Promise<void> {
  const { authorizedAPI } = await import('@/lib/api');
  const handleApiRequest = (await import('@/lib/handleApiRequest')).default;
  return handleApiRequest(() => authorizedAPI.delete(`/reviews/${reviewId}`));
}

/**
 * Get review statistics
 */
export async function getReviewStats(): Promise<{
  totalReviews: number;
  averageRating: number;
  ratingDistribution: { [key: number]: number };
  recentReviewsCount: number;
}> {
  try {
    const reviewsResult = await fetchAllReviews({
      pagination: { page: 1, limit: 10000 }, // Get all reviews for stats
    });

    const reviews = reviewsResult.data;
    const totalReviews = reviews.length;

    if (totalReviews === 0) {
      return {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        recentReviewsCount: 0,
      };
    }

    const averageRating =
      reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;

    const ratingDistribution: { [key: number]: number } = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    reviews.forEach(review => {
      ratingDistribution[review.rating] =
        (ratingDistribution[review.rating] || 0) + 1;
    });

    // Recent reviews (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentReviewsCount = reviews.filter(
      review => new Date(review.createdAt) >= sevenDaysAgo
    ).length;

    return {
      totalReviews,
      averageRating,
      ratingDistribution,
      recentReviewsCount,
    };
  } catch (_error) {
    console.error('Error fetching review stats:', _error);
    return {
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      recentReviewsCount: 0,
    };
  }
}

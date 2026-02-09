import { NextRequest, NextResponse } from 'next/server';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://api.nihemart.rw/api';

export async function GET(request: NextRequest) {
  try {
    // Get auth token from request headers
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const rating = searchParams.get('rating')
      ? parseInt(searchParams.get('rating')!)
      : undefined;
    const productId = searchParams.get('productId') || undefined;
    const search = searchParams.get('search') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const sortColumn = searchParams.get('sortColumn') || 'createdAt';
    const sortDirection = searchParams.get('sortDirection') || 'desc';

    // Fetch all products first (with a reasonable limit)
    const productsResponse = await fetch(
      `${API_BASE}/products?page=1&limit=1000&status=all`,
      {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );

    if (!productsResponse.ok) {
      throw new Error(
        `Failed to fetch products: ${productsResponse.statusText}`
      );
    }

    const productsResult = await productsResponse.json();

    const products = productsResult?.data || productsResult || [];
    const allReviews: any[] = [];

    // Fetch reviews for each product
    for (const product of products) {
      try {
        const reviewResponse = await fetch(
          `${API_BASE}/products/${product.id}/reviews`,
          {
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );

        if (!reviewResponse.ok) {
          continue; // Skip products that fail
        }

        const reviewResult = await reviewResponse.json();

        if (reviewResult?.reviews && Array.isArray(reviewResult.reviews)) {
          reviewResult.reviews.forEach((review: any) => {
            allReviews.push({
              ...review,
              productId: product.id,
              product: {
                id: product.id,
                name: product.name,
                main_image_url: product.mainImageUrl || product.main_image_url,
              },
            });
          });
        }
      } catch (_error) {
        // Skip products that fail
        // console.warn(`Failed to fetch reviews for product ${product.id}`);
      }
    }

    // Apply filters
    let filteredReviews = allReviews;

    if (rating) {
      filteredReviews = filteredReviews.filter(r => r.rating === rating);
    }

    if (productId) {
      filteredReviews = filteredReviews.filter(r => r.productId === productId);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredReviews = filteredReviews.filter(
        r =>
          r.product?.name?.toLowerCase().includes(searchLower) ||
          r.title?.toLowerCase().includes(searchLower) ||
          r.content?.toLowerCase().includes(searchLower) ||
          r.author?.full_name?.toLowerCase().includes(searchLower)
      );
    }

    if (dateFrom) {
      filteredReviews = filteredReviews.filter(
        r => new Date(r.createdAt || r.created_at) >= new Date(dateFrom)
      );
    }

    if (dateTo) {
      filteredReviews = filteredReviews.filter(
        r => new Date(r.createdAt || r.created_at) <= new Date(dateTo)
      );
    }

    // Sort
    filteredReviews.sort((a, b) => {
      const aValue = a[sortColumn] || a.createdAt || a.created_at;
      const bValue = b[sortColumn] || b.createdAt || b.created_at;

      if (sortColumn === 'createdAt' || sortColumn === 'created_at') {
        const aDate = new Date(aValue);
        const bDate = new Date(bValue);
        return sortDirection === 'asc'
          ? aDate.getTime() - bDate.getTime()
          : bDate.getTime() - aDate.getTime();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    // Paginate
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedReviews = filteredReviews.slice(startIndex, endIndex);

    return NextResponse.json({
      data: paginatedReviews,
      count: filteredReviews.length,
      page,
      limit,
    });
  } catch (error: any) {
    // console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

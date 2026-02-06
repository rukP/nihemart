'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Search, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import ReviewsOverview from '@/components/admin/reviews-overview';
import ReviewsTable from '@/components/admin/reviews-table';
import { fetchAllReviews, ReviewFilters } from '@/lib/api/reviews';
import { useDebounce } from '@/hooks/use-debounce';

export default function ReviewsPage() {
  return (
    <ProtectedRoute requiredSection="products">
      <ReviewsContent />
    </ProtectedRoute>
  );
}

function ReviewsContent() {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, _setRatingFilter] = useState<number | undefined>(
    undefined
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const filters: ReviewFilters = {
    search: debouncedSearchTerm || undefined,
    rating: ratingFilter,
  };

  const {
    data: reviewsData,
    isLoading: reviewsLoading,
    refetch: refetchReviews,
  } = useQuery({
    queryKey: ['reviews', filters, currentPage, pageSize],
    queryFn: () =>
      fetchAllReviews({
        filters,
        pagination: { page: currentPage, limit: pageSize },
        sort: { column: 'created_at', direction: 'desc' },
      }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
  });

  const reviews = reviewsData?.data || [];
  const totalCount = reviewsData?.count || 0;

  const handleRefresh = () => {
    refetchReviews();
  };

  return (
    <div className="h-[calc(100vh-10rem)] pb-20">
      <div className="bg-gray-50 p-4 sm:p-6 w-full">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
                Product Reviews & Ratings
              </h1>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium self-start">
                Active
              </span>
            </div>
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid !mb-2 w-full grid-cols-2 bg-transparent shadow-none rounded-none p-0">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-transparent border-b data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 shadow-none rounded-none text-sm sm:text-base"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="all-reviews"
                className="data-[state=active]:bg-transparent border-b shadow-none rounded-none data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 text-sm sm:text-base"
              >
                All Reviews
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-10 sm:mt-6">
              <ReviewsOverview onTabChange={setActiveTab} />
            </TabsContent>

            <TabsContent value="all-reviews" className="mt-10 sm:mt-6 w-full">
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search reviews by product, author, or content..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                {/* Reviews Table */}
                <ReviewsTable
                  reviews={reviews}
                  loading={reviewsLoading}
                  totalCount={totalCount}
                  currentPage={currentPage}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={size => {
                    setPageSize(size);
                    setCurrentPage(1); // Reset to first page when changing page size
                  }}
                  onRefresh={handleRefresh}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Star,
  TrendingUp,
  MessageSquare,
  BarChart3,
  MoreHorizontal,
  RefreshCw,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { getReviewStats, fetchAllReviews } from '@/lib/api/reviews';
import { useMemo } from 'react';

const ratingChartConfig = {
  '1': {
    label: '1 Star',
    color: 'hsl(0, 84%, 60%)',
  },
  '2': {
    label: '2 Stars',
    color: 'hsl(25, 95%, 53%)',
  },
  '3': {
    label: '3 Stars',
    color: 'hsl(47, 96%, 53%)',
  },
  '4': {
    label: '4 Stars',
    color: 'hsl(142, 76%, 36%)',
  },
  '5': {
    label: '5 Stars',
    color: 'hsl(142, 76%, 36%)',
  },
} satisfies ChartConfig;

export default function ReviewsOverview({
  onTabChange,
}: {
  onTabChange?: (tab: string) => void;
}) {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['review-stats'],
    queryFn: getReviewStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
  });

  const { data: recentReviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['recent-reviews'],
    queryFn: () =>
      fetchAllReviews({
        pagination: { page: 1, limit: 10 },
        sort: { column: 'created_at', direction: 'desc' },
      }),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const ratingChartData = useMemo(() => {
    if (!stats?.ratingDistribution) return [];

    return Object.entries(stats.ratingDistribution).map(([rating, count]) => ({
      rating: `${rating} Star${rating !== '1' ? 's' : ''}`,
      count,
    }));
  }, [stats?.ratingDistribution]);

  if (statsLoading || reviewsLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-orange-600" />
        <span className="ml-2">Loading reviews...</span>
      </div>
    );
  }

  const metrics = {
    totalReviews: stats?.totalReviews || 0,
    averageRating: stats?.averageRating || 0,
    recentReviewsCount: stats?.recentReviewsCount || 0,
    ratingDistribution: stats?.ratingDistribution || {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    },
  };

  const recentReviews = recentReviewsData?.data || [];

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${
          i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="space-y-6">
      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Reviews */}
        <Card className="bg-white border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Reviews
            </CardTitle>
            <MessageSquare className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {metrics.totalReviews}
            </div>
            <p className="text-xs text-gray-500 mt-1">All time reviews</p>
          </CardContent>
        </Card>

        {/* Average Rating */}
        <Card className="bg-white border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Average Rating
            </CardTitle>
            <Star className="h-5 w-5 text-yellow-600 fill-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {metrics.averageRating.toFixed(1)}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {renderStars(Math.round(metrics.averageRating))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Reviews */}
        <Card className="bg-white border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Recent Reviews
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {metrics.recentReviewsCount}
            </div>
            <p className="text-xs text-gray-500 mt-1">Last 7 days</p>
          </CardContent>
        </Card>

        {/* 5 Star Reviews */}
        <Card className="bg-white border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              5 Star Reviews
            </CardTitle>
            <Star className="h-5 w-5 text-green-600 fill-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics.ratingDistribution[5] || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {metrics.totalReviews > 0
                ? Math.round(
                    ((metrics.ratingDistribution[5] || 0) /
                      metrics.totalReviews) *
                      100
                  )
                : 0}
              % of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rating Distribution Chart */}
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-gray-600">
                Rating Distribution
              </CardTitle>
              <div className="text-lg font-bold mt-2 text-orange-600">
                {metrics.totalReviews} Total Reviews
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>View details</DropdownMenuItem>
                <DropdownMenuItem>Export data</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent>
            <ChartContainer config={ratingChartConfig}>
              <BarChart accessibilityLayer data={ratingChartData} height={200}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="rating"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 12, fill: '#888' }}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
                />
                <Bar
                  dataKey="count"
                  fill="var(--color-5)"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Recent Reviews List */}
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-gray-600">
                Recent Reviews
              </CardTitle>
              <div className="text-lg font-bold mt-2 text-blue-600">
                Latest Customer Feedback
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onTabChange?.('all-reviews')}>
                  View all reviews
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[300px] overflow-y-auto">
              {recentReviews.length > 0 ? (
                recentReviews.slice(0, 5).map(review => (
                  <div
                    key={review.id}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <div className="flex items-center gap-1">
                        {renderStars(review.rating)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {review.product?.name || 'Unknown Product'}
                        </p>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {review.title || review.content || 'No comment'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        by{' '}
                        {review.author?.full_name ||
                          review.user?.fullName ||
                          'Anonymous'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No recent reviews</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500 rounded-full">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  View All Reviews
                </h3>
                <p className="text-sm text-gray-600">
                  Browse and manage all customer reviews
                </p>
              </div>
            </div>
            <Button
              className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => onTabChange?.('all-reviews')}
            >
              Go to All Reviews
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500 rounded-full">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Review Analytics
                </h3>
                <p className="text-sm text-gray-600">
                  Detailed insights and statistics
                </p>
              </div>
            </div>
            <Button
              className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white"
              onClick={() => onTabChange?.('all-reviews')}
            >
              View Analytics
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

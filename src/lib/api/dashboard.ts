import { authorizedAPI } from '../api';
import handleApiRequest from '@/lib/handleApiRequest';

export interface DashboardStats {
  totalRevenue: number;
  totalUsers: number;
  totalOrders: number;
  totalRefunded: number;
  refundedOrders: number;
  activeRiders: number;
  pendingOrders: number;
  completedOrders: number;
}

export interface TopProduct {
  id: string;
  name: string;
  main_image_url?: string;
  order_count: number;
  price: number;
}

export interface DashboardOrdersResponse {
  data: any[];
  count?: number;
}

export interface DashboardUsersResponse {
  data: any[];
  count?: number;
}

// Internal API functions
const dashboardAPI = {
  // Get dashboard stats by aggregating from orders and users
  // Note: Backend may not have a dedicated dashboard endpoint, so we aggregate
  getStats: async (dateFrom?: Date, dateTo?: Date): Promise<DashboardStats> => {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom.toISOString());
    if (dateTo) params.append('dateTo', dateTo.toISOString());
    // Always request a high limit to get all orders for accurate stats
    // Backend defaults to 50 which causes inaccurate "All Time" analytics
    params.append('limit', '100000');

    // Get all orders for stats calculation
    const ordersRes = await handleApiRequest(() =>
      authorizedAPI.get(`/orders/admin/all?${params.toString()}`)
    );

    // Get users count with date filtering for accurate time-based metrics
    const usersParams = new URLSearchParams();
    if (dateFrom) usersParams.append('from_date', dateFrom.toISOString());
    if (dateTo) usersParams.append('to_date', dateTo.toISOString());
    usersParams.append('limit', '1'); // Just need the count

    const usersRes = await handleApiRequest(() =>
      authorizedAPI.get(`/users?${usersParams.toString()}`)
    );

    // Get riders
    const ridersRes = await handleApiRequest(() =>
      authorizedAPI.get('/riders')
    );

    const orders = Array.isArray(ordersRes) ? ordersRes : ordersRes?.data || [];
    const users = usersRes?.users || [];
    const riders = Array.isArray(ridersRes) ? ridersRes : ridersRes?.data || [];

    const totalRevenue = orders
      .filter((order: any) => order.status === 'delivered')
      .reduce((sum: number, order: any) => sum + Number(order.total || 0), 0);

    const totalRefunded = orders
      .filter((order: any) => order.status === 'refunded')
      .reduce((sum: number, order: any) => sum + Number(order.total || 0), 0);

    const refundedOrders = orders.filter(
      (order: any) => order.status === 'refunded'
    ).length;
    const pendingOrders = orders.filter((order: any) =>
      ['pending', 'processing'].includes(order.status || '')
    ).length;
    const completedOrders = orders.filter(
      (order: any) => order.status === 'delivered'
    ).length;
    const activeRiders = riders.filter((rider: any) => rider.active).length;

    return {
      totalRevenue,
      totalUsers: usersRes?.total_count || users.length || 0,
      totalOrders: orders.length,
      totalRefunded,
      refundedOrders,
      activeRiders,
      pendingOrders,
      completedOrders,
    };
  },

  // Get recent orders
  getRecentOrders: async (
    limit: number = 10,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<any[]> => {
    const params = new URLSearchParams();
    params.append('limit', String(limit));
    if (dateFrom) params.append('dateFrom', dateFrom.toISOString());
    if (dateTo) params.append('dateTo', dateTo.toISOString());

    const res = await handleApiRequest(() =>
      authorizedAPI.get(`/orders/admin/all?${params.toString()}`)
    );
    return Array.isArray(res) ? res : res?.data || [];
  },

  // Get recent users
  getRecentUsers: async (limit: number = 5): Promise<any[]> => {
    try {
      const userAPI = (await import('@/lib/api/users')).default;
      const response = await userAPI.getAllUsers({
        limit: limit,
        sortBy: 'recent', // Use sortBy parameter
      });
      // Response can be { users: [...] } or array directly
      return Array.isArray(response) ? response : response.users || [];
    } catch (_error) {
      console.error('Error fetching recent users:', _error);
      return [];
    }
  },

  // Get top products - aggregate from orders and fetch product details
  getTopProducts: async (
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<TopProduct[]> => {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom.toISOString());
      if (dateTo) params.append('dateTo', dateTo.toISOString());
      // Always request a high limit to get all orders for accurate top products
      // Backend defaults to 50 which causes inaccurate "All Time" analytics
      params.append('limit', '100000');

      const ordersRes = await handleApiRequest(() =>
        authorizedAPI.get(`/orders/admin/all?${params.toString()}`)
      );

      const orders = Array.isArray(ordersRes)
        ? ordersRes
        : ordersRes?.data || [];

      // Aggregate products from order items by product ID
      const productCountMap = new Map<string, number>();
      const productIdSet = new Set<string>();

      orders.forEach((order: any) => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            const productId =
              item.productId || item.product?.id || item.product_id;
            if (productId) {
              productIdSet.add(productId);
              const currentCount = productCountMap.get(productId) || 0;
              productCountMap.set(
                productId,
                currentCount + (item.quantity || 1)
              );
            }
          });
        }
      });

      // If no products found, return empty array
      if (productIdSet.size === 0) {
        return [];
      }

      // Fetch product details for the top products
      try {
        const { fetchProductsPage } = await import('@/lib/api/products');
        const productIds = Array.from(productIdSet);

        // Fetch all products we need (we'll filter by IDs in memory since API doesn't support ID filtering)
        const { data: allProducts } = await fetchProductsPage({
          pagination: { page: 1, limit: 500 }, // Fetch more to ensure we get our products
        });

        // Filter to only products we need and enrich with order counts
        const productsWithCounts = allProducts
          .filter((product: any) => productIds.includes(product.id))
          .map((product: any) => ({
            id: product.id,
            name: product.name || 'Unknown Product',
            main_image_url: product.main_image_url,
            order_count: productCountMap.get(product.id) || 0,
            price: product.price || 0,
          }))
          .sort((a: TopProduct, b: TopProduct) => b.order_count - a.order_count)
          .slice(0, 10);

        return productsWithCounts;
      } catch (productError) {
        console.error('Error fetching product details:', productError);
        // Fallback: try to use product info from order items if available
        const fallbackProducts: TopProduct[] = [];
        orders.forEach((order: any) => {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
              const productId =
                item.productId || item.product?.id || item.product_id;
              if (productId && item.product) {
                const existing = fallbackProducts.find(p => p.id === productId);
                if (!existing && fallbackProducts.length < 10) {
                  fallbackProducts.push({
                    id: productId,
                    name:
                      item.product.name ||
                      item.productName ||
                      'Unknown Product',
                    main_image_url:
                      item.product.main_image_url ||
                      item.productImageUrl ||
                      item.product?.image,
                    order_count: productCountMap.get(productId) || 0,
                    price: item.product.price || item.productPrice || 0,
                  });
                }
              }
            });
          }
        });
        return fallbackProducts.sort((a, b) => b.order_count - a.order_count);
      }
    } catch (_error) {
      console.error('Error fetching top products:', _error);
      return [];
    }
  },
};

export default dashboardAPI;

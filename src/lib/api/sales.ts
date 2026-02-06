import { authorizedAPI } from '@/lib/api';
import handleApiRequest from '@/lib/handleApiRequest';

export interface SalesMetrics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalCustomers: number;
  refunds: number;
  refundedOrders: number;
  netRevenue: number;
}

export interface SalesChartData {
  date: string;
  revenue: number;
  orders: number;
  customers: number;
}

export interface SalesByCategory {
  categoryId: string;
  categoryName: string;
  revenue: number;
  orders: number;
  unitsSold: number;
  percentage: number;
}

export interface SalesByProduct {
  productId: string;
  productName: string;
  revenue: number;
  orders: number;
  unitsSold: number;
  averagePrice: number;
}

export interface SalesByRegion {
  region: string;
  revenue: number;
  orders: number;
  customers: number;
  percentage: number;
}

export interface SalesReportOptions {
  dateFrom?: Date;
  dateTo?: Date;
  groupBy?: 'day' | 'week' | 'month';
  includeCategories?: boolean;
  includeProducts?: boolean;
  includeRegions?: boolean;
  limit?: number;
}

export interface SalesReport {
  metrics: SalesMetrics;
  chartData: SalesChartData[];
  categories?: SalesByCategory[];
  topProducts?: SalesByProduct[];
  regions?: SalesByRegion[];
  period: {
    from: Date;
    to: Date;
  };
}

/**
 * Helper function to fetch ALL orders (handles pagination)
 */
async function fetchAllOrders(dateFrom?: Date, dateTo?: Date): Promise<any[]> {
  const params = new URLSearchParams();
  if (dateFrom) {
    // Set to start of day in local timezone
    const fromDate = new Date(dateFrom);
    fromDate.setHours(0, 0, 0, 0);
    params.append('dateFrom', fromDate.toISOString());
  }
  if (dateTo) {
    // Set to end of day in local timezone
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);
    params.append('dateTo', toDate.toISOString());
  }

  let allOrders: any[] = [];
  let page = 1;
  const limit = 100; // Fetch in larger batches
  let hasMore = true;

  while (hasMore) {
    const pageParams = new URLSearchParams(params);
    pageParams.append('page', String(page));
    pageParams.append('limit', String(limit));

    const ordersRes = await handleApiRequest(() =>
      authorizedAPI.get(`/orders/admin/all?${pageParams.toString()}`)
    );

    const orders = Array.isArray(ordersRes) ? ordersRes : ordersRes?.data || [];
    allOrders = allOrders.concat(orders);

    const total =
      ordersRes?.pagination?.total || ordersRes?.count || orders.length;
    const pages = ordersRes?.pagination?.pages || Math.ceil(total / limit);

    if (page >= pages || orders.length < limit) {
      hasMore = false;
    } else {
      page++;
    }
  }

  return allOrders;
}

/**
 * Helper to normalize order status for comparison
 */
function normalizeStatus(status: any): string {
  if (!status) return '';
  return String(status).toLowerCase().trim();
}

/**
 * Get sales metrics for a date range
 */
export async function getSalesMetrics(
  dateFrom?: Date,
  dateTo?: Date
): Promise<SalesMetrics> {
  // Fetch all orders (handles pagination)
  const allOrders = await fetchAllOrders(dateFrom, dateTo);

  // Filter delivered orders (case-insensitive status check)
  const deliveredOrders = allOrders.filter((order: any) => {
    const status = normalizeStatus(order.status || order.Status);
    return status === 'delivered';
  });

  // Filter refunded orders
  const refundedOrders = allOrders.filter((order: any) => {
    const status = normalizeStatus(order.status || order.Status);
    return status === 'refunded';
  });

  // Calculate revenue from delivered orders
  const totalRevenue = deliveredOrders.reduce(
    (sum: number, order: any) => sum + Number(order.total || order.Total || 0),
    0
  );

  // Calculate refunds
  const totalRefunded = refundedOrders.reduce(
    (sum: number, order: any) => sum + Number(order.total || order.Total || 0),
    0
  );

  const totalOrders = deliveredOrders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Get unique customers from delivered orders
  const uniqueCustomers = new Set<string>();
  deliveredOrders.forEach((order: any) => {
    const userId = order.userId || order.user_id || order.userId;
    if (userId) {
      uniqueCustomers.add(String(userId));
    }
  });

  const netRevenue = totalRevenue - totalRefunded;

  return {
    totalRevenue,
    totalOrders,
    averageOrderValue,
    totalCustomers: uniqueCustomers.size,
    refunds: totalRefunded,
    refundedOrders: refundedOrders.length,
    netRevenue,
  };
}

/**
 * Get sales chart data grouped by day/week/month
 */
export async function getSalesChartData(
  dateFrom: Date,
  dateTo: Date,
  groupBy: 'day' | 'week' | 'month' = 'day'
): Promise<SalesChartData[]> {
  // Fetch all orders (handles pagination)
  const allOrders = await fetchAllOrders(dateFrom, dateTo);

  const deliveredOrders = allOrders.filter((order: any) => {
    const status = normalizeStatus(order.status || order.Status);
    return status === 'delivered';
  });

  // Group orders by date
  const dateGroups = new Map<
    string,
    {
      revenue: number;
      orders: Set<string>;
      customers: Set<string>;
    }
  >();

  deliveredOrders.forEach((order: any) => {
    const orderDate = new Date(
      order.createdAt || order.created_at || order.CreatedAt
    );
    if (isNaN(orderDate.getTime())) return; // Skip invalid dates

    let key: string;

    if (groupBy === 'day') {
      key = orderDate.toISOString().split('T')[0]; // YYYY-MM-DD
    } else if (groupBy === 'week') {
      const weekStart = new Date(orderDate);
      weekStart.setDate(orderDate.getDate() - orderDate.getDay());
      key = `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getTime() - new Date(weekStart.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))).padStart(2, '0')}`;
    } else {
      key = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
    }

    if (!dateGroups.has(key)) {
      dateGroups.set(key, {
        revenue: 0,
        orders: new Set(),
        customers: new Set(),
      });
    }

    const group = dateGroups.get(key)!;
    const orderTotal = Number(order.total || order.Total || 0);
    const orderId = order.id || order.Id || '';
    const userId = order.userId || order.user_id || order.UserId;

    group.revenue += orderTotal;
    if (orderId) {
      group.orders.add(orderId);
    }
    if (userId) {
      group.customers.add(String(userId));
    }
  });

  // Convert to array and sort by date
  const chartData: SalesChartData[] = Array.from(dateGroups.entries())
    .map(([date, data]) => ({
      date,
      revenue: data.revenue,
      orders: data.orders.size,
      customers: data.customers.size,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return chartData;
}

/**
 * Get sales by category
 */
export async function getSalesByCategory(
  dateFrom?: Date,
  dateTo?: Date
): Promise<SalesByCategory[]> {
  // Fetch all orders (handles pagination)
  const allOrders = await fetchAllOrders(dateFrom, dateTo);

  const deliveredOrders = allOrders.filter((order: any) => {
    const status = normalizeStatus(order.status || order.Status);
    return status === 'delivered';
  });

  // Aggregate by category
  const categoryMap = new Map<
    string,
    {
      categoryName: string;
      revenue: number;
      orders: Set<string>;
      units: number;
    }
  >();

  deliveredOrders.forEach((order: any) => {
    const items = order.items || [];
    const orderId = order.id || order.Id || '';

    items.forEach((item: any) => {
      // Order items may not have product details included
      // Try to get category from product if available, otherwise use stored data or default
      const product = item.product || item.Product || {};
      let categoryId =
        product.categoryId ||
        product.category_id ||
        product.category?.id ||
        product.category?.Id ||
        product.categories?.[0]?.category?.id ||
        product.categories?.[0]?.id;
      let categoryName =
        product.category?.name ||
        product.category?.Name ||
        product.categories?.[0]?.category?.name ||
        product.categories?.[0]?.name ||
        product.Category?.name;

      // If no category info available, use uncategorized
      if (!categoryId) {
        categoryId = 'uncategorized';
        categoryName = 'Uncategorized';
      }

      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          categoryName,
          revenue: 0,
          orders: new Set(),
          units: 0,
        });
      }

      const category = categoryMap.get(categoryId)!;
      const itemTotal = Number(
        item.total || item.Total || item.price * (item.quantity || 0) || 0
      );
      const itemQuantity = Number(item.quantity || item.Quantity || 0);

      category.revenue += itemTotal;
      if (orderId) {
        category.orders.add(orderId);
      }
      category.units += itemQuantity;
    });
  });

  const totalRevenue = Array.from(categoryMap.values()).reduce(
    (sum, cat) => sum + cat.revenue,
    0
  );

  const result: SalesByCategory[] = Array.from(categoryMap.entries()).map(
    ([categoryId, data]) => ({
      categoryId,
      categoryName: data.categoryName,
      revenue: data.revenue,
      orders: data.orders.size,
      unitsSold: data.units,
      percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
    })
  );

  return result.sort((a, b) => b.revenue - a.revenue);
}

/**
 * Get top selling products
 */
export async function getTopProducts(
  dateFrom?: Date,
  dateTo?: Date,
  limit: number = 10
): Promise<SalesByProduct[]> {
  // Fetch all orders (handles pagination)
  const allOrders = await fetchAllOrders(dateFrom, dateTo);

  const deliveredOrders = allOrders.filter((order: any) => {
    const status = normalizeStatus(order.status || order.Status);
    return status === 'delivered';
  });

  // Aggregate by product
  const productMap = new Map<
    string,
    {
      productName: string;
      revenue: number;
      orders: Set<string>;
      units: number;
      prices: number[];
    }
  >();

  deliveredOrders.forEach((order: any) => {
    const items = order.items || [];
    const orderId = order.id || order.Id || '';

    items.forEach((item: any) => {
      // Handle multiple formats for product ID and name
      const productId =
        item.productId ||
        item.product_id ||
        item.ProductId ||
        item.product?.id ||
        item.Product?.id ||
        'unknown';
      const productName =
        item.productName ||
        item.product_name ||
        item.ProductName ||
        item.product?.name ||
        item.Product?.name ||
        'Unknown Product';

      if (!productMap.has(productId)) {
        productMap.set(productId, {
          productName,
          revenue: 0,
          orders: new Set(),
          units: 0,
          prices: [],
        });
      }

      const product = productMap.get(productId)!;
      const itemTotal = Number(
        item.total || item.Total || item.price * (item.quantity || 0) || 0
      );
      const quantity = Number(item.quantity || item.Quantity || 0);
      const itemPrice = Number(item.price || item.Price || 0);
      const unitPrice = quantity > 0 ? itemTotal / quantity : itemPrice || 0;

      product.revenue += itemTotal;
      if (orderId) {
        product.orders.add(orderId);
      }
      product.units += quantity;
      if (unitPrice > 0) {
        product.prices.push(unitPrice);
      }
    });
  });

  const result: SalesByProduct[] = Array.from(productMap.entries())
    .map(([productId, data]) => ({
      productId,
      productName: data.productName,
      revenue: data.revenue,
      orders: data.orders.size,
      unitsSold: data.units,
      averagePrice:
        data.prices.length > 0
          ? data.prices.reduce((sum, p) => sum + p, 0) / data.prices.length
          : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);

  return result;
}

/**
 * Get sales by region
 */
export async function getSalesByRegion(
  dateFrom?: Date,
  dateTo?: Date
): Promise<SalesByRegion[]> {
  // Fetch all orders (handles pagination)
  const allOrders = await fetchAllOrders(dateFrom, dateTo);

  const deliveredOrders = allOrders.filter((order: any) => {
    const status = normalizeStatus(order.status || order.Status);
    return status === 'delivered';
  });

  // Aggregate by region (city)
  const regionMap = new Map<
    string,
    {
      revenue: number;
      orders: Set<string>;
      customers: Set<string>;
    }
  >();

  deliveredOrders.forEach((order: any) => {
    const region =
      order.deliveryCity ||
      order.delivery_city ||
      order.DeliveryCity ||
      'Unknown';
    const orderId = order.id || order.Id || '';
    const userId = order.userId || order.user_id || order.UserId;
    const orderTotal = Number(order.total || order.Total || 0);

    if (!regionMap.has(region)) {
      regionMap.set(region, {
        revenue: 0,
        orders: new Set(),
        customers: new Set<string>(),
      });
    }

    const regionData = regionMap.get(region)!;
    regionData.revenue += orderTotal;
    if (orderId) {
      regionData.orders.add(orderId);
    }
    if (userId) {
      regionData.customers.add(String(userId));
    }
  });

  const totalRevenue = Array.from(regionMap.values()).reduce(
    (sum, r) => sum + r.revenue,
    0
  );

  const result: SalesByRegion[] = Array.from(regionMap.entries()).map(
    ([region, data]) => ({
      region,
      revenue: data.revenue,
      orders: data.orders.size,
      customers: data.customers.size,
      percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
    })
  );

  return result.sort((a, b) => b.revenue - a.revenue);
}

/**
 * Generate comprehensive sales report
 */
export async function getSalesReport(
  options: SalesReportOptions
): Promise<SalesReport> {
  const {
    dateFrom,
    dateTo,
    groupBy = 'day',
    includeCategories = true,
    includeProducts = true,
    includeRegions = true,
    limit = 10,
  } = options;

  const from = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = dateTo || new Date();

  // Fetch all data in parallel
  const [metrics, chartData, categories, topProducts, regions] =
    await Promise.all([
      getSalesMetrics(from, to),
      getSalesChartData(from, to, groupBy),
      includeCategories ? getSalesByCategory(from, to) : Promise.resolve([]),
      includeProducts ? getTopProducts(from, to, limit) : Promise.resolve([]),
      includeRegions ? getSalesByRegion(from, to) : Promise.resolve([]),
    ]);

  return {
    metrics,
    chartData,
    categories: includeCategories ? categories : undefined,
    topProducts: includeProducts ? topProducts : undefined,
    regions: includeRegions ? regions : undefined,
    period: {
      from,
      to,
    },
  };
}

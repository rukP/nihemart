import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface StockProduct {
    id: string;
    name: string;
    price?: number;
    stock?: number;
    main_image_url?: string | null;
    category?: {
        id: string;
        name: string;
    } | null;
    variations: {
        id: string;
        name: string | null;
        stock: number;
        price?: number;
        attributes: Record<string, string>;
    }[];
}

export interface StockHistoryItem {
    id: string;
    created_at: string;
    change: number;
    new_quantity: number;
    reason: string | null;
    user: {
        full_name: string | null;
    } | null;
}

export async function fetchProductsForStockManagement(search: string = ''): Promise<StockProduct[]> {
    let query = sb
        .from('products')
        .select('id, name, main_image_url, price, stock, category:categories(id, name), variations:product_variations(id, name, stock, attributes, price)')
        .order('name');

    if (search.trim()) {
        query = query.ilike('name', `%${search.trim()}%`);
    }

    const { data, error } = await query.limit(1000_000); // Limit for performance
    if (error) throw error;
    return data as StockProduct[];
}

export async function fetchStockHistory(variationId: string): Promise<StockHistoryItem[]> {
    const { data, error } = await sb
        .from('stock_history')
        .select('*, user:profiles(full_name)')
        .eq('product_variation_id', variationId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as StockHistoryItem[];
}


export async function updateStockLevel({
    productId,
    variationId,
    change,
    reason
}: {
    productId: string;
    variationId: string;
    change: number;
    reason: string;
}): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await sb.rpc('update_stock_and_log', {
        product_id_in: productId,
        variation_id_in: variationId,
        change_in: change,
        reason_in: reason,
        user_id_in: user.id
    });

    if (error) throw error;
    return data;
}

export interface StockHistoryWithDetails {
    id: string;
    created_at: string;
    change: number;
    new_quantity: number;
    reason: string | null;
    product: {
        id: string;
        name: string;
    } | null;
    variation: {
        id: string;
        name: string | null;
    } | null;
    user: {
        id: string;
        full_name: string | null;
    } | null;
}

export async function fetchAllStockHistory({
    search = '',
    productId,
    userId,
    dateFrom,
    dateTo,
    limit = 50,
    offset = 0
}: {
    search?: string;
    productId?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
} = {}): Promise<{ data: StockHistoryWithDetails[], count: number }> {
    let query = sb
        .from('stock_history')
        .select(`
            id,
            created_at,
            change,
            new_quantity,
            reason,
            product:products(id, name),
            variation:product_variations(id, name),
            user:profiles(id, full_name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (productId) {
        query = query.eq('product_id', productId);
    }

    if (userId) {
        query = query.eq('user_id', userId);
    }

    if (dateFrom) {
        query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
        query = query.lte('created_at', dateTo);
    }

    if (search.trim()) {
        query = query.ilike('reason', `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;
    return {
        data: data as StockHistoryWithDetails[],
        count: count || 0
    };
}

export async function updateProductStock({
    productId,
    change,
    reason
}: {
    productId: string;
    change: number;
    reason: string;
}): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Get current stock
    const { data: product, error: fetchError } = await sb
        .from('products')
        .select('stock')
        .eq('id', productId)
        .single();

    if (fetchError) throw fetchError;

    const currentStock = product.stock || 0;
    const newStock = currentStock + change;

    // Update stock
    const { error: updateError } = await sb
        .from('products')
        .update({ stock: newStock, updated_at: 'now()' })
        .eq('id', productId);

    if (updateError) throw updateError;

    // Log the change
    const { error: logError } = await sb
        .from('stock_history')
        .insert({
            product_id: productId,
            product_variation_id: null,
            user_id: user.id,
            change,
            new_quantity: newStock,
            reason
        });

    if (logError) throw logError;

    return newStock;
}

export async function fetchProductStockHistory(productId: string): Promise<StockHistoryItem[]> {
    const { data, error } = await sb
        .from('stock_history')
        .select('*, user:profiles(full_name)')
        .eq('product_id', productId)
        .is('product_variation_id', null)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as StockHistoryItem[];
}
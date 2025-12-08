import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface Subcategory {
  id: string;
  name: string;
  category_id: string;
  created_at: string;
}

export interface SubcategoryInput {
  name: string;
  category_id: string;
}

export interface SubcategoryQueryOptions {
  category_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function fetchSubcategories({ category_id, search = '', page = 1, limit = 10 }: SubcategoryQueryOptions) {
  let query = sb
    .from('subcategories')
    .select('*');

  if (category_id) {
    query = query.eq('category_id', category_id);
  }

  if (search.trim()) {
    query = query.ilike('name', `%${search.trim()}%`);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.range(from, to).order('created_at', { ascending: false });

  const { data, error, count } = await query;

  if (error) throw error;

  return { data: data as Subcategory[], count: count ?? 0 };
}

export async function createSubcategory(subcategoryData: SubcategoryInput): Promise<Subcategory> {
  const { data, error } = await sb
    .from('subcategories')
    .insert(subcategoryData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSubcategory(id: string, updates: Partial<SubcategoryInput>): Promise<Subcategory> {
  const { data, error } = await sb
    .from('subcategories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSubcategory(id: string): Promise<void> {
  const { error } = await sb
    .from('subcategories')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
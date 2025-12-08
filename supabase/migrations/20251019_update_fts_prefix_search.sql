-- Update FTS function to support prefix matching for partial word searches
-- This allows searching "ca" to find "car", "titan" to find "titanium chain", etc.

create or replace function search_products_fts(
  search_term text
)
returns table (
  id uuid,
  name text,
  main_image_url text,
  short_description text,
  rank real
)
language sql
as $$
  with modified_query as (
    select string_agg(trim(word) || ':*', ' & ') as query
    from unnest(string_to_array(search_term, ' ')) as word
    where trim(word) != ''
  )
  select
    p.id,
    p.name,
    p.main_image_url,
    p.short_description,
    ts_rank_cd(p.fts, to_tsquery('english', (select query from modified_query))) as rank
  from
    products as p
  where
    p.status in ('active', 'out_of_stock') and
    p.fts @@ to_tsquery('english', (select query from modified_query))
  order by
    rank desc
  limit 10;
$$;
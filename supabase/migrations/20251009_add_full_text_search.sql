-- Add Full-Text Search support for products table
-- This migration sets up PostgreSQL FTS for better search relevance and ranking

-- 1. Add a new column to store the searchable text vectors
alter table products
add column fts tsvector;

-- 2. Create a function to update the `fts` column automatically
create or replace function update_products_fts()
returns trigger
language plpgsql
as $$
begin
  new.fts := (
    setweight(to_tsvector('english', coalesce(new.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.short_description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'C') ||
    setweight(to_tsvector('english', array_to_string(new.tags, ' ')), 'A')
  );
  return new;
end;
$$;

-- 3. Create a trigger to run the function whenever a product is inserted or updated
create trigger products_fts_update
before insert or update on products
for each row
execute function update_products_fts();

-- 4. (Optional but recommended) Create an index for fast searching
create index products_fts_idx on products using gin(fts);

-- 5. Back-fill the `fts` column for existing products
update products set fts = (
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(short_description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
  setweight(to_tsvector('english', array_to_string(tags, ' ')), 'A')
);

-- 6. Create the RPC function for FTS search
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
  select
    p.id,
    p.name,
    p.main_image_url,
    p.short_description,
    -- Calculate the rank based on how well it matches
    ts_rank_cd(p.fts, websearch_to_tsquery('english', search_term)) as rank
  from
    products as p
  where
    p.status in ('active', 'out_of_stock') and
    p.fts @@ websearch_to_tsquery('english', search_term)
  order by
    rank desc -- Order by the calculated rank, highest first
  limit 10;
$$;
-- Migration: create RPC to aggregate orders per user
-- Returns rows (user_id uuid, order_count bigint, total_spend numeric)

create or replace function public.get_orders_aggregate_per_user()
returns table(user_id uuid, order_count bigint, total_spend numeric)
language sql
stable
as $$
  select user_id, count(id)::bigint as order_count, coalesce(sum(total),0)::numeric as total_spend
  from public.orders
  group by user_id;
$$;

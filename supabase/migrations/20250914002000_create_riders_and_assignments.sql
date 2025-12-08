-- Migration: create riders table and order_assignments table

create table if not exists public.riders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  full_name text,
  phone text,
  vehicle text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.order_assignments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  rider_id uuid references public.riders(id) on delete set null,
  status text default 'assigned', -- assigned, accepted, rejected, completed
  assigned_at timestamptz default now(),
  responded_at timestamptz,
  notes text
);

create index if not exists idx_order_assignments_order_id on public.order_assignments(order_id);
create index if not exists idx_order_assignments_rider_id on public.order_assignments(rider_id);

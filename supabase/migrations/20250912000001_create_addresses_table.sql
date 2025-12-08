-- Create addresses table
create table public.addresses (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade,
    display_name text not null,
    street text,
    house_number text,
    city text,
    phone text,
    lat text,
    lon text,
    is_default boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies
alter table public.addresses enable row level security;

create policy "Users can view their own addresses"
    on addresses for select
    using ( auth.uid() = user_id );

create policy "Users can insert their own addresses"
    on addresses for insert
    with check ( auth.uid() = user_id );

create policy "Users can update their own addresses"
    on addresses for update
    using ( auth.uid() = user_id );

create policy "Users can delete their own addresses"
    on addresses for delete
    using ( auth.uid() = user_id );

-- Add function to update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql security definer;

-- Add trigger for updated_at
create trigger handle_addresses_updated_at
    before update on public.addresses
    for each row
    execute procedure public.handle_updated_at();

-- Create indexes
create index addresses_user_id_idx on public.addresses(user_id);
create index addresses_is_default_idx on public.addresses(is_default) where is_default = true;

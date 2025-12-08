create table if not exists announcements (
  id serial primary key,
  announcement text not null,
  updated_at timestamptz not null default now()
);

-- Only allow admins to update
-- You can add RLS policies later if needed
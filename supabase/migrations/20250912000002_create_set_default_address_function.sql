-- Function to ensure only one default address per user
create or replace function public.set_default_address()
returns trigger as $$
begin
    if new.is_default then
        -- Set all other addresses for this user to not default
        update public.addresses
        set is_default = false
        where user_id = new.user_id
        and id != new.id;
    end if;
    return new;
end;
$$ language plpgsql security definer;

-- Add trigger to manage default addresses
create trigger handle_default_address
    before insert or update of is_default on public.addresses
    for each row
    execute procedure public.set_default_address();

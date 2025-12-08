export type Address = {
   id: string;
   user_id: string;
   // Friendly display name (e.g. "Home", "Work")
   display_name?: string | null;
   // Legacy / DB column used across the app
   street?: string | null;
   // alternative name used in some places
   street_address?: string | null;
   house_number?: string | null;
   city?: string | null;
   state?: string | null;
   country?: string | null;
   postal_code?: string | null;
   phone?: string | null;
   lat?: string | null;
   lon?: string | null;
   is_default?: boolean;
   created_at?: string | null;
   updated_at?: string | null;
};

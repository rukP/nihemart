const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// Load environment from .env.local if present (Next.js convention), otherwise fall back to .env
const envFiles = [
   path.resolve(process.cwd(), ".env.local"),
   path.resolve(process.cwd(), ".env"),
];
let loaded = null;
for (const p of envFiles) {
   if (fs.existsSync(p)) {
      const result = dotenv.config({ path: p });
      if (!result.error) {
         loaded = p;
         break;
      }
   }
}
if (!loaded) {
   // Last attempt: default dotenv behaviour (loads .env if present)
   dotenv.config();
}

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL =
   process.env.SUPABASE_URL ||
   process.env.NEXT_PUBLIC_SUPABASE_URL ||
   process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
   process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
   console.error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
   );
   console.error("Environment files checked:", envFiles.join(", "));
   console.error("Loaded .env path:", loaded || "none");
   console.error("SUPABASE_URL present:", !!SUPABASE_URL);
   console.error(
      "SUPABASE_SERVICE_ROLE_KEY present:",
      !!SUPABASE_SERVICE_ROLE_KEY
   );
   console.error(
      "If you store secrets in .env.local, ensure you run this script from the project root so the file can be read."
   );
   process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
   auth: { persistSession: false },
});

// Edit these values as needed
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "nihemart@gmail.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "@NiheAdmin1!";
const ADMIN_FULL_NAME = process.env.SEED_ADMIN_FULL_NAME || "Nihemart Admin";
const ADMIN_PHONE = process.env.SEED_ADMIN_PHONE || "0792412177";
const ADMIN_ADDRESS = process.env.SEED_ADMIN_ADDRESS || "N/A";
const ADMIN_CITY = process.env.SEED_ADMIN_CITY || "N/A";

async function run() {
   try {
      console.log("Looking for existing user with email:", ADMIN_EMAIL);

      // Try to find existing user via admin API
      const { data: existingUserData, error: listErr } =
         await supabase.auth.admin.listUsers();
      if (listErr) {
         // The admin.listUsers() may not be supported in all SDK versions; fallback to using SQL if needed
         console.warn(
            "listUsers error (SDK may not support listing):",
            listErr.message || listErr
         );
      }

      let existingUser = null;
      if (existingUserData && Array.isArray(existingUserData.users)) {
         existingUser =
            existingUserData.users.find((u) => u.email === ADMIN_EMAIL) || null;
      }

      if (!existingUser) {
         // Create user
         console.log("Creating user via admin API...");
         const { data, error } = await supabase.auth.admin.createUser({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            email_confirm: true,
            user_metadata: {
               full_name: ADMIN_FULL_NAME,
               phone: ADMIN_PHONE,
               address: ADMIN_ADDRESS,
               city: ADMIN_CITY,
            },
         });

         if (error) {
            console.error("Error creating user:", error.message || error);
            process.exit(1);
         }

         existingUser = data.user || null;
         console.log("Created user id=", existingUser?.id);
      } else {
         console.log("User already exists, id=", existingUser.id);

         // Ensure password is set/updated using admin API
         try {
            console.log("Updating password for existing user...");
            const { data: upd, error: updErr } =
               await supabase.auth.admin.updateUserById(existingUser.id, {
                  password: ADMIN_PASSWORD,
               });
            if (updErr)
               console.warn(
                  "Warning: updateUserById password error:",
                  updErr.message || updErr
               );
         } catch (e) {
            console.warn("updateUserById thrown:", e?.message || e);
         }

         // Update user_metadata
         try {
            const { data: upd2, error: upd2Err } =
               await supabase.auth.admin.updateUserById(existingUser.id, {
                  user_metadata: {
                     full_name: ADMIN_FULL_NAME,
                     phone: ADMIN_PHONE,
                     address: ADMIN_ADDRESS,
                     city: ADMIN_CITY,
                  },
               });
            if (upd2Err)
               console.warn(
                  "Warning: updateUserById metadata error:",
                  upd2Err.message || upd2Err
               );
         } catch (e) {
            console.warn("updateUserById thrown:", e?.message || e);
         }
      }

      const userId = existingUser.id;

      // Upsert profile row in public.profiles
      console.log("Upserting public.profiles for user id:", userId);
      const { error: upsertProfileErr } = await supabase
         .from("profiles")
         .upsert(
            {
               id: userId,
               full_name: ADMIN_FULL_NAME,
               phone: ADMIN_PHONE,
               address: ADMIN_ADDRESS,
               city: ADMIN_CITY,
            },
            { onConflict: "id" }
         )
         .select();

      if (upsertProfileErr) {
         console.error(
            "Error upserting profile:",
            upsertProfileErr.message || upsertProfileErr
         );
         process.exit(1);
      }

      // Upsert admin role in public.user_roles
      console.log("Upserting admin role in public.user_roles");
      const { error: upsertRoleErr } = await supabase
         .from("user_roles")
         .upsert(
            { user_id: userId, role: "admin" },
            { onConflict: "user_id,role" }
         );
      if (upsertRoleErr) {
         console.error(
            "Error upserting user_roles:",
            upsertRoleErr.message || upsertRoleErr
         );
         process.exit(1);
      }

      console.log("✅ Admin seeded successfully:", ADMIN_EMAIL);
      console.log("You can now sign in with that email and password.");
   } catch (err) {
      console.error("Unexpected error:", err?.message || err);
      process.exit(1);
   }
}

run();

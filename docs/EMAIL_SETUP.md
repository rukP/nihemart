# Email / SMTP setup for Nihemart

This document explains the environment variables and steps needed to use the custom SMTP email path implemented in the app.

Features added:

-  Custom SMTP sending via Nodemailer for auth emails (password reset, signup confirmation).
-  Server API: `POST /api/email/send` — accepts `{ email, type }` where `type` is `recovery` or `signup`.
-  Admin rider creation endpoint (`/api/admin/create-rider`) now attempts to send a signup email after creating the rider.
-  Client flows (forgot password and sign-up) call the server API to trigger SMTP emails (best-effort).

Required environment variables

Add these to your `.env.local` (local dev) or your hosting provider's environment:

-  NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
-  NEXT_PUBLIC_SUPABASE_ANON_KEY=<public-anon-key>
-  SUPABASE_SERVICE_ROLE_KEY=<service-role-key> # keep secret
-  NEXT_PUBLIC_APP_URL=http://localhost:3000 # used to build redirect URLs locally

SMTP settings (for Nodemailer)

-  SMTP_HOST=smtp.example.com
-  SMTP_PORT=587
-  SMTP_USER=nihemart@gmail.com
-  SMTP_PASS=<smtp-password-or-app-password>
-  EMAIL_FROM=nihemart@gmail.com # optional, defaults to nihemart@gmail.com

Notes about Gmail

If you use Gmail as your SMTP provider (`smtp.gmail.com`) you will likely need to use an app password (if your account has 2FA). Google has disabled "less secure apps" sign-in for many accounts; using an app password is the recommended approach.

Testing locally

1. Install dependencies: `pnpm install`
2. Add the env vars above to `.env.local`.
3. Start dev server: `pnpm dev`
4. Use the 'Forgot Password' page to request a reset — server logs will indicate if the SMTP send succeeded.

If SMTP isn't configured the server will still generate Supabase action links (password reset / signup links) and return a warning. This lets you test link generation without immediately having SMTP credentials.

Riders and unconfirmed emails

-  The existing admin create-rider flow (server-side) uses the Supabase admin API to create a user and sets `email_confirm: true` which allows rider accounts to sign in immediately even if they haven't confirmed via email.
-  If you want to allow riders who sign up themselves to sign in immediately, we can add a dedicated rider signup endpoint that creates the user via the service role and sets `email_confirm: true`.

Next improvements (optional)

-  Create richer, responsive email templates (MJML or a template system).
-  Disable Supabase built-in emails in the Supabase dashboard to avoid duplicate messages and have full control over templates.
-  Add retries and logging/metrics for failed sends.

If you want, I can implement any of the optional improvements next.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createServiceSupabaseClient } from "@/utils/supabase/service";

export async function updateSession(request: NextRequest) {
   let supabaseResponse = NextResponse.next({
      request,
   });

   const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
         cookies: {
            getAll() {
               return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
               cookiesToSet.forEach(({ name, value, options }) =>
                  request.cookies.set(name, value)
               );
               supabaseResponse = NextResponse.next({
                  request,
               });
               cookiesToSet.forEach(({ name, value, options }) =>
                  supabaseResponse.cookies.set(name, value, options)
               );
            },
         },
      }
   );

   const {
      data: { user },
   } = await supabase.auth.getUser();

   // Define public routes that don't require authentication
   const publicRoutes = [
      "/",
      "/signin",
      "/auth/signin",
      "/products",
      "/products/:path*",
      "/about",
      "/contact",
      "/how-to-buy",
      "/error",
      // Add API routes that should be public (be careful with this)
      "/api/auth/callback", // OAuth callback
   ];

   const isPublicRoute = publicRoutes.some((route) => {
      if (route.includes(":path*")) {
         const baseRoute = route.replace("/:path*", "");
         return (
            request.nextUrl.pathname === baseRoute ||
            request.nextUrl.pathname.startsWith(baseRoute + "/")
         );
      }
      return request.nextUrl.pathname === route;
   });

   // Define protected routes
   const protectedRoutes = [
      "/profile",
      "/profile/:path*",
      "/admin",
      "/admin/:path*",
      "/rider",
      "/rider/:path*",
   ];

   const isProtectedRoute = protectedRoutes.some((route) => {
      if (route.includes(":path*")) {
         const baseRoute = route.replace("/:path*", "");
         return (
            request.nextUrl.pathname === baseRoute ||
            request.nextUrl.pathname.startsWith(baseRoute + "/")
         );
      }
      return request.nextUrl.pathname === route;
   });

   // If user is NOT logged in and trying to access protected route
   // Redirect to an identification page so we can ask for the user's email
   // and decide whether to send them to signup or signin.
   if (!user && isProtectedRoute) {
      // Attempt to detect whether the visitor already has an account
      // using background signals: cookie `email`, `email` query param,
      // or a custom header `x-email`. If we can detect an email we
      // will use a service-role Supabase client to check for existence
      // of a user and redirect to signup or signin accordingly. If
      // we cannot detect an email, fallback to the normal signin page.

      const emailFromCookie = request.cookies.get("email")?.value;
      const emailFromQuery = request.nextUrl.searchParams.get("email");
      const emailFromHeader = request.headers.get("x-email");
      const email = (emailFromCookie || emailFromQuery || emailFromHeader || "")
         .toString()
         .trim()
         .toLowerCase();

      const redirectParam = request.nextUrl.pathname + request.nextUrl.search;

      // If we have an email, try to check user existence with service client
      if (email) {
         try {
            const svc = createServiceSupabaseClient();

            // Prefer admin.listUsers when available
            if ((svc as any)?.auth?.admin?.listUsers) {
               const listRes = await (svc as any).auth.admin.listUsers({
                  per_page: 100,
               });
               const users = (listRes?.data || []) as any[];
               const exists = users.some(
                  (u) => (u?.email || "").toString().toLowerCase() === email
               );
               const target = exists ? "/signin" : "/signup";
               const url = new URL(target, request.url);
               url.searchParams.set("redirect", redirectParam);
               url.searchParams.set("email", email);
               return NextResponse.redirect(url);
            }

            // Fallback: check `profiles` table for matching email (best-effort)
            const { data: profiles, error: profilesError } = await svc
               .from("profiles")
               .select("id")
               .ilike("email", email)
               .limit(1);

            if (
               !profilesError &&
               Array.isArray(profiles) &&
               profiles.length > 0
            ) {
               const url = new URL("/signin", request.url);
               url.searchParams.set("redirect", redirectParam);
               url.searchParams.set("email", email);
               return NextResponse.redirect(url);
            }

            // Not found -> go to signup
            const url = new URL("/signup", request.url);
            url.searchParams.set("redirect", redirectParam);
            url.searchParams.set("email", email);
            return NextResponse.redirect(url);
         } catch (err) {
            // Any error -> fallback to signin
            console.error("middleware check-user error", err);
            const redirectUrl = new URL("/signin", request.url);
            redirectUrl.searchParams.set("redirect", redirectParam);
            return NextResponse.redirect(redirectUrl);
         }
      }

      // No email available; default to signup so new visitors are guided to create
      // an account rather than assuming they already have one.
      const redirectUrl = new URL("/signup", request.url);
      redirectUrl.searchParams.set("redirect", redirectParam);
      return NextResponse.redirect(redirectUrl);
   }

   // If user IS logged in and trying to access signin page
   if (
      user &&
      (request.nextUrl.pathname === "/signin" ||
         request.nextUrl.pathname === "/auth/signin")
   ) {
      // Check if there's a redirect parameter first
      const redirectParam = request.nextUrl.searchParams.get("redirect");
      if (redirectParam && redirectParam.startsWith("/")) {
         return NextResponse.redirect(new URL(redirectParam, request.url));
      }

      // Otherwise redirect based on role
      const { data: roles } = await supabase
         .from("user_roles")
         .select("role")
         .eq("user_id", user.id);

      const metaRole = (user as any)?.user_metadata?.role as string | undefined;
      const isAdmin =
         roles?.some((r: any) => r.role === "admin") || metaRole === "admin";

      let isRider =
         roles?.some((r: any) => r.role === "rider") || metaRole === "rider";
      if (!isRider) {
         const { data: riderRow } = await supabase
            .from("riders")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();
         if (riderRow) isRider = true;
      }

      if (isAdmin) {
         return NextResponse.redirect(new URL("/admin", request.url));
      } else if (isRider) {
         return NextResponse.redirect(new URL("/rider", request.url));
      } else {
         return NextResponse.redirect(new URL("/", request.url));
      }
   }

   // Role-based route protection
   if (user) {
      // Protect admin routes
      if (request.nextUrl.pathname.startsWith("/admin")) {
         const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id);

         const metaRole = (user as any)?.user_metadata?.role as
            | string
            | undefined;
         const isAdmin =
            roles?.some((r: any) => r.role === "admin") || metaRole === "admin";

         if (!isAdmin) {
            return NextResponse.redirect(new URL("/", request.url));
         }
      }

      // Protect rider routes
      if (request.nextUrl.pathname.startsWith("/rider")) {
         const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id);

         const metaRole = (user as any)?.user_metadata?.role as
            | string
            | undefined;
         const isRider =
            roles?.some((r: any) => r.role === "rider") || metaRole === "rider";

         if (!isRider) {
            const { data: riderRow } = await supabase
               .from("riders")
               .select("id")
               .eq("user_id", user.id)
               .maybeSingle();
            if (!riderRow) {
               return NextResponse.redirect(new URL("/", request.url));
            }
         }
      }

      // Redirect riders away from non-public, non-rider pages
      if (
         !request.nextUrl.pathname.startsWith("/rider") &&
         !request.nextUrl.pathname.startsWith("/api") &&
         !isPublicRoute
      ) {
         const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id);

         const metaRole = (user as any)?.user_metadata?.role as
            | string
            | undefined;
         let isRider =
            roles?.some((r: any) => r.role === "rider") || metaRole === "rider";

         if (!isRider) {
            const { data: riderRow } = await supabase
               .from("riders")
               .select("id")
               .eq("user_id", user.id)
               .maybeSingle();
            if (riderRow) isRider = true;
         }

         // If user is a rider, only allow rider routes and public routes
         if (isRider) {
            return NextResponse.redirect(new URL("/rider", request.url));
         }
      }
   }

   return supabaseResponse;
}

import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
   // Get token from cookie or Authorization header
   const token =
      request.cookies.get("auth-token")?.value ||
      request.headers.get("authorization")?.replace("Bearer ", "");

   // Define public routes that don't require authentication
   const publicRoutes = [
      "/",
      "/signin",
      "/signup",
      "/auth/signin",
      "/auth/callback",
      "/products",
      "/about",
      "/contact",
      "/how-to-buy",
      "/forgot-password",
      "/reset-password",
      "/error",
      "/cart", // Allow guest access to cart
      "/checkout", // Allow guest checkout
      "/api/auth", // Auth API routes are public
   ];

   const isPublicRoute = publicRoutes.some((route) => {
      if (route.includes(":path*")) {
         const baseRoute = route.replace("/:path*", "");
         return (
            request.nextUrl.pathname === baseRoute ||
            request.nextUrl.pathname.startsWith(baseRoute + "/")
         );
      }
      return (
         request.nextUrl.pathname === route ||
         request.nextUrl.pathname.startsWith(route + "/")
      );
   });

   // Define protected routes (cart and checkout are public for guest checkout)
   const protectedRoutes = [
      "/profile",
      "/admin",
      "/rider",
      "/orders",
      "/addresses",
      "/wishlist",
      "/notifications",
   ];

   const isProtectedRoute = protectedRoutes.some((route) => {
      if (route.includes(":path*")) {
         const baseRoute = route.replace("/:path*", "");
         return (
            request.nextUrl.pathname === baseRoute ||
            request.nextUrl.pathname.startsWith(baseRoute + "/")
         );
      }
      return (
         request.nextUrl.pathname === route ||
         request.nextUrl.pathname.startsWith(route + "/")
      );
   });

   // If user is NOT logged in and trying to access protected route
   if (!token && isProtectedRoute && !isPublicRoute) {
      const redirectParam = request.nextUrl.pathname + request.nextUrl.search;

      // Attempt to detect email for smart redirect
      const emailFromCookie = request.cookies.get("email")?.value;
      const emailFromQuery = request.nextUrl.searchParams.get("email");
      const email = (emailFromCookie || emailFromQuery || "").toString().trim();

      if (email) {
         // Redirect to signin with email pre-filled
         const url = new URL("/signin", request.url);
         url.searchParams.set("redirect", redirectParam);
         url.searchParams.set("email", email);
         return NextResponse.redirect(url);
      }

      // Default to signin
      const url = new URL("/signin", request.url);
      url.searchParams.set("redirect", redirectParam);
      return NextResponse.redirect(url);
   }

   // If user IS logged in and trying to access signin/signup pages
   if (
      token &&
      (request.nextUrl.pathname === "/signin" ||
         request.nextUrl.pathname === "/signup" ||
         request.nextUrl.pathname === "/auth/signin")
   ) {
      // Check if there's a redirect parameter first
      const redirectParam = request.nextUrl.searchParams.get("redirect");
      if (redirectParam && redirectParam.startsWith("/")) {
         return NextResponse.redirect(new URL(redirectParam, request.url));
      }

      // Otherwise redirect to home (role-based routing will be handled client-side)
      return NextResponse.redirect(new URL("/", request.url));
   }

   // Note: Role-based route protection is handled client-side in ProtectedRoute component
   // because we can't easily verify JWT tokens in middleware without the secret

   return NextResponse.next({
      request,
   });
}


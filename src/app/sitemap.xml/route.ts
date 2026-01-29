import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nihemart.rw";

// Manual list of public pages to include in the sitemap.
// Add or remove routes here as you publish/unpublish pages.
const PAGES = [
   "/",
   "/about",
   "/products",
   "/how-to-buy",
   "/contact",
   "/cart",
   "/checkout",
   "/wishlist",
   "/profile",
   "/orders",
   "/returns",
   "/addresses",
   "/signin",
   "/signup",
   "/forgot-password",
   "/reset-password",
];

export async function GET() {
   const urls = PAGES.map((p) => `${BASE_URL}${p}`);

   const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.map((url) => `  <url>\n    <loc>${url}</loc>\n  </url>`).join("\n") +
      `\n</urlset>`;

   return new NextResponse(xml, {
      headers: {
         "Content-Type": "application/xml",
      },
   });
}

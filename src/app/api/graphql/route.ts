import { NextResponse } from "next/server";

// Lightweight GraphQL-like endpoint without external deps.
// Supports simple queries: "{ siteName }" and "{ products { id title slug } }"
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Nihemart";
const PRODUCTS = [
   { id: "1", title: "Example Product", slug: "example-product" },
];

function handleQuery(query: string | null) {
   if (!query) return { data: { siteName: SITE_NAME } };

   const q = query.replace(/\s+/g, " ").trim();
   if (q.includes("siteName")) return { data: { siteName: SITE_NAME } };
   if (q.includes("products")) return { data: { products: PRODUCTS } };
   return { errors: [{ message: "Unsupported query" }] };
}

export async function GET(request: Request) {
   const url = new URL(request.url);
   const query = url.searchParams.get("query");
   const result = handleQuery(query);
   return NextResponse.json(result);
}

export async function POST(request: Request) {
   const body = await request.json().catch(() => ({}));
   const query = body.query || null;
   const result = handleQuery(query);
   return NextResponse.json(result);
}

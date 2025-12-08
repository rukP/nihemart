import { NextResponse } from "next/server";

export async function GET(request: Request) {
   const { searchParams } = new URL(request.url);
   const q = searchParams.get("q");

   if (!q) {
      return NextResponse.json(
         { error: "Query parameter is required" },
         { status: 400 }
      );
   }

   try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
         q
      )}&format=json&addressdetails=1&countrycodes=rw&limit=5`;

      const response = await fetch(nominatimUrl, {
         headers: {
            "Accept-Language": "en",
            "User-Agent": "NiheMart/1.0",
         },
      });

      if (!response.ok) {
         throw new Error(`Nominatim API error: ${response.status}`);
      }

      const data = await response.json();
      return NextResponse.json(data);
   } catch (error) {
      console.error("Address search failed:", error);
      return NextResponse.json(
         { error: "Failed to fetch addresses" },
         { status: 500 }
      );
   }
}

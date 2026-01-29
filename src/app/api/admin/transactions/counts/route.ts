import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { API_BASE } from "@/lib/api";

export async function GET(request: NextRequest) {
   try {
      // Get auth token from request headers
      const authHeader = request.headers.get("authorization");
      const token = authHeader?.replace("Bearer ", "");

      logger.info("api", "Fetching transaction counts from backend");

      // Call backend API to get payments, optionally scoped to a date range
      const urlParams = request.nextUrl.searchParams;
      const fromParam = urlParams.get("from");
      const toParam = urlParams.get("to");
      const paymentMethodParam = urlParams.get("payment_method");
      const sourceParam = urlParams.get("source");

      const params = new URLSearchParams();
      if (fromParam) params.append("from", fromParam);
      if (toParam) params.append("to", toParam);
      if (paymentMethodParam)
         params.append("payment_method", paymentMethodParam);
      if (sourceParam) params.append("source", sourceParam);

      const backendUrl = `${API_BASE}/payments${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(backendUrl, {
         headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
         },
      });

      if (!response.ok) {
         throw new Error(`Backend API returned ${response.status}`);
      }

      const backendData = await response.json();
      const payments = backendData.data || [];

      // Count by status
      const counts = {
         pending: 0,
         completed: 0,
         failed: 0,
         timeout: 0,
         total: payments.length,
      };

      payments.forEach((payment: any) => {
         const status = payment.status?.toLowerCase();
         if (status === "pending") counts.pending++;
         else if (status === "completed") counts.completed++;
         else if (status === "failed") counts.failed++;
         else if (status === "timeout") counts.timeout++;
      });

      // Also add 'all' count for compatibility
      const result = {
         all: counts.total,
         pending: counts.pending,
         completed: counts.completed,
         failed: counts.failed,
         timeout: counts.timeout,
         total: counts.total,
      };

      logger.info("api", "Transaction counts fetched successfully", result);

      return NextResponse.json(result);
   } catch (error) {
      logger.error("api", "Failed to fetch transaction counts", {
         error: error instanceof Error ? error.message : String(error),
         stack: error instanceof Error ? error.stack : undefined,
      });

      // Return empty counts instead of error to prevent UI crashes
      return NextResponse.json({
         all: 0,
         pending: 0,
         completed: 0,
         failed: 0,
         timeout: 0,
         total: 0,
      });
   }
}

import type { NextApiRequest, NextApiResponse } from "next";

// Get API base URL
const getApiBase = () => {
  return (
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API_URL ||
    "https://api.nihemart.rw/api"
  );
};

export const config = {
  api: {
    bodyParser: false, // Disable body parsing, we'll handle it manually
  },
};

// Helper to collect request body as buffer
function collectBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiBase = getApiBase();
    const backendUrl = apiBase.replace("/api", "");

    // Get auth token - try Authorization header first, then cookies
    let authToken: string | undefined;

    if (req.headers.authorization) {
      // Remove "Bearer " prefix if present
      authToken = req.headers.authorization.replace(/^Bearer\s+/i, "").trim();
    }

    if (!authToken && req.cookies["auth-token"]) {
      authToken = req.cookies["auth-token"];
    }

    if (!authToken) {
      console.error("No auth token found in headers or cookies");
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.log(
      `Auth token extracted: ${authToken.substring(0, 20)}... (length: ${authToken.length})`,
    );

    // Collect the request body with timeout
    const bodyBuffer = await Promise.race([
      collectBody(req),
      new Promise<Buffer>((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), 30000),
      ),
    ]);

    // Forward the request to the backend
    // Copy headers but preserve content-type with boundary
    const headers: Record<string, string> = {};
    Object.keys(req.headers).forEach((key) => {
      const lowerKey = key.toLowerCase();
      // Skip host, connection, and authorization (we'll set it explicitly)
      if (
        lowerKey !== "host" &&
        lowerKey !== "connection" &&
        lowerKey !== "authorization"
      ) {
        const value = req.headers[key];
        if (typeof value === "string") {
          headers[key] = value;
        } else if (Array.isArray(value)) {
          headers[key] = value.join(", ");
        }
      }
    });

    // Set Authorization header explicitly (must be Bearer token format)
    headers["Authorization"] = `Bearer ${authToken}`;

    console.log(
      `Auth token present: ${!!authToken}, length: ${authToken?.length || 0}`,
    );

    // Set content-length if we have the body
    if (bodyBuffer.length > 0) {
      headers["Content-Length"] = bodyBuffer.length.toString();
    }

    console.log(
      `Forwarding upload to backend: ${backendUrl}/api/uploads/riders`,
    );
    console.log(`Body size: ${bodyBuffer.length} bytes`);

    // Forward to backend with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // Use Buffer directly - Node.js fetch supports it
      // Type assertion needed for TypeScript
      const backendResponse = await fetch(`${backendUrl}/api/uploads/riders`, {
        method: "POST",
        headers,
        body: bodyBuffer as any,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if response is ok before parsing JSON
      if (!backendResponse.ok) {
        const errorText = await backendResponse.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        console.error("Backend upload error:", errorData);
        return res.status(backendResponse.status).json(errorData);
      }

      // Get the response data
      const responseData = await backendResponse.json();

      // Forward the status and response
      res.status(backendResponse.status).json(responseData);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === "AbortError") {
        throw new Error("Backend request timeout");
      }
      throw fetchError;
    }
  } catch (err: any) {
    console.error("upload-rider-image proxy error:", err);
    return res.status(500).json({ error: err?.message || "Upload failed" });
  }
}

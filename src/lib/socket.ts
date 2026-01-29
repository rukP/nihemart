import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/auth.store";

// Get API base URL (same as REST API, but without /api suffix for Socket.IO)
// Use the same logic as API_BASE in api.ts for consistency
const getApiBase = () => {
  if (typeof window === "undefined") return "";

  // Use the same environment variables as the REST API
  let baseUrl =
    (typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_API_BASE
      : undefined) ||
    (typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_API_URL
      : undefined) ||
    "https://api.nihemart.rw/api";

  // Remove /api suffix if present for Socket.IO connection
  baseUrl = baseUrl.replace(/\/api$/, "");

  // Ensure we have a valid URL format
  // If baseUrl doesn't start with http:// or https://, it's invalid
  if (
    !baseUrl ||
    baseUrl === "" ||
    (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://"))
  ) {
    console.warn(
      "Invalid API base URL for Socket.IO:",
      baseUrl,
      "using default",
    );
    baseUrl = "http://localhost:4000";
  }

  // In production, ensure we use HTTPS
  if (typeof window !== "undefined") {
    const isProduction =
      !window.location.hostname.includes("localhost") &&
      !window.location.hostname.includes("127.0.0.1");

    if (isProduction && baseUrl.startsWith("http://")) {
      baseUrl = baseUrl.replace("http://", "https://");
    }
  }

  // Final validation - ensure URL is well-formed
  try {
    new URL(baseUrl);
  } catch (e) {
    console.error("Invalid Socket.IO URL format:", baseUrl, e);
    return "http://localhost:4000";
  }

  return baseUrl;
};

let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3; // Reduced from 5 to avoid excessive retry
let currentToken: string | null = null;
let initializationFailed = false; // Track if initialization permanently failed

/**
 * Initialize Socket.IO connection
 */
export function initializeSocket(): Socket | null {
  if (typeof window === "undefined") return null;

  // Don't retry if initialization permanently failed
  if (initializationFailed) {
    console.warn("Socket.IO initialization previously failed, skipping retry");
    return null;
  }

  // Get auth token
  const token = useAuthStore.getState().token;
  if (!token) {
    console.warn("No auth token available for Socket.IO connection");
    // Disconnect if we had a socket but no token
    if (socket) {
      socket.disconnect();
      socket = null;
      currentToken = null;
    }
    return null;
  }

  // If socket already exists and is connected with the same token, return it
  if (socket?.connected && currentToken === token) {
    return socket;
  }

  // If token changed, disconnect old socket
  if (socket && currentToken !== token) {
    socket.disconnect();
    socket = null;
    currentToken = null;
  }

  const apiBase = getApiBase();

  // Ensure we have a valid URL
  if (
    !apiBase ||
    apiBase === "" ||
    (!apiBase.startsWith("http://") && !apiBase.startsWith("https://"))
  ) {
    console.error("Invalid Socket.IO URL:", apiBase);
    return null;
  }

  const socketUrl = apiBase; // Already cleaned in getApiBase()

  console.log("Connecting Socket.IO to:", socketUrl);

  // Disconnect existing socket if any
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  currentToken = token;

  // Create new socket connection
  socket = io(socketUrl, {
    auth: {
      token: token,
    },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    timeout: 20000,
    forceNew: false,
    upgrade: true,
    rememberUpgrade: false,
  });

  socket.on("connect", () => {
    console.log("Socket.IO connected:", socket?.id);
    reconnectAttempts = 0;
    initializationFailed = false; // Reset failed flag on successful connection

    // Subscribe to notifications
    socket?.emit("subscribe:notifications");
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket.IO disconnected:", reason);

    if (reason === "io server disconnect") {
      // Server disconnected, reconnect manually
      socket?.connect();
    }
  });

  socket.on("connect_error", (error) => {
    console.error("Socket.IO connection error:", error);
    console.error("Error details:", {
      message: error.message,
      type: (error as any).type,
      description: (error as any).description,
      data: (error as any).data,
    });
    reconnectAttempts++;

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error(
        "Max reconnection attempts reached. Socket.IO connection failed. Will not retry automatically.",
      );
      initializationFailed = true;

      // Disconnect the socket to stop automatic reconnection attempts
      if (socket) {
        socket.disconnect();
      }
    }
  });

  return socket;
}

/**
 * Get the current socket instance
 */
export function getSocket(): Socket | null {
  if (!socket || !socket.connected) {
    return initializeSocket();
  }
  return socket;
}

/**
 * Disconnect socket
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  currentToken = null;
}

/**
 * Reconnect socket (useful after token refresh)
 */
export function reconnectSocket() {
  disconnectSocket();
  currentToken = null;
  return initializeSocket();
}

/**
 * Check if socket is connected
 */
export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}

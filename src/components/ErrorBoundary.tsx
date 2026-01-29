"use client";

import React, { Component, ReactNode, ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Log to error tracking service if available
    if (typeof window !== "undefined") {
      try {
        // You can integrate with error tracking services here (e.g., Sentry)
        console.error("Component Stack:", errorInfo.componentStack);
      } catch (e) {
        // Ignore errors in error reporting
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Clear chunk error flags
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem("chunk-error-reloaded");
        sessionStorage.removeItem("chunk-error-ui-shown");
      } catch (e) {
        // Ignore storage errors
      }
    }
  };

  handleReload = () => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem("chunk-error-reloaded");
        sessionStorage.removeItem("chunk-error-ui-shown");
      } catch (e) {
        // Ignore storage errors
      }
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            background: "#f9fafb",
          }}
        >
          <div
            style={{
              maxWidth: "500px",
              width: "100%",
              padding: "2rem",
              background: "white",
              borderRadius: "0.5rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              textAlign: "center",
            }}
          >
            <svg
              style={{
                width: "64px",
                height: "64px",
                margin: "0 auto 1rem",
                color: "#ef4444",
              }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: "bold",
                marginBottom: "0.5rem",
                color: "#111827",
              }}
            >
              Something went wrong
            </h1>
            <p
              style={{
                marginBottom: "1.5rem",
                color: "#6b7280",
                lineHeight: "1.5",
              }}
            >
              We're sorry, but something unexpected happened. You can try
              reloading the page or go back to continue shopping.
            </p>
            {this.state.error && (
              <details
                style={{
                  marginBottom: "1.5rem",
                  padding: "0.75rem",
                  background: "#fef2f2",
                  borderRadius: "0.375rem",
                  textAlign: "left",
                  fontSize: "0.875rem",
                }}
              >
                <summary
                  style={{
                    cursor: "pointer",
                    fontWeight: "600",
                    color: "#991b1b",
                    marginBottom: "0.5rem",
                  }}
                >
                  Error Details
                </summary>
                <code
                  style={{
                    display: "block",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    color: "#7f1d1d",
                  }}
                >
                  {this.state.error.message}
                </code>
              </details>
            )}
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "center",
              }}
            >
              <button
                onClick={this.handleReset}
                style={{
                  padding: "0.625rem 1.25rem",
                  background: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                style={{
                  padding: "0.625rem 1.25rem",
                  background: "#6b7280",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

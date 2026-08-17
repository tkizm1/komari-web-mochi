import React from "react";
import type { ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Caught error in ErrorBoundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col items-center justify-center min-h-[300px] p-8 rounded-md shadow-md max-w-3xl mx-auto"
          style={{
            background: "color-mix(in srgb, var(--red-a2) 56%, var(--color-panel-solid))",
            border: "1px solid var(--red-a6)",
          }}
        >
          {/* Icon for visual emphasis */}
          <svg
            className="w-12 h-12 mb-4"
            style={{ color: "var(--red-10)" }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>

          {/* Title */}
          <h2 className="text-3xl font-semibold mb-3 tracking-tight" style={{ color: "var(--red-11)" }}>
            Something Went Wrong
          </h2>

          {/* Error Message */}
          <p className="text-lg mb-6 font-medium text-center" style={{ color: "var(--red-11)" }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </p>

          {/* Error Details */}
          <details className="w-full max-w-xl">
            <summary className="cursor-pointer text-sm font-medium transition-colors duration-200" style={{ color: "var(--red-11)" }}>
              View Error Details
            </summary>
            <pre
              className="mt-3 p-4 text-sm rounded-lg shadow-sm overflow-x-auto"
              style={{
                background: "var(--red-a3)",
                color: "var(--red-12)",
                border: "1px solid var(--red-a6)",
              }}
            >
              {this.state.error?.stack || "No stack trace available."}
            </pre>
          </details>

          {/* Action Buttons */}
          <div className="mt-6 flex gap-4">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 rounded-lg shadow transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{
                background: "var(--red-9)",
                color: "var(--red-contrast, white)",
              }}
            >
              Reload Page
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              className="px-6 py-2 rounded-lg shadow transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{
                background: "var(--gray-a4)",
                color: "var(--gray-12)",
              }}
            >
              Go to Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

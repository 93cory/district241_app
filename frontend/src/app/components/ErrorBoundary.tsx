"use client";

import React, { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[PNPI ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          style={{
            padding: "2rem",
            margin: "2rem auto",
            maxWidth: "600px",
            background: "var(--card-bg, #fff)",
            border: "1px solid var(--border-color, #e0e0e0)",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <h2 style={{ color: "var(--danger-color, #d32f2f)", marginBottom: "1rem" }}>
            Une erreur est survenue
          </h2>
          <p style={{ color: "var(--text-secondary, #666)", marginBottom: "1.5rem" }}>
            Un probleme inattendu s&apos;est produit. Veuillez rafraichir la page ou reessayer.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="btn-primary"
            style={{
              padding: "0.5rem 1.5rem",
              cursor: "pointer",
              borderRadius: "6px",
              border: "none",
              background: "var(--primary-color, #1565c0)",
              color: "#fff",
            }}
          >
            Reessayer
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

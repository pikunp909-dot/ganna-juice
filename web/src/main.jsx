import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./auth";
import { LanguageProvider } from "./language";
import App from "./App";
import "./index.css";

// Top-level error boundary — if any component throws during render, show a
// recoverable fallback instead of unmounting the whole tree (black screen).
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err) {
    console.error("App crashed:", err);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            background: "#0b1a10",
            color: "#f5e9d0",
            fontFamily: "system-ui, -apple-system, sans-serif",
            textAlign: "center",
            padding: "2rem",
          }}
        >
          <div>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🍹</div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>
              Something went wrong.
            </h1>
            <p style={{ marginTop: "0.5rem", opacity: 0.8 }}>
              Please refresh the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: "1.5rem",
                padding: "0.75rem 2rem",
                borderRadius: "9999px",
                border: "none",
                background: "#c8a24b",
                color: "#0b1a10",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Refresh
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// PWA — register the app-shell service worker once the page is idle.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <React.StrictMode>
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </React.StrictMode>
  </ErrorBoundary>
);

import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ProtectedRoute } from "./auth";
import { CartProvider } from "./cart";
import Login from "./pages/Login";
import Home from "./pages/Home";
import DashboardLayout from "./layouts/DashboardLayout";
const Analytics = lazy(() => import("./pages/Analytics"));
const Menu = lazy(() => import("./pages/Menu"));
const Orders = lazy(() => import("./pages/Orders"));
const Customers = lazy(() => import("./pages/Customers"));
const Settings = lazy(() => import("./pages/Settings"));
const AdminReviews = lazy(() => import("./pages/AdminReviews"));

// The customer site and the admin panel share one index.html. They must
// install as separate PWAs, so the manifest + iOS touch icon are swapped
// based on the current route: /admin and /login use the admin manifest,
// everything else uses the customer manifest.
function usePwaManifest() {
  const { pathname } = useLocation();
  useEffect(() => {
    const isAdmin = pathname.startsWith("/admin") || pathname.startsWith("/login");
    const manifest = document.querySelector('link[rel="manifest"]');
    if (manifest) {
      manifest.href = isAdmin ? "/admin-manifest.json" : "/manifest.json";
    }
    const touch = document.querySelector('link[rel="apple-touch-icon"]');
    if (touch) {
      touch.href = isAdmin ? "/icons/admin/icon-192.png" : "/icons/customer/icon-192.png";
    }
  }, [pathname]);
}

export default function App() {
  usePwaManifest();
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A2E1B] flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <Routes>
      {/* Public customer site */}
      <Route
        path="/"
        element={
          <CartProvider>
            <Home />
          </CartProvider>
        }
      />

      {/* Owner auth */}
      <Route path="/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Analytics />} />
        <Route path="menu" element={<Menu />} />
        <Route path="orders" element={<Orders />} />
        <Route path="customers" element={<Customers />} />
        <Route path="reviews" element={<AdminReviews />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

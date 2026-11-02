import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ProtectedRoute } from "./auth";
import { CartProvider } from "./cart";
import Login from "./pages/Login";
import Home from "./pages/Home";
import DashboardLayout from "./layouts/DashboardLayout";
import Analytics from "./pages/Analytics";
import Menu from "./pages/Menu";
import Orders from "./pages/Orders";
import Customers from "./pages/Customers";
import Settings from "./pages/Settings";
import AdminReviews from "./pages/AdminReviews";

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
  );
}

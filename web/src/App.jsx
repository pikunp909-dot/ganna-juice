import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./auth";
import { CartProvider } from "./cart";
import Login from "./pages/Login";
import Home from "./pages/Home";
import DashboardLayout from "./layouts/DashboardLayout";
import Analytics from "./pages/Analytics";
import Menu from "./pages/Menu";
import Orders from "./pages/Orders";
import Settings from "./pages/Settings";

export default function App() {
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
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

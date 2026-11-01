import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api, getToken, setToken, clearToken } from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      if (!getToken()) {
        setReady(true);
        return;
      }
      try {
        const { admin } = await api.me();
        setAdmin(admin);
      } catch {
        clearToken();
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, admin } = await api.login(email, password);
    setToken(token);
    setAdmin(admin);
    return admin;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setAdmin(null);
  }, []);

  return (
    <AuthCtx.Provider value={{ admin, ready, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

export function ProtectedRoute({ children }) {
  const { admin, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center bg-forest">
        <div className="w-10 h-10 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}

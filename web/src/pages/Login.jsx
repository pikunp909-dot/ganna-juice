import { useState } from "react";
import { motion } from "framer-motion";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { Spinner } from "../components/ui";

function BarChartIcon({ className = "w-5 h-5" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3v18h18" />
      <path d="M7 15l4-5 4 3 5-7" />
    </svg>
  );
}

const inputClass =
  "w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-cream placeholder-muted/60 focus:outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/40 transition";

export default function Login() {
  const { admin, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (admin) return <Navigate to="/admin" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-forest flex items-center justify-center px-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* brand */}
        <div className="text-center mb-9">
          <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-gold to-gold2 shadow-lg shadow-gold/30 grid place-items-center text-forest">
            <BarChartIcon className="w-9 h-9" />
          </div>
          <h1 className="font-display text-4xl text-cream tracking-tight">
            Sugarcane <span className="text-gold">Juice</span>
          </h1>
          <p className="mt-2 text-sm text-muted">Owner dashboard — sign in to manage your stall.</p>
        </div>

        {/* glass card */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-card"
        >
          <label className="block mb-5">
            <span className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@ganna.in"
              autoComplete="email"
              required
              className={inputClass}
            />
          </label>

          <label className="block mb-6">
            <span className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">Password</span>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold uppercase tracking-wider text-muted hover:text-gold transition"
                tabIndex={-1}
              >
                {show ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {error && (
            <div className="mb-5 text-sm text-red-300 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 font-bold rounded-full bg-gold text-forest hover:bg-gold2 transition shadow-lg shadow-gold/30 hover:shadow-gold/40 px-6 py-3.5 text-sm disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <>
                <Spinner className="w-4 h-4" /> Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </button>

          <p className="mt-6 text-center text-xs text-muted/70">
            Demo — <span className="text-muted">kunal@ganna.in</span> / <span className="text-muted">kunal123</span>
          </p>
        </motion.form>
      </motion.div>
    </div>
  );
}

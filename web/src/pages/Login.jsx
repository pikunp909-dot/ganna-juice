import { useState } from "react";
import { motion } from "framer-motion";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { Spinner } from "../components/ui";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.15 * i, duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  })
};

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
    <div className="relative min-h-screen overflow-hidden bg-forest flex items-center justify-center px-4">
      {/* ambient glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 w-[34rem] h-[34rem] rounded-full bg-gold/10 blur-[120px]" />
        <div className="absolute -bottom-48 -right-32 w-[38rem] h-[38rem] rounded-full bg-mint/10 blur-[120px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[28rem] h-[28rem] rounded-full bg-forest3/60 blur-[90px]" />
      </div>

      {/* floating gold specks */}
      {["12%", "78%", "34%", "66%", "88%"].map((left, i) => (
        <motion.span
          key={left}
          className="pointer-events-none absolute top-[14%] w-1.5 h-1.5 rounded-full bg-gold/40"
          style={{ left }}
          animate={{ y: [0, -22, 0], opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      <motion.div
        className="relative w-full max-w-md"
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* brand */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0} className="text-center mb-9">
          <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-gold to-gold2 shadow-lg shadow-gold/30 grid place-items-center">
            <span className="text-3xl">🍹</span>
          </div>
          <h1 className="font-display text-4xl text-cream tracking-tight">
            Kunal <span className="text-gold">Juice Store</span>
          </h1>
          <p className="mt-2 text-sm text-muted">Owner dashboard — sign in to manage your stall.</p>
        </motion.div>

        {/* card */}
        <motion.form
          onSubmit={handleSubmit}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={1}
          className="bg-white/[0.04] border border-white/10 backdrop-blur-md rounded-3xl p-8 shadow-card"
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
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold uppercase tracking-wider text-muted hover:text-gold transition"
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
            className="w-full inline-flex items-center justify-center gap-2 font-bold rounded-full bg-gold text-forest hover:bg-gold2 transition shadow-lg shadow-gold/20 px-6 py-3.5 text-sm disabled:opacity-50 disabled:pointer-events-none"
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

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        forest: "#07110a",
        forest2: "#0b1a10",
        forest3: "#12241a",
        forestD: "#050d08",
        gold: "#f59e0b",
        gold2: "#e7a93c",
        goldLight: "#f9e3a8",
        goldDark: "#b45309",
        mint: "#3fa566",
        cream: "#edf5ec",
        muted: "#9db3a0"
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["Manrope", "sans-serif"]
      },
      boxShadow: {
        card: "0 24px 60px rgba(0,0,0,0.5)",
        glass: "inset 0 1px 0 rgba(255,255,255,0.08), 0 24px 60px rgba(0,0,0,0.5)",
        glowGold:
          "0 0 0 1px rgba(245,158,11,0.30), 0 0 40px -8px rgba(245,158,11,0.45), 0 20px 50px -20px rgba(0,0,0,0.6)",
        glowGoldSoft: "0 0 24px -6px rgba(245,158,11,0.40)",
        glowMint: "0 0 30px -8px rgba(63,165,102,0.50)"
      },
      backgroundImage: {
        "gold-metal":
          "linear-gradient(120deg, #f9e3a8 0%, #f59e0b 38%, #d97706 55%, #fbbf24 72%, #b45309 100%)",
        "forest-mesh":
          "radial-gradient(1200px 800px at 15% -10%, rgba(22,62,38,0.55), transparent 60%), radial-gradient(1000px 700px at 110% 20%, rgba(22,62,38,0.40), transparent 55%), linear-gradient(160deg, #07110a 0%, #0a1a12 45%, #050d08 100%)"
      },
      keyframes: {
        floaty: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" }
        },
        spinSlow: {
          to: { transform: "rotate(360deg)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "200% center" },
          "100%": { backgroundPosition: "-200% center" }
        },
        pulseGlow: {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(245,158,11,0.35)" },
          "50%": { boxShadow: "0 0 0 10px rgba(245,158,11,0)" }
        },
        orbDrift: {
          "0%,100%": { transform: "translate(0,0) scale(1)" },
          "33%": { transform: "translate(30px,-40px) scale(1.08)" },
          "66%": { transform: "translate(-20px,24px) scale(0.95)" }
        }
      },
      animation: {
        floaty: "floaty 7s ease-in-out infinite",
        spinSlow: "spinSlow 38s linear infinite",
        shimmer: "shimmer 3.5s linear infinite",
        pulseGlow: "pulseGlow 2.6s ease-out infinite",
        orbDrift: "orbDrift 14s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

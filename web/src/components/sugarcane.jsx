// Lightweight decorative sugarcane SVGs — stroke style, inherit text color
// (use with text-gold / text-mint). No gradients, no blur, render cheap.

export function SugarcaneStick({ className = "w-12 h-48" }) {
  return (
    <svg
      viewBox="0 0 40 160"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* top leaf pair */}
      <path d="M20 26C14 14 8 10 3 12c6 5 11 11 17 14z" />
      <path d="M20 26c6-12 12-16 17-14-6 5-11 11-17 14z" />
      {/* stalk silhouette */}
      <path d="M14 30c-4 3-5 7-5 13v88c0 8 3 15 8 19 5-4 8-11 8-19V43c0-6-1-10-5-13" />
      <path d="M26 30c4 3 5 7 5 13v88c0 8-3 15-8 19-5-4-8-11-8-19V43c0-6 1-10 5-13" />
      {/* node bands */}
      <path d="M15 54h10M15 78h10M15 102h10M15 126h10" opacity="0.5" />
    </svg>
  );
}

export function SugarcaneLeaf({ className = "w-16 h-10" }) {
  return (
    <svg
      viewBox="0 0 80 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* blade edges + midrib */}
      <path d="M6 8C24 5 48 12 72 30" />
      <path d="M6 32C16 30 36 26 72 30" />
      <path d="M6 8c20 8 44 20 66 22" opacity="0.45" />
    </svg>
  );
}

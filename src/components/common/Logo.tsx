import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = "w-8 h-8", size = 32 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Metallic gradient for N stems */}
        <linearGradient id="metalN" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#cbd5e1" />
          <stop offset="70%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>

        <linearGradient id="metalNRight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="50%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>

        {/* Glowing electric blue orbital arc gradient */}
        <linearGradient id="orbitGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.2" />
          <stop offset="50%" stopColor="#00c6ff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#0072ff" stopOpacity="1" />
        </linearGradient>

        {/* Star sparkle gradient */}
        <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
        </radialGradient>

        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Orbit ring back arc */}
      <path
        d="M 15 58 C 25 72, 55 80, 85 45"
        stroke="url(#orbitGlow)"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
        filter="url(#glow)"
      />

      {/* Letter N - Left vertical stem */}
      <polygon
        points="30,28 42,28 42,66 30,76"
        fill="url(#metalN)"
        stroke="#94a3b8"
        strokeWidth="0.75"
      />

      {/* Letter N - Diagonal stroke */}
      <polygon
        points="42,28 70,72 58,72 30,28"
        fill="url(#metalNRight)"
        opacity="0.9"
      />
      <polygon
        points="30,28 42,28 70,72 58,72"
        fill="url(#metalN)"
      />

      {/* Letter N - Right vertical stem */}
      <polygon
        points="58,36 70,36 70,72 58,72"
        fill="url(#metalNRight)"
        stroke="#cbd5e1"
        strokeWidth="0.75"
      />

      {/* Orbit ring front arc passing through */}
      <path
        d="M 60 40 C 72 25, 88 28, 92 35"
        stroke="url(#orbitGlow)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        filter="url(#glow)"
      />

      {/* Electric Blue 4-Point Star Sparkle at top right */}
      <g transform="translate(76, 26)">
        <path
          d="M 0 -12 C 1 -4, 4 -1, 12 0 C 4 1, 1 4, 0 12 C -1 4, -4 1, -12 0 C -4 -1, -1 -4, 0 -12 Z"
          fill="#38bdf8"
          filter="url(#glow)"
        />
        <circle cx="0" cy="0" r="3" fill="#ffffff" />
      </g>
    </svg>
  );
}

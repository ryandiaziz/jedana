import React from 'react';

export type LogoVariant = 'mark' | 'horizontal' | 'full' | 'text';
export type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

export interface JedanaLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: LogoVariant;
  size?: LogoSize;
  withBadge?: boolean;
  showTagline?: boolean;
  className?: string;
}

const SIZE_MAP: Record<string, number> = {
  xs: 18,
  sm: 24,
  md: 36,
  lg: 48,
  xl: 64,
};

export const JedanaLogo: React.FC<JedanaLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  withBadge = true,
  showTagline = true,
  className = '',
  ...props
}) => {
  const pixelSize = typeof size === 'number' ? size : (SIZE_MAP[size] ?? 36);
  // Unique gradient IDs to prevent collisions when multiple instances are on page
  const id = React.useId().replace(/:/g, '');
  const bgGradId = `jedana-bg-${id}`;
  const glowGradId = `jedana-glow-${id}`;
  const indigoGradId = `ribbon-indigo-${id}`;
  const emeraldGradId = `ribbon-emerald-${id}`;

  // Mark SVG
  const renderMark = () => {
    return (
      <svg
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-200"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={bgGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E1B4B" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
          <linearGradient id={glowGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={indigoGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818CF8" />
            <stop offset="50%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#4338CA" />
          </linearGradient>
          <linearGradient id={emeraldGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="60%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>

        {withBadge && (
          <>
            {/* Bento Squircle Container */}
            <rect width="48" height="48" rx="14" fill={`url(#${bgGradId})`} />
            <rect
              width="48"
              height="48"
              rx="14"
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth="1"
            />
            {/* Ambient Depth Glow */}
            <circle cx="28" cy="20" r="14" fill={`url(#${glowGradId})`} />
          </>
        )}

        {/* Primary Stem: "Jeda" (Mindfulness & Stability Anchor) */}
        <path
          d="M28 12V27C28 31.4183 24.4183 35 20 35C15.5817 35 12 31.4183 12 27C12 22.5817 15.5817 19 20 19"
          stroke={`url(#${indigoGradId})`}
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Flowing Cashflow Ribbon: "Dana" (Wealth Flow & Continuity) */}
        <path
          d="M20 19C24.4183 19 28 22.5817 28 27C28 31.4183 31.5817 35 36 35"
          stroke={`url(#${emeraldGradId})`}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Anchor Dot */}
        <circle cx="28" cy="12" r="2.25" fill="#C7D2FE" />
      </svg>
    );
  };

  // Text wordmark with financial typography
  const renderWordmark = () => {
    const isSmall = pixelSize <= 28;
    return (
      <div className="flex flex-col justify-center leading-none select-none">
        <span
          className={`font-bold tracking-tight text-foreground ${
            isSmall ? 'text-base' : pixelSize >= 48 ? 'text-2xl' : 'text-lg'
          }`}
        >
          Jedana
        </span>
        {(variant === 'full' || showTagline) && (
          <span className="text-[11px] text-muted-foreground font-medium tracking-wide mt-0.5">
            Finance Tracker
          </span>
        )}
      </div>
    );
  };

  if (variant === 'text') {
    return (
      <div
        className={`inline-flex items-center ${className}`}
        role="img"
        aria-label="Jedana"
        {...props}
      >
        {renderWordmark()}
      </div>
    );
  }

  if (variant === 'mark') {
    return (
      <div
        className={`inline-flex items-center justify-center shrink-0 ${className}`}
        role="img"
        aria-label="Jedana Logo"
        {...props}
      >
        {renderMark()}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-3 ${className}`}
      role="img"
      aria-label="Jedana - Finance Tracker"
      {...props}
    >
      {renderMark()}
      {renderWordmark()}
    </div>
  );
};

export default JedanaLogo;

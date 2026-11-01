import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../../utils/cn';

export type TooltipSide = 'right' | 'left' | 'top' | 'bottom';

interface PositionConfig {
  getCoords: (rect: DOMRect) => { top: number; left: number };
  transform: string;
}

const SIDE_CONFIG: Record<TooltipSide, PositionConfig> = {
  right: {
    getCoords: (rect) => ({ top: rect.top + rect.height / 2, left: rect.right + 10 }),
    transform: 'translateY(-50%)',
  },
  left: {
    getCoords: (rect) => ({ top: rect.top + rect.height / 2, left: rect.left - 10 }),
    transform: 'translate(-100%, -50%)',
  },
  top: {
    getCoords: (rect) => ({ top: rect.top - 8, left: rect.left + rect.width / 2 }),
    transform: 'translate(-50%, -100%)',
  },
  bottom: {
    getCoords: (rect) => ({ top: rect.bottom + 8, left: rect.left + rect.width / 2 }),
    transform: 'translate(-50%, 0)',
  },
};

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: TooltipSide;
  enabled?: boolean;
  delay?: number;
  className?: string;
  wrapperClassName?: string;
}

export default function Tooltip({
  content,
  children,
  side = 'right',
  enabled = true,
  delay = 100,
  className,
  wrapperClassName,
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const calculatePosition = () => {
    if (!triggerRef.current || typeof window === 'undefined') return;
    const rect = triggerRef.current.getBoundingClientRect();
    const config = SIDE_CONFIG[side];
    const rawCoords = config.getCoords(rect);

    // Clamp top to keep tooltip within viewport
    const clampedTop = Math.max(12, Math.min(window.innerHeight - 36, rawCoords.top));
    setCoords({ top: clampedTop, left: rawCoords.left });
  };

  const handleMouseEnter = () => {
    if (!enabled || !content) return;
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      calculatePosition();
      setIsOpen(true);
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);

    setIsVisible(false);
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  // Close tooltip on page scroll or window resize
  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      setIsVisible(false);
      setIsOpen(false);
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  return (
    <div
      ref={triggerRef}
      className={cn('relative flex w-full', wrapperClassName)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}
      {isOpen && typeof document !== 'undefined' &&
        createPortal(
          <div
            role="tooltip"
            className={cn(
              'fixed z-50 pointer-events-none px-2.5 py-1.5 text-xs font-medium',
              'text-popover-foreground bg-popover/95 border border-border/80 shadow-md rounded-lg',
              'backdrop-blur-xs select-none whitespace-nowrap transition-all duration-150 ease-out',
              isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
              className
            )}
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform: SIDE_CONFIG[side].transform,
            }}
          >
            {content}
          </div>,
          document.body
        )}
    </div>
  );
}

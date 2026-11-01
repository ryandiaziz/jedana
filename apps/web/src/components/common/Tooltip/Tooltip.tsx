import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../../utils/cn';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'right' | 'left' | 'top' | 'bottom';
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
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const calculatePosition = () => {
    if (!triggerRef.current || typeof window === 'undefined') return;
    const rect = triggerRef.current.getBoundingClientRect();

    let top = 0;
    let left = 0;

    switch (side) {
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + 10;
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - 10;
        break;
      case 'top':
        top = rect.top - 8;
        left = rect.left + rect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + 8;
        left = rect.left + rect.width / 2;
        break;
    }

    // Clamp top to keep tooltip within viewport
    const clampedTop = Math.max(12, Math.min(window.innerHeight - 36, top));
    setCoords({ top: clampedTop, left });
  };

  const handleMouseEnter = () => {
    if (!enabled) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      calculatePosition();
      setIsOpen(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Close tooltip on page scroll or window resize
  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      setIsOpen(false);
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  if (!enabled || !content) {
    return <>{children}</>;
  }

  const getTransform = () => {
    switch (side) {
      case 'right':
        return 'translateY(-50%)';
      case 'left':
        return 'translate(-100%, -50%)';
      case 'top':
        return 'translate(-50%, -100%)';
      case 'bottom':
        return 'translate(-50%, 0)';
    }
  };

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
              'backdrop-blur-xs transition-opacity duration-150 select-none whitespace-nowrap',
              className
            )}
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform: getTransform(),
            }}
          >
            {content}
          </div>,
          document.body
        )}
    </div>
  );
}

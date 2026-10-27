import { useEffect, useRef, useState } from 'react';
import { resolveBackToTopVisible, resolveFloatingVisible } from './scroll';

export interface FloatingVisibility {
  floatingVisible: boolean;
  backToTopVisible: boolean;
}

export function useFloatingVisible(): FloatingVisibility {
  const [floatingVisible, setFloatingVisible] = useState(false);
  const [backToTopVisible, setBackToTopVisible] = useState(false);

  const floatingRef = useRef(false);
  const backToTopRef = useRef(false);
  const viewportHeightRef = useRef(typeof window !== 'undefined' ? window.innerHeight : 800);

  useEffect(() => {
    let rafId: number | null = null;

    const updateVisibility = () => {
      rafId = null;
      const scrollY = window.scrollY;
      const nextFloating = resolveFloatingVisible(scrollY, floatingRef.current);
      const nextBackToTop = resolveBackToTopVisible(scrollY, viewportHeightRef.current);

      if (nextFloating !== floatingRef.current) {
        floatingRef.current = nextFloating;
        setFloatingVisible(nextFloating);
      }

      if (nextBackToTop !== backToTopRef.current) {
        backToTopRef.current = nextBackToTop;
        setBackToTopVisible(nextBackToTop);
      }
    };

    const scheduleUpdate = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(updateVisibility);
    };

    const handleResize = () => {
      viewportHeightRef.current = window.innerHeight;
      scheduleUpdate();
    };

    viewportHeightRef.current = window.innerHeight;
    updateVisibility();

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return { floatingVisible, backToTopVisible };
}

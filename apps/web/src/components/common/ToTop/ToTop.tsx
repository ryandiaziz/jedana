import { ArrowUp } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { useFloatingVisible } from '../../../utils/useFloatingVisible';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function ToTop() {
  const { backToTopVisible } = useFloatingVisible();

  const handleScrollToTop = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  return (
    <button
      type="button"
      data-testid="to-top"
      onClick={handleScrollToTop}
      aria-label="Back to top"
      title="Back to top"
      aria-hidden={!backToTopVisible || undefined}
      tabIndex={backToTopVisible ? 0 : -1}
      className={cn(
        'fixed z-30 left-5 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:left-auto md:right-8 md:bottom-8 w-12 h-12 min-w-[48px] min-h-[48px] rounded-2xl bg-card/90 backdrop-blur border border-border/80 shadow-lg flex items-center justify-center text-foreground hover:text-primary hover:border-primary/40 active:scale-90 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        backToTopVisible
          ? 'opacity-100 scale-100 visible'
          : 'opacity-0 scale-90 pointer-events-none invisible'
      )}
    >
      <ArrowUp size={20} />
    </button>
  );
}

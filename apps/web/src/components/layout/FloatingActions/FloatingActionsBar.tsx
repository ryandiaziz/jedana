import { cn } from '../../../utils/cn';
import { useFloatingActionsState } from './FloatingActionsContext';
import { useFloatingVisible } from './useFloatingVisible';

export default function FloatingActionsBar() {
  const actions = useFloatingActionsState();
  const { floatingVisible } = useFloatingVisible();

  if (actions.length === 0) {
    return null;
  }

  const primaryAction = actions.find((action) => action.primary);
  const secondaryActions = actions.filter((action) => !action.primary);

  return (
    <div
      data-testid="floating-actions"
      aria-label="Quick Actions"
      aria-hidden={!floatingVisible}
      className={cn(
        'fixed top-0 left-0 right-0 md:left-[var(--sidebar-w,16rem)] z-30 h-14 glass-dock border-b border-border/80 transition-transform duration-200',
        floatingVisible ? 'translate-y-0' : '-translate-y-full pointer-events-none'
      )}
    >
      <div className="max-w-5xl mx-auto h-full px-4 sm:px-6 md:px-8 lg:px-10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onSelect}
              aria-label={primaryAction.label}
              title={primaryAction.label}
              tabIndex={floatingVisible ? 0 : -1}
              className={cn(
                'bg-primary text-primary-foreground items-center justify-center gap-2 px-4 min-h-[44px] min-w-[44px] rounded-xl text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all duration-150 cursor-pointer shadow-sm shadow-primary/25',
                primaryAction.desktopOnly ? 'hidden md:inline-flex' : 'inline-flex'
              )}
            >
              {primaryAction.icon}
              <span>{primaryAction.label}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {secondaryActions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={action.onSelect}
              aria-label={action.label}
              title={action.label}
              tabIndex={floatingVisible ? 0 : -1}
              className={cn(
                'w-11 h-11 min-w-[44px] min-h-[44px] items-center justify-center rounded-xl bg-card/80 border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all duration-150 cursor-pointer',
                action.desktopOnly ? 'hidden md:inline-flex' : 'inline-flex'
              )}
            >
              {action.icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

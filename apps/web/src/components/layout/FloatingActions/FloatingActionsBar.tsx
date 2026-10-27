import { cn } from '../../../utils/cn';
import { useFloatingVisible } from '../../../utils/useFloatingVisible';
import { useFloatingActionsState, useFloatingLeading } from './FloatingActionsContext';

export default function FloatingActionsBar() {
  const actions = useFloatingActionsState();
  const leading = useFloatingLeading();
  const { floatingVisible } = useFloatingVisible();

  if (actions.length === 0 && !leading) {
    return null;
  }

  const primaryAction = actions.find((action) => action.primary);
  const secondaryActions = actions.filter((action) => !action.primary);

  return (
    <div
      data-testid="floating-actions"
      role="toolbar"
      aria-label="Quick actions"
      aria-hidden={!floatingVisible || undefined}
      inert={!floatingVisible}
      className={cn(
        'fixed top-0 left-0 right-0 md:left-[var(--sidebar-w,16rem)] z-30 h-14 glass-dock border-b border-border/80 transition-transform duration-200',
        floatingVisible
          ? 'translate-y-0 visible'
          : '-translate-y-full pointer-events-none invisible'
      )}
    >
      <div className="max-w-5xl mx-auto h-full px-4 sm:px-6 md:px-8 lg:px-10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">{leading ?? null}</div>

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
                'w-11 h-11 min-w-[44px] min-h-[44px] items-center justify-center rounded-xl bg-card/90 border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                action.desktopOnly ? 'hidden md:inline-flex' : 'inline-flex'
              )}
            >
              {action.icon}
            </button>
          ))}
          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onSelect}
              aria-label={primaryAction.label}
              title={primaryAction.label}
              tabIndex={floatingVisible ? 0 : -1}
              className={cn(
                'bg-primary text-primary-foreground items-center justify-center gap-2 px-4 min-h-[44px] min-w-[44px] rounded-xl text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all duration-150 cursor-pointer shadow-sm shadow-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                primaryAction.desktopOnly ? 'hidden md:inline-flex' : 'inline-flex'
              )}
            >
              {primaryAction.icon}
              <span>{primaryAction.label}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

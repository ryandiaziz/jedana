export const FLOATING_SHOW_AT = 120;
export const FLOATING_HIDE_AT = 24;

/** Hysteresis so a bouncing iOS toolbar cannot flicker the floating header. */
export function resolveFloatingVisible(scrollY: number, currentlyVisible: boolean): boolean {
  if (!Number.isFinite(scrollY) || scrollY < 0) return false;
  return currentlyVisible ? scrollY > FLOATING_HIDE_AT : scrollY > FLOATING_SHOW_AT;
}

/** To-top appears only after a full viewport of scrolling. */
export function resolveBackToTopVisible(scrollY: number, viewportHeight: number): boolean {
  if (!Number.isFinite(scrollY) || !Number.isFinite(viewportHeight)) return false;
  return scrollY >= Math.max(viewportHeight, 1);
}

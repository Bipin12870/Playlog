type CategoryDrawerEvent =
  | { type: 'open' }
  | { type: 'summary'; summary: string; filtersActive: boolean };

const listeners = new Set<(event: CategoryDrawerEvent) => void>();

export function subscribeToCategoryDrawerEvents(listener: (event: CategoryDrawerEvent) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitCategoryDrawerEvent(event: CategoryDrawerEvent) {
  listeners.forEach((listener) => listener(event));
}

export function requestCategoryDrawerOpen() {
  emitCategoryDrawerEvent({ type: 'open' });
}

export function broadcastCategorySummary(summary: string, filtersActive: boolean) {
  emitCategoryDrawerEvent({ type: 'summary', summary, filtersActive });
}

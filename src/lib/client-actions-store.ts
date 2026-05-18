import type { HomeAction } from "./clients-data";

let _extra: HomeAction[] = [];
const _listeners = new Set<() => void>();

export const clientActionsStore = {
  getExtra: (): HomeAction[] => _extra,
  add(action: HomeAction): void {
    _extra = [..._extra, action];
    _listeners.forEach((l) => l());
  },
  subscribe(listener: () => void): () => void {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  },
};

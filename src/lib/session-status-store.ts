// ─────────────────────────────────────────────────────────────────────────────
// Global session-health flag, surfaced as a visible banner in the layout.
//
// `ensureSession()` writes here on every call: "ok" on success, "lost" when
// it can't produce a usable JWT (cookie missing, refresh failed, LockManager
// deadlock…). The banner (src/components/SessionStatusBanner.tsx) listens
// and renders a red strip with a "Se reconnecter" CTA when status is "lost".
//
// Singleton module-scope state — every consumer subscribes the same source.
// ─────────────────────────────────────────────────────────────────────────────

export type SessionStatus = "ok" | "lost";

let _status: SessionStatus = "ok";
const _listeners = new Set<() => void>();

export const sessionStatusStore = {
  get: (): SessionStatus => _status,
  set: (next: SessionStatus): void => {
    if (_status === next) return;
    _status = next;
    _listeners.forEach((l) => l());
  },
  subscribe: (listener: () => void): (() => void) => {
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  },
};

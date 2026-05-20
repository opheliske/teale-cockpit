// Active client context.
//   mode "self"        → a logged-in client viewing their own space.
//   mode "csm-preview" → a CSM previewing a client's space (impersonation).
// The CSM-preview banner only shows for mode "csm-preview".
type ImpersonationState = {
  mode: "self" | "csm-preview";
  clientId: string;
  clientName: string;
  color: string;
} | null;

let state: ImpersonationState = null;
const listeners: (() => void)[] = [];

if (typeof window !== "undefined") {
  try {
    const saved = sessionStorage.getItem("teale_impersonation");
    if (saved) {
      const parsed = JSON.parse(saved);
      // Backwards-compat: older entries had no `mode`.
      state = parsed && !parsed.mode ? { ...parsed, mode: "csm-preview" } : parsed;
    }
  } catch {}
}

export const impersonationStore = {
  get: (): ImpersonationState => state,
  set: (next: ImpersonationState) => {
    state = next;
    if (typeof window !== "undefined") {
      if (next) sessionStorage.setItem("teale_impersonation", JSON.stringify(next));
      else sessionStorage.removeItem("teale_impersonation");
    }
    listeners.forEach((l) => l());
  },
  subscribe: (listener: () => void) => {
    listeners.push(listener);
    return () => {
      const i = listeners.indexOf(listener);
      if (i > -1) listeners.splice(i, 1);
    };
  },
};

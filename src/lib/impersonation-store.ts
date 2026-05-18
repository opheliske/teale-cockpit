type ImpersonationState = {
  clientId: string;
  clientName: string;
  color: string;
} | null;

let state: ImpersonationState = null;
const listeners: (() => void)[] = [];

if (typeof window !== "undefined") {
  try {
    const saved = sessionStorage.getItem("teale_impersonation");
    if (saved) state = JSON.parse(saved);
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

"use client";

import { useState } from "react";

export type Action = {
  id?: string;
  title: string;
  due: string;
  overdue?: boolean;
};

type InternalAction = {
  id: string;
  title: string;
  due: string;
  overdue?: boolean;
};

const FR_MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function formatDueDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const mo = FR_MONTHS[month - 1];
  const thisYear = new Date().getFullYear();
  return `Échéance le ${day} ${mo}${year !== thisYear ? ` ${year}` : ""}`;
}

export default function ActionsCard({ actions }: { actions: Action[] }) {
  const [items, setItems] = useState<InternalAction[]>(() =>
    actions.map((a, i) => ({ ...a, id: a.id ?? `init-${i}` }))
  );
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDue, setDraftDue] = useState("");

  const toggle = (id: string) =>
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((a) => a.id !== id));
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const submitNew = () => {
    const title = draftTitle.trim();
    if (!title) return;
    const due = draftDue ? formatDueDate(draftDue) : "Sans échéance";
    setItems((prev) => [
      ...prev,
      {
        id: `user-${Date.now().toString(36)}`,
        title,
        due,
      },
    ]);
    setDraftTitle("");
    setDraftDue("");
    setShowAddForm(false);
  };

  const cancelNew = () => {
    setDraftTitle("");
    setDraftDue("");
    setShowAddForm(false);
  };

  const remaining = items.length - checkedIds.size;

  return (
    <div>
      <header className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-medium text-brand-cream">
          Prochaines actions
        </h2>
        <span className="text-[13px] text-brand-muted-on-dark">
          {remaining} à traiter
        </span>
      </header>
      <section className="rounded-2xl border border-brand-border-dark bg-brand-surface p-3">
        <ul className="max-h-[110px] divide-y divide-brand-border-dark overflow-y-auto pr-1">
          {items.map((action) => {
            const isChecked = checkedIds.has(action.id);
            const showOverdue = !!action.overdue && !isChecked;
            const inputId = `action-${action.id}`;
            return (
              <li
                key={action.id}
                className="group/row flex items-start gap-3 py-2 first:pt-0 last:pb-0"
              >
                <input
                  id={inputId}
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(action.id)}
                  className="sr-only"
                />
                <label
                  htmlFor={inputId}
                  aria-label={
                    isChecked ? "Décocher l'action" : "Marquer comme fait"
                  }
                  className={`mt-0.5 grid h-4 w-4 shrink-0 cursor-pointer place-items-center rounded border transition-colors ${
                    isChecked
                      ? "border-brand-accent bg-brand-accent"
                      : "border-brand-muted-on-dark/60 hover:border-brand-cream"
                  }`}
                >
                  {isChecked && (
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-brand-dark"
                    >
                      <path d="M5 12 10 17 19 7" />
                    </svg>
                  )}
                </label>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm ${
                        isChecked
                          ? "text-brand-muted-on-dark line-through"
                          : "text-brand-cream"
                      }`}
                    >
                      {action.title}
                    </span>
                    {showOverdue && (
                      <span className="shrink-0 rounded-full bg-[#E6AA99] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-brand-dark">
                        En retard
                      </span>
                    )}
                  </div>
                  <div
                    className={`mt-0.5 text-[11px] ${
                      showOverdue
                        ? "text-[#E6AA99]"
                        : "text-brand-muted-on-dark"
                    }`}
                  >
                    {action.due}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {!isChecked && (
                    <button
                      type="button"
                      onClick={() => toggle(action.id)}
                      className="rounded-full border border-brand-accent/50 px-3 py-1 text-[11px] font-medium text-brand-accent transition-colors hover:bg-brand-accent hover:text-brand-dark"
                    >
                      C&apos;est fait
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeItem(action.id)}
                    aria-label="Supprimer l'action"
                    title="Supprimer"
                    className="grid h-6 w-6 place-items-center rounded-full text-brand-muted-on-dark opacity-0 transition-all hover:bg-[#E6AA99]/15 hover:text-[#E6AA99] group-hover/row:opacity-100 focus-visible:opacity-100"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M6 6 18 18M6 18 18 6" />
                    </svg>
                  </button>
                </div>
              </li>
            );
          })}

        </ul>
        <div className="mt-2 border-t border-brand-border-dark pt-2.5">
          {showAddForm ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitNew();
              }}
              className="space-y-2"
            >
              <input
                autoFocus
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") cancelNew();
                }}
                placeholder="Intitulé de l'action…"
                className="w-full rounded-lg border border-brand-border-dark bg-brand-dark px-3 py-2 text-sm text-brand-cream placeholder:text-brand-muted-on-dark focus:border-brand-accent focus:outline-none"
              />
              <div className="relative">
                <label className="mb-1 block text-[10px] uppercase tracking-[0.12em] text-brand-muted-on-dark">
                  Échéance (optionnel)
                </label>
                <input
                  type="date"
                  value={draftDue}
                  onChange={(e) => setDraftDue(e.target.value)}
                  className="w-full rounded-lg border border-brand-border-dark bg-brand-dark px-3 py-2 text-[12px] text-brand-cream [color-scheme:dark] focus:border-brand-accent focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!draftTitle.trim()}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-accent px-3 py-1 text-[11px] font-semibold text-brand-dark transition-colors hover:bg-brand-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Ajouter
                </button>
                <button
                  type="button"
                  onClick={cancelNew}
                  className="rounded-full border border-brand-border-dark px-3 py-1 text-[11px] text-brand-cream hover:bg-brand-dark/40"
                >
                  Annuler
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-brand-accent hover:underline"
            >
              <span
                className="grid h-4 w-4 place-items-center rounded-full border border-brand-accent text-[14px] leading-none"
                aria-hidden
              >
                +
              </span>
              Ajouter une action
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

"use client";

import { AUD_ORDER, AUD_META, type AudId } from "@/app/(client)/kits-communication/data";

// Sélecteur multi-public (cases à cocher) pour le formulaire d'édition d'un kit.
// Une carte peut viser plusieurs publics.
export function AudiencePicker({
  value,
  onChange,
}: {
  value: AudId[];
  onChange: (next: AudId[]) => void;
}) {
  const toggle = (id: AudId) =>
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {AUD_ORDER.map((id) => (
        <label key={id} className="flex cursor-pointer items-center gap-2 text-[13px] text-[#c1d4cc]">
          <input
            type="checkbox"
            checked={value.includes(id)}
            onChange={() => toggle(id)}
            className="h-4 w-4 cursor-pointer rounded accent-[#84d4a6]"
          />
          {AUD_META[id]}
        </label>
      ))}
    </div>
  );
}

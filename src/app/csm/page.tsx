export default function CsmHomePage() {
  return (
    <div className="px-9 py-8">
      <div className="mx-auto max-w-[1280px]">

        {/* Header */}
        <div className="mb-8">
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[2.5px] text-[#a78bfa]">
            Espace CSM
          </p>
          <h1 className="text-[30px] font-semibold tracking-[-0.4px] text-brand-cream">
            Vue d&apos;ensemble
          </h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#94a8a0]">
            Bienvenue dans votre espace Customer Success Manager.
          </p>
        </div>

        {/* Placeholder sections */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <PlaceholderStat label="Clients actifs" value="—" />
          <PlaceholderStat label="Ateliers ce mois" value="—" />
          <PlaceholderStat label="Feedbacks en attente" value="—" />
        </div>

        <div className="rounded-[14px] border border-dashed border-[rgba(139,92,246,0.2)] bg-[rgba(139,92,246,0.04)] px-8 py-14 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[2px] text-[rgba(167,139,250,0.5)]">
            En construction
          </p>
          <p className="mt-3 text-[14px] text-[#94a8a0]">
            Les modules CSM seront construits ici — portefeuille clients, planning global, reporting.
          </p>
        </div>

      </div>
    </div>
  );
}

function PlaceholderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[13px] border border-[rgba(139,92,246,0.15)] bg-[rgba(139,92,246,0.04)] px-6 py-5">
      <div className="text-[26px] font-bold tabular-nums leading-none text-[#a78bfa]">
        {value}
      </div>
      <div className="mt-2 text-[10px] font-semibold uppercase tracking-[1px] text-[#94a8a0]">
        {label}
      </div>
    </div>
  );
}

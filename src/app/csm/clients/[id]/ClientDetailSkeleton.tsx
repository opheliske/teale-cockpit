// Loading placeholder for the client detail view — greyed pulsing cards
// shown while the clients store finishes its initial load.
function Block({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[12px] bg-[rgba(255,255,255,0.05)] ${className ?? ""}`}
    />
  );
}

export default function ClientDetailSkeleton() {
  return (
    <div className="px-9 py-8">
      <div className="mx-auto max-w-[1280px]">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Block className="h-14 w-14 rounded-2xl" />
          <div className="flex flex-col gap-2">
            <Block className="h-6 w-64" />
            <Block className="h-4 w-40" />
          </div>
        </div>

        {/* KPI row */}
        <div className="mt-8 grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Block key={i} className="h-28" />
          ))}
        </div>

        {/* Content cards */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Block key={i} className="h-48" />
          ))}
        </div>
        <Block className="mt-6 h-64 w-full" />
      </div>
    </div>
  );
}

// Shown while a client-portal route segment loads.
export default function ClientLoading() {
  return (
    <div className="flex h-full items-center justify-center bg-[#061a16]">
      <div className="flex items-center gap-2.5 text-[13px] text-[#94a8a0]">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1a3530] border-t-[#5eead4]" />
        Chargement…
      </div>
    </div>
  );
}

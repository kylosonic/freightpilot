export default function Loading() {
  return (
    <div className="section-shell flex min-h-[60vh] items-center justify-center py-24">
      <div className="flex flex-col items-center gap-4 px-8 py-8 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#d7dfdc] border-t-[#087f72]" />
        <div>
          <p className="kicker">FreightPilot</p>
          <p className="mt-2 text-lg font-semibold text-[#172a24]">Loading FreightPilot…</p>
        </div>
      </div>
    </div>
  );
}

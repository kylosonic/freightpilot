export default function Loading() {
  return (
    <div className="section-shell flex min-h-[60vh] items-center justify-center py-24" role="status">
      <div className="flex flex-col items-center gap-4 px-8 py-8 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#e5e4e0] border-t-[#176b5c]" aria-hidden="true" />
        <div>
          <p className="kicker">FreightPilot</p>
          <p className="mt-2 text-lg font-semibold text-[#252522]">Loading FreightPilot…</p>
        </div>
      </div>
    </div>
  );
}

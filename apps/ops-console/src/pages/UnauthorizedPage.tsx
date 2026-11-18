export function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="fp-shell-surface w-full max-w-md p-8 text-center">
        <h1 className="text-xl font-semibold text-[#172a24]">
          Unauthorized
        </h1>
        <p className="mt-2 text-xs leading-5 text-[#63766f]">You do not have permission to access this page.</p>
      </div>
    </div>
  );
}

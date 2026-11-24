import { Link } from 'react-router-dom';

export function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] p-6">
      <div className="fp-shell-surface w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-4 grid h-9 w-9 place-items-center rounded-md bg-[#2e4f47] text-xs font-semibold text-white">
          FP
        </div>
        <h1 className="text-xl font-semibold text-[#252522]">
          Unauthorized
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#5f5f59]">You do not have permission to access this page.</p>
        <div className="mt-5 flex justify-center gap-2">
          <Link to="/" className="fp-action-primary">
            Back to overview
          </Link>
          <Link to="/login" className="fp-action-secondary">
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

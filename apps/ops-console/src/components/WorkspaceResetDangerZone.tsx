import { useState } from 'react';

import { Dialog } from './ui/Dialog';
import { Panel } from './ui/Panel';
import { useResetWorkspace } from '../hooks/queries';

/**
 * NB-35 admin-gated workspace reset: typed-confirmation modal only — no
 * keyboard shortcut, no light confirm (NB-35.6). The server re-validates
 * OWNER/ADMIN membership on POST /activation/reset (decision #10); the
 * console gates the surface on the global admin role for UX.
 *
 * On success the hook clears auth state, calls POST /auth/logout for the
 * cookie clear, and redirects to /login (NB-35.7).
 */
export function WorkspaceResetDangerZone({
  organizationName,
  isAdmin,
  defaultOpen = false,
}: {
  organizationName: string;
  isAdmin: boolean;
  defaultOpen?: boolean;
}) {
  const resetMutation = useResetWorkspace();
  const [resetModalOpen, setResetModalOpen] = useState(defaultOpen);
  const [typedWorkspaceName, setTypedWorkspaceName] = useState('');

  if (!isAdmin) return null;

  return (
    <Panel
      eyebrow="Danger zone"
      title="Reset workspace to sample data"
      description="Wipe every real CSV-uploaded row and restore the seeded sample workspace. This is nuclear and irreversible — the reset event is recorded in the audit timeline."
    >
      <button
        type="button"
        onClick={() => {
          setTypedWorkspaceName('');
          setResetModalOpen(true);
        }}
        className="glow-ring inline-flex min-h-9 items-center justify-center border border-[#e7c2be] bg-white px-4 text-xs font-semibold text-[#a3342f] transition hover:bg-[#fff8f7]"
      >
        Reset workspace to sample data
      </button>
      {resetMutation.isError ? (
        <p className="mt-3 text-xs text-[#8f302a]">
          Reset failed: {(resetMutation.error as Error)?.message || 'Unknown error'}
        </p>
      ) : null}

      {resetModalOpen ? (
        <Dialog className="max-w-md border-[#e7c2be]">
          <h3 className="text-lg font-semibold text-[#8f302a]">
            Reset workspace to sample data?
          </h3>
          <p className="mt-2 text-xs leading-5 text-[#63766f]">
            All real uploaded data across warehouses, items, fleet assets, inventory, and orders
            will be deleted and replaced with the seeded sample set. Milestones reset to 0 of 5.
            Type <span className="font-semibold text-[#20372f]">{organizationName}</span> to
            confirm.
          </p>
          <input
            value={typedWorkspaceName}
            onChange={(event) => setTypedWorkspaceName(event.target.value)}
            placeholder={organizationName}
            aria-label="Workspace name confirmation"
            className="fp-input mt-4"
          />
          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => setResetModalOpen(false)}
              className="min-h-8 border border-[#cfd9d5] bg-white px-3 text-xs font-semibold text-[#40534c] transition hover:bg-[#eef3f0]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={typedWorkspaceName !== organizationName || resetMutation.isPending}
              onClick={() => resetMutation.mutate(typedWorkspaceName)}
              className="min-h-8 border border-[#b93a36] bg-[#b93a36] px-3 text-xs font-semibold text-white transition hover:bg-[#9f2f2b] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resetMutation.isPending ? 'Resetting...' : 'Reset workspace'}
            </button>
          </div>
        </Dialog>
      ) : null}
    </Panel>
  );
}

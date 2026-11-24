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
      eyebrow="Careful"
      title="Reset workspace to sample data"
      description="Delete all real uploaded data and restore the example data. This cannot be undone."
    >
      <button
        type="button"
        onClick={() => {
          setTypedWorkspaceName('');
          setResetModalOpen(true);
        }}
        className="glow-ring fp-action-secondary !border-[#e7c2be] !text-[#a3342f] hover:!bg-[#fff8f7]"
      >
        Reset workspace to sample data
      </button>

      {resetModalOpen ? (
        <Dialog
          className="max-w-md border-[#e7c2be]"
          title="Reset workspace to sample data?"
          onClose={() => setResetModalOpen(false)}
          actions={
            <>
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="fp-action-secondary !min-h-8 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  !organizationName.trim() ||
                  typedWorkspaceName !== organizationName ||
                  resetMutation.isPending
                }
                onClick={() => resetMutation.mutate(typedWorkspaceName)}
                className="fp-action-danger !min-h-8 text-xs"
              >
                {resetMutation.isPending ? 'Resetting...' : 'Reset workspace'}
              </button>
            </>
          }
        >
          <p className="text-xs leading-5 text-[#5f5f59]">
            All real uploaded data across warehouses, items, fleet assets, inventory, and orders
            will be deleted and replaced with the seeded sample set. Milestones reset to 0 of 5.
            Type <span className="font-semibold text-[#252522]">{organizationName}</span> to
            confirm.
          </p>
          <input
            value={typedWorkspaceName}
            onChange={(event) => setTypedWorkspaceName(event.target.value)}
            placeholder={organizationName}
            aria-label="Workspace name confirmation"
            className="fp-input mt-4"
          />
          {resetMutation.isError ? (
            <p role="alert" className="mt-3 rounded-md border border-[#e7c2be] bg-[#fff8f7] px-3 py-2 text-xs text-[#8f302a]">
              Reset failed: {(resetMutation.error as Error)?.message || 'Unknown error'}
            </p>
          ) : null}
        </Dialog>
      ) : null}
    </Panel>
  );
}

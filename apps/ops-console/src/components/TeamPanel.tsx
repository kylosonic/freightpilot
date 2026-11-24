import { useEffect, useState } from 'react';

import { Dialog } from './ui/Dialog';
import { Panel } from './ui/Panel';
import { useAuth } from '../context/AuthContext';
import {
  changeMemberRole,
  createInvitation,
  getInvitations,
  getTeamMembers,
  removeMember,
  revokeInvitation,
  type InviteRole,
} from '../services/teamApi';
import { apiErrorMessage } from '../services/authErrors';
import type { OrganizationInvitation, OrganizationMember } from '../types/api';

const FIELD = 'fp-input min-h-10';

export function TeamPanel() {
  const { user } = useAuth();
  const canManageTeam = user?.role === 'admin' || user?.role === 'owner';
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteRole>('operator');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteEmailStatus, setInviteEmailStatus] = useState<{
    sent: boolean;
    error: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<OrganizationMember | null>(null);

  async function refresh() {
    try {
      const [nextMembers, nextInvitations] = await Promise.all([getTeamMembers(), getInvitations()]);
      setMembers(nextMembers);
      setInvitations(nextInvitations);
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load workspace members.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (canManageTeam) void refresh();
  }, [canManageTeam]);

  if (!canManageTeam) {
    return (
      <Panel eyebrow="Team" title="People in this workspace">
        <p className="text-xs text-[#5f5f59]">
          Workspace owners and admins can manage teammates. Ask an admin if you need access.
        </p>
      </Panel>
    );
  }

  async function onInvite(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setInviteLink(null);
    setInviteEmailStatus(null);
    setInviting(true);
    try {
      const created = await createInvitation(email, role);
      setInviteLink(created.invite_url);
      setInviteEmailStatus({ sent: created.email_sent, error: created.email_error });
      setEmail('');
      await refresh();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not create the invitation.'));
    } finally {
      setInviting(false);
    }
  }

  async function onRoleChange(member: OrganizationMember, nextRole: InviteRole) {
    setBusyId(member.membership_id);
    try {
      const updated = await changeMemberRole(member.membership_id, nextRole);
      setMembers((current) =>
        current.map((item) => (item.membership_id === updated.membership_id ? updated : item)),
      );
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not change the member role.'));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    setBusyId(removeTarget.membership_id);
    try {
      await removeMember(removeTarget.membership_id);
      setRemoveTarget(null);
      await refresh();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not remove the member.'));
    } finally {
      setBusyId(null);
    }
  }

  async function onRevoke(invitation: OrganizationInvitation) {
    setBusyId(invitation.id);
    try {
      await revokeInvitation(invitation.id);
      await refresh();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not revoke the invitation.'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Panel
      eyebrow="Team"
      title="People in this workspace"
      description="Invitations only work for this workspace. Each link expires after 72 hours. If the person already has an account, they keep their current password."
      actions={
        <button
          type="button"
          onClick={() => void refresh()}
          className="fp-action-quiet !min-h-8"
        >
          Refresh
        </button>
      }
    >
      <div className="space-y-4">
        {error ? (
          <p role="alert" className="rounded-md border border-[#e7c2be] bg-[#fff8f7] p-3 text-xs text-[#8f302a]">
            {error}
          </p>
        ) : null}

        <form onSubmit={onInvite} className="grid gap-3 rounded-md bg-[#f7f7f5] p-3 md:grid-cols-[1fr_180px_auto]">
          <label className="grid gap-1.5 text-xs font-medium text-[#5f5f59]">
            Email
            <input
              className={FIELD}
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="teammate@company.com"
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-[#5f5f59]">
            Role
            <select className={FIELD} value={role} onChange={(event) => setRole(event.target.value as InviteRole)}>
              <option value="viewer">Viewer</option>
              <option value="operator">Operator</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button type="submit" disabled={inviting} className="fp-action-primary self-end">
            {inviting ? 'Sending...' : 'Send invite'}
          </button>
        </form>

        {inviteLink ? (
          <div role="status" className="rounded-md border border-[#b9dcd1] bg-[#edf7f1] p-3">
            <p className="text-xs font-semibold text-[#14745f]">Invitation created</p>
            <p className="mt-1 text-[11px] text-[#5f5f59]">
              {inviteEmailStatus?.sent
                ? 'The invitation email was sent. The one-time link is also available below.'
                : `${inviteEmailStatus?.error || 'Email delivery is unavailable.'} Copy the one-time link and share it securely.`}
            </p>
            <code className="mt-2 block break-all rounded border border-[#e5e4e0] bg-white p-2 text-[11px] text-[#252522]">
              {inviteLink}
            </code>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="border-t border-[#e5e4e0] pt-3">
            <h3 className="text-xs font-semibold text-[#252522]">Members</h3>
            <div className="mt-3 space-y-2">
              {loading ? <p className="text-xs text-[#73736e]">Loading members…</p> : null}
              {members.map((member) => (
                <div key={member.membership_id} className="border-t border-[#efeeea] py-2 first:border-t-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-[#252522]">{member.full_name || member.username}</p>
                      <p className="text-[11px] text-[#73736e]">{member.email || member.username}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.role === 'owner' ? (
                        <span className="text-xs font-semibold text-[#885100]">Owner</span>
                      ) : (
                        <select
                          aria-label={`Role for ${member.full_name || member.username}`}
                          disabled={busyId === member.membership_id}
                          className="fp-input !w-auto !px-2.5 !py-1.5 text-xs"
                          value={member.role}
                          onChange={(event) => void onRoleChange(member, event.target.value as InviteRole)}
                        >
                          <option value="viewer">Viewer</option>
                          <option value="operator">Operator</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}
                      {member.username !== user.username && member.role !== 'owner' ? (
                        <button
                          type="button"
                          disabled={busyId === member.membership_id}
                          onClick={() => setRemoveTarget(member)}
                          className="fp-action-quiet !min-h-8 text-xs !text-[#a3342f]"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-[#e5e4e0] pt-3">
            <h3 className="text-xs font-semibold text-[#252522]">Pending invitations</h3>
            <div className="mt-3 space-y-2">
              {invitations.filter((item) => item.status === 'pending').length === 0 ? (
                <p className="text-xs text-[#73736e]">No pending invitations.</p>
              ) : null}
              {invitations
                .filter((item) => item.status === 'pending')
                .map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between gap-3 border-t border-[#efeeea] py-2 first:border-t-0"
                  >
                    <div>
                      <p className="text-xs text-[#252522]">{invitation.email}</p>
                      <p className="text-[11px] text-[#73736e]">
                        {invitation.role} · expires {new Date(invitation.expires_at).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busyId === invitation.id}
                      onClick={() => void onRevoke(invitation)}
                      className="fp-action-quiet !min-h-8 text-xs !text-[#a3342f]"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {removeTarget ? (
        <Dialog
          eyebrow="Remove member"
          title={`Remove ${removeTarget.full_name || removeTarget.username}?`}
          description="They will lose access to this workspace immediately."
          onClose={() => setRemoveTarget(null)}
          actions={
            <>
              <button type="button" onClick={() => setRemoveTarget(null)} className="fp-action-secondary !min-h-8 text-xs">
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === removeTarget.membership_id}
                onClick={() => void confirmRemove()}
                className="fp-action-danger !min-h-8 text-xs"
              >
                {busyId === removeTarget.membership_id ? 'Removing...' : 'Remove'}
              </button>
            </>
          }
        />
      ) : null}
    </Panel>
  );
}

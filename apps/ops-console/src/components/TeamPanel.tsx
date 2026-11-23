import { useEffect, useState } from 'react';

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

const FIELD = 'fp-input min-h-9';

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
      <section className="border-t border-[#e5e4e0] pt-4">
        <p className="text-xs text-[#63766f]">
          Workspace owners and admins can manage teammates. Ask an admin if you need access.
        </p>
      </section>
    );
  }

  async function onInvite(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setInviteLink(null);
    setInviteEmailStatus(null);
    try {
      const created = await createInvitation(email, role);
      setInviteLink(created.invite_url);
      setInviteEmailStatus({ sent: created.email_sent, error: created.email_error });
      setEmail('');
      await refresh();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not create the invitation.'));
    }
  }

  async function onRoleChange(member: OrganizationMember, nextRole: InviteRole) {
    try {
      const updated = await changeMemberRole(member.membership_id, nextRole);
      setMembers((current) =>
        current.map((item) => (item.membership_id === updated.membership_id ? updated : item)),
      );
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not change the member role.'));
    }
  }

  async function onRemove(member: OrganizationMember) {
    if (!window.confirm(`Remove ${member.username} from this workspace?`)) return;
    try {
      await removeMember(member.membership_id);
      await refresh();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not remove the member.'));
    }
  }

  async function onRevoke(invitation: OrganizationInvitation) {
    try {
      await revokeInvitation(invitation.id);
      await refresh();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not revoke the invitation.'));
    }
  }

  return (
    <section className="space-y-4 border-t border-[#e5e4e0] pt-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium text-[#73736e]">Team</p>
          <h2 className="mt-1 text-sm font-semibold text-[#252522]">People in this workspace</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[#63766f]">
            Invitations only work for this workspace. Each link expires after 72 hours.
            If the person already has an account, they keep their current password.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="fp-action-quiet !min-h-8"
        >
          Refresh
        </button>
      </div>

      {error ? <p className="border border-[#e7c2be] bg-[#fff8f7] p-3 text-xs text-[#8f302a]">{error}</p> : null}

      <form onSubmit={onInvite} className="grid gap-3 rounded-md bg-[#f7f7f5] p-3 md:grid-cols-[1fr_180px_auto]">
        <label className="grid gap-1.5 text-xs text-[#63766f]">
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
        <label className="grid gap-1.5 text-xs text-[#63766f]">
          Role
          <select className={FIELD} value={role} onChange={(event) => setRole(event.target.value as InviteRole)}>
            <option value="viewer">Viewer</option>
            <option value="operator">Operator</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button className="fp-action-primary self-end">
          Send invite
        </button>
      </form>

      {inviteLink ? (
        <div className="border border-[#b9dcd1] bg-[#f3faf7] p-3">
          <p className="text-xs font-semibold text-[#14745f]">Invitation created</p>
          <p className="mt-1 text-[11px] text-[#4f6e63]">
            {inviteEmailStatus?.sent
              ? 'The invitation email was sent. The one-time link is also available below.'
              : `${inviteEmailStatus?.error || 'Email delivery is unavailable.'} Copy the one-time link and share it securely.`}
          </p>
          <code className="mt-2 block break-all border border-[#d7dfdc] bg-white p-2 text-[11px] text-[#25483f]">{inviteLink}</code>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="border-t border-[#e5e4e0] pt-3">
          <h3 className="text-xs font-semibold text-[#20372f]">Members</h3>
          <div className="mt-3 space-y-2">
            {loading ? <p className="text-xs text-[#63766f]">Loading members…</p> : null}
            {members.map((member) => (
              <div key={member.membership_id} className="border-t border-[#e6ebe8] py-2 first:border-t-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-[#20372f]">{member.full_name || member.username}</p>
                    <p className="text-[11px] text-[#63766f]">{member.email || member.username}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {member.role === 'owner' ? (
                      <span className="text-xs font-semibold text-[#885100]">Owner</span>
                    ) : (
                      <select
                        className="border border-[#d7dfdc] bg-white px-2 py-1 text-xs text-[#40534c]"
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
                        onClick={() => void onRemove(member)}
                        className="text-xs text-[#a3342f] hover:text-[#7d2924]"
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
          <h3 className="text-xs font-semibold text-[#20372f]">Pending invitations</h3>
          <div className="mt-3 space-y-2">
            {invitations.filter((item) => item.status === 'pending').length === 0 ? (
              <p className="text-xs text-[#63766f]">No pending invitations.</p>
            ) : null}
            {invitations
              .filter((item) => item.status === 'pending')
              .map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between gap-3 border-t border-[#e6ebe8] py-2 first:border-t-0"
                >
                  <div>
                    <p className="text-xs text-[#20372f]">{invitation.email}</p>
                    <p className="text-[11px] text-[#63766f]">
                      {invitation.role} · expires {new Date(invitation.expires_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void onRevoke(invitation)}
                    className="text-xs text-[#a3342f] hover:text-[#7d2924]"
                  >
                    Revoke
                  </button>
                </div>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}

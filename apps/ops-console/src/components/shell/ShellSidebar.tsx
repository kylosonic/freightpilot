import type { UserRead } from '../../types/auth';
import { WorkspaceRail } from './WorkspaceRail';

type ShellSidebarProps = {
  user: UserRead | null | undefined;
  onLogout: () => void | Promise<void>;
  onNavigate?: () => void;
  compact?: boolean;
  onToggleCompact?: () => void;
};

export function ShellSidebar({ user, onLogout, onNavigate, compact, onToggleCompact }: ShellSidebarProps) {
  return <WorkspaceRail user={user} onLogout={onLogout} onNavigate={onNavigate} compact={compact} onToggleCompact={onToggleCompact} />;
}

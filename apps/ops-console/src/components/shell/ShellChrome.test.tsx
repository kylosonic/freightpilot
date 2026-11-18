import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { ShellHeader } from './ShellHeader';
import { ShellSidebar } from './ShellSidebar';
import type { UserRead } from '../../types/auth';

const fixtureUser: UserRead = {
  id: 'user-1',
  username: 'captain',
  email: 'captain@testco.com',
  full_name: 'Captain Test',
  role: 'operator',
  is_active: true,
  created_at: '2026-08-08T00:00:00Z',
};

describe('Shell chrome', () => {
  it('renders the plain-language navigation groups, routes, and footer identity', () => {
    const html = renderToString(
      <StaticRouter location="/routes">
        <ShellSidebar user={fixtureUser} onLogout={() => undefined} />
      </StaticRouter>,
    );

    expect(html).toContain('FreightPilot');
    expect(html).toContain('Operations workspace');
    expect(html).toContain('Operations');
    expect(html).toContain('Workspace');
    expect(html).toContain('Overview');
    expect(html).toContain('Routes');
    expect(html).toContain('Shipments');
    expect(html).toContain('Exceptions');
    expect(html).toContain('Planning');
    expect(html).toContain('Import data');
    expect(html).toContain('Payments');
    expect(html).toContain('Verify payments');
    expect(html).toContain('Integrations');
    expect(html).toContain('Log out');
    expect(html).toContain('captain@testco.com');
    expect(html).toContain('operator');
    expect(html).toContain('aria-current="page"');
  });

  it('renders the shell header context label, descriptor, and identity chips', () => {
    const html = renderToString(
      <StaticRouter location="/">
        <ShellHeader
          contextLabel="Freight operations"
          descriptor="Your routes, deliveries, and workspace."
          user={fixtureUser}
          onOpenNavigation={() => undefined}
        />
      </StaticRouter>,
    );

    expect(html).toContain('Freight operations');
    expect(html).toContain('Your routes, deliveries, and workspace.');
    expect(html).toContain('operator');
    expect(html).toContain('captain@testco.com');
    expect(html).toContain('Open navigation');
  });
});

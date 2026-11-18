import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import PrivacyPage from './privacy/page';
import SecurityPage from './security/page';
import StatusPage from './status/page';
import TermsPage from './terms/page';

describe('public trust pages', () => {
  it('privacy page states the data boundary without claiming a certification', () => {
    const html = renderToString(<PrivacyPage />);

    expect(html).toContain('What we keep');
    expect(html).toContain('Your signed data-processing agreement still applies');
    expect(html).toContain('We do not sell them or use them to train a shared public model');
  });

  it('terms page keeps recommendations advisory', () => {
    const html = renderToString(<TermsPage />);

    expect(html).toContain('Routes, demand estimates, cash warnings, and alerts are suggestions');
    expect(html).toContain('An authorized person still makes the dispatch, payment, and customer decisions');
  });

  it('security page states current limits', () => {
    const html = renderToString(<SecurityPage />);

    expect(html).toContain('What we protect');
    expect(html).toContain('not a claim that we hold SOC 2');
    expect(html).toContain('Report a security problem');
  });

  it('status page limits its health claim to the API and database', () => {
    const html = renderToString(<StatusPage />);

    expect(html).toContain('What this page checks');
    expect(html).toContain('does not prove that every route');
    expect(html).toContain('CHECKING');
  });
});

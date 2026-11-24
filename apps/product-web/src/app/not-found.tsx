import type { Metadata } from 'next';

import { MagneticLink } from '@/components/site/magnetic-link';
import { PageHero } from '@/components/site/page-hero';

export const metadata: Metadata = {
  title: 'Page not found',
  description: 'The requested FreightPilot page could not be found.',
};

export default function NotFound() {
  return (
    <PageHero
      eyebrow="Page not found"
      title="This page is not part of the workspace."
      description="Return to the product overview, explore the platform, or create a workspace."
      actions={
        <>
          <MagneticLink href="/" variant="primary">
            Back to home
          </MagneticLink>
          <MagneticLink href="/launch" variant="secondary">
            Open launch page
          </MagneticLink>
        </>
      }
    />
  );
}

import { MagneticLink } from '@/components/site/magnetic-link';
import { PageHero } from '@/components/site/page-hero';

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

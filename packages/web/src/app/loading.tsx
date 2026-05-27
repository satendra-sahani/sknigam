import { PageSkeleton } from '@/components/landing/PageSkeleton';

/**
 * Root segment loading state — fires during route transitions to `/` and
 * while server-side rendering streams content.  The skeleton mirrors the
 * homepage rhythm so the swap to the real content is invisible.
 */
export default function Loading() {
  return <PageSkeleton variant="landing" theme="studio" />;
}

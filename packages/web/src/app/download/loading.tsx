import { PageSkeleton } from '@/components/landing/PageSkeleton';

/**
 * /download segment loading state — same shimmer chrome but with the
 * download-page hero rhythm (phone mockup placeholder + dual app cards).
 */
export default function Loading() {
  return <PageSkeleton variant="download" theme="studio" />;
}

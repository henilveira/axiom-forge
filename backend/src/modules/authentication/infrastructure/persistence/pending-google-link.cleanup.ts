import { PENDING_GOOGLE_LINK_CLEANUP_BATCH_SIZE } from '../../application/policies/pending-google-link.constants';

export function boundedPendingGoogleLinkCleanupLimit(limit: number): number {
  return Math.max(0, Math.min(limit, PENDING_GOOGLE_LINK_CLEANUP_BATCH_SIZE));
}

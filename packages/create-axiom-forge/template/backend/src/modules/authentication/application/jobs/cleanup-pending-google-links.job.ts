import type { AuthenticationRepositoryPort } from '../ports/authentication-repository.port';
import type { ClockPort } from '../ports/clock.port';
import {
  PENDING_GOOGLE_LINK_CLEANUP_BATCH_SIZE,
  PENDING_GOOGLE_LINK_TERMINAL_RETENTION_MS,
} from '../policies/pending-google-link.constants';

export class CleanupPendingGoogleLinksJob {
  public constructor(
    private readonly repository: AuthenticationRepositoryPort,
    private readonly clock: ClockPort,
    private readonly batchSize = PENDING_GOOGLE_LINK_CLEANUP_BATCH_SIZE,
    private readonly retentionMs = PENDING_GOOGLE_LINK_TERMINAL_RETENTION_MS,
  ) {}

  public async run(): Promise<{
    readonly expired: number;
    readonly deleted: number;
  }> {
    return await this.repository.withTransaction((repository) =>
      repository.cleanupPendingGoogleLinks(
        this.clock.now(),
        this.retentionMs,
        this.batchSize,
      ),
    );
  }
}

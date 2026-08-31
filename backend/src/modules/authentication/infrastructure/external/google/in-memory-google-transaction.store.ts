import type {
  GoogleAuthorizationRequest,
  GoogleTransactionStorePort,
} from '../../../application/ports/google-oidc.port';

export class InMemoryGoogleTransactionStore implements GoogleTransactionStorePort {
  private readonly transactions = new Map<string, GoogleAuthorizationRequest>();

  public save(transaction: GoogleAuthorizationRequest): void {
    this.transactions.set(transaction.state, transaction);
  }

  public consume(state: string, now: Date): GoogleAuthorizationRequest | null {
    const transaction = this.transactions.get(state);
    this.transactions.delete(state);
    if (
      transaction === undefined ||
      transaction.expiresAt.getTime() <= now.getTime()
    ) {
      return null;
    }
    return transaction;
  }
}

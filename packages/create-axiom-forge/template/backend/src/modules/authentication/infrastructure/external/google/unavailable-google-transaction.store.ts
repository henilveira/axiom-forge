import type { GoogleTransactionStorePort } from '../../../application/ports/google-oidc.port';

export class UnavailableGoogleTransactionStore implements GoogleTransactionStorePort {
  public save(): never {
    throw new Error('sealed Google transaction store is not configured');
  }

  public consume(): never {
    throw new Error('sealed Google transaction store is not configured');
  }
}

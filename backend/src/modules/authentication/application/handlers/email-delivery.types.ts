type AuthenticationEmailDeliveryCategory = 'EMAIL_VERIFICATION' | 'MAGIC_LOGIN';

export interface AuthenticationEmailDeliveryObservation {
  readonly outcome: string;
  readonly errorCode: string | null;
}

export interface AuthenticationEmailDeliveryTask {
  readonly challengeId: string;
  readonly category: AuthenticationEmailDeliveryCategory;
  readonly correlationId: string;
  readonly recordedAt: Date;
  readonly send: () => void | Promise<void>;
}

import type {
  AuthenticationMethod,
  FailureCategory,
} from '../types/authentication.types';

export type AuthenticationDomainEvent =
  | {
      readonly type: 'UserRegistrationStarted';
      readonly result: 'ACCEPTED' | 'DUPLICATE' | 'REJECTED';
      readonly emailFingerprint: string;
      readonly occurredAt: Date;
    }
  | {
      readonly type: 'UserRegistered';
      readonly userId: string;
      readonly authMethod: AuthenticationMethod;
      readonly emailVerified: boolean;
      readonly occurredAt: Date;
    }
  | {
      readonly type: 'EmailVerificationIssued';
      readonly userId: string;
      readonly challengeId: string;
      readonly expiresAt: Date;
      readonly occurredAt: Date;
    }
  | {
      readonly type: 'EmailVerified';
      readonly userId: string;
      readonly occurredAt: Date;
    }
  | {
      readonly type: 'AuthenticationSucceeded';
      readonly userId: string;
      readonly authMethod: AuthenticationMethod;
      readonly occurredAt: Date;
    }
  | {
      readonly type: 'AuthenticationFailed';
      readonly authMethod: AuthenticationMethod;
      readonly failureCategory: FailureCategory;
      readonly emailFingerprint?: string;
      readonly occurredAt: Date;
    }
  | {
      readonly type: 'ExternalIdentityLinked';
      readonly userId: string;
      readonly provider: 'google';
      readonly subjectFingerprint: string;
      readonly occurredAt: Date;
    }
  | {
      readonly type: 'MagicLinkIssued';
      readonly challengeId: string;
      readonly expiresAt: Date;
      readonly emailFingerprint: string;
      readonly occurredAt: Date;
    }
  | {
      readonly type: 'MagicLinkConsumed';
      readonly userId: string;
      readonly challengeId: string;
      readonly occurredAt: Date;
    }
  | {
      readonly type: 'SessionStarted';
      readonly sessionId: string;
      readonly userId: string;
      readonly authMethod: AuthenticationMethod;
      readonly occurredAt: Date;
    }
  | {
      readonly type: 'SessionRefreshed';
      readonly sessionId: string;
      readonly familyId: string;
      readonly occurredAt: Date;
    }
  | {
      readonly type: 'SessionRevoked';
      readonly sessionId: string;
      readonly reasonCategory: string;
      readonly occurredAt: Date;
    }
  | {
      readonly type: 'SessionFamilyReplayDetected';
      readonly familyId: string;
      readonly userId: string;
      readonly occurredAt: Date;
    };

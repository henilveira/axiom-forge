import { AuthenticationError } from '../errors/authentication.error';
import type { AuthenticationDomainEvent } from '../events/authentication.event';
import { ExternalIdentity } from '../entities/external-identity.entity';
import { LocalCredential } from '../entities/local-credential.entity';
import type { NormalizedEmail } from '../value-objects/normalized-email.value-object';
import type {
  AuthenticationMethod,
  UserSnapshot,
} from '../types/authentication.types';
import type {
  PasswordUserRegistrationProps,
  UserAggregateProps,
} from '../types/user.types';

export class UserAggregate {
  private readonly events: AuthenticationDomainEvent[] = [];
  private props: UserAggregateProps;

  private constructor(props: UserAggregateProps) {
    this.props = { ...props };
  }

  public static registerWithPassword(
    props: PasswordUserRegistrationProps,
    email: NormalizedEmail,
  ): UserAggregate {
    const credential = LocalCredential.create(props.passwordHash);
    const aggregate = new UserAggregate({
      id: props.id,
      version: 1,
      emailNormalized: email.value,
      status: 'EMAIL_VERIFICATION_PENDING',
      emailVerifiedAt: null,
      termsVersion: props.termsVersion,
      termsAcceptedAt: props.acceptedAt,
      localCredentialHash: credential.passwordHash,
      externalIdentity: null,
    });
    aggregate.events.push({
      type: 'UserRegistered',
      userId: props.id,
      authMethod: 'PASSWORD',
      emailVerified: false,
      occurredAt: props.occurredAt,
    });
    return aggregate;
  }

  public static registerWithGoogle(
    id: string,
    email: NormalizedEmail,
    identity: ExternalIdentity,
    occurredAt: Date,
  ): UserAggregate {
    const aggregate = new UserAggregate({
      id,
      version: 1,
      emailNormalized: email.value,
      status: 'ACTIVE',
      emailVerifiedAt: occurredAt,
      termsVersion: null,
      termsAcceptedAt: null,
      localCredentialHash: null,
      externalIdentity: {
        provider: identity.provider,
        subject: identity.subject,
        email: identity.email,
      },
    });
    aggregate.events.push({
      type: 'UserRegistered',
      userId: id,
      authMethod: 'GOOGLE',
      emailVerified: true,
      occurredAt,
    });
    return aggregate;
  }

  public static restore(props: UserAggregateProps): UserAggregate {
    return new UserAggregate(props);
  }

  public get snapshot(): UserSnapshot {
    return { ...this.props };
  }

  public pullEvents(): AuthenticationDomainEvent[] {
    const pending = [...this.events];
    this.events.length = 0;
    return pending;
  }

  public verifyEmail(occurredAt: Date): void {
    if (this.props.status !== 'EMAIL_VERIFICATION_PENDING') {
      throw new AuthenticationError('ACCOUNT_INACTIVE', 'ACCOUNT_INACTIVE');
    }
    this.props = {
      ...this.props,
      status: 'ACTIVE',
      emailVerifiedAt: occurredAt,
    };
    this.events.push({
      type: 'EmailVerified',
      userId: this.props.id,
      occurredAt,
    });
  }

  public attachGoogleIdentity(
    subject: string,
    email: string,
    occurredAt: Date,
    subjectFingerprint: string,
  ): void {
    if (
      this.props.status === 'DISABLED' ||
      this.props.externalIdentity != null
    ) {
      throw new AuthenticationError(
        'ACCOUNT_LINKING_REQUIRED',
        'OAUTH_INVALID',
      );
    }
    const identity = ExternalIdentity.google(subject, email);
    this.props = {
      ...this.props,
      externalIdentity: {
        provider: identity.provider,
        subject: identity.subject,
        email: identity.email,
      },
    };
    this.events.push({
      type: 'ExternalIdentityLinked',
      userId: this.props.id,
      provider: 'google',
      subjectFingerprint,
      occurredAt,
    });
  }

  public disable(): void {
    this.props = { ...this.props, status: 'DISABLED' };
  }

  public canAuthenticate(method: AuthenticationMethod): boolean {
    if (this.props.status !== 'ACTIVE') {
      return false;
    }
    if (method === 'PASSWORD') {
      return (
        this.props.emailVerifiedAt != null &&
        this.props.localCredentialHash != null
      );
    }
    return true;
  }
}

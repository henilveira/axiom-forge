import { Inject, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AuthenticationController } from './modules/authentication/interfaces/http/authentication.controller';
import { EmailDiagnosticsController } from './modules/authentication/interfaces/http/email-diagnostics.controller';
import { AuthenticationExceptionFilter } from './modules/authentication/interfaces/http/authentication.exception.filter';
import { AUTHENTICATION_RUNTIME } from './modules/authentication/application/ports/authentication-runtime.port';
import type { AuthenticationRuntime } from './modules/authentication/application/ports/authentication-runtime.port';
import { loadAuthenticationConfig } from './modules/authentication/infrastructure/config/authentication.config';
import { isEmailDiagnosticsEnabled } from './modules/authentication/infrastructure/config/authentication-email.config';
import { createDevelopmentAuthenticationRuntime } from './modules/authentication/infrastructure/composition/development-authentication-runtime.factory';
import { createProductionAuthenticationRuntime } from './modules/authentication/infrastructure/composition/production-authentication-runtime.factory';
import {
  AUTHENTICATION_PRODUCTION_PROVIDERS,
  type ProductionAuthenticationProviders,
} from './modules/authentication/infrastructure/composition/production-authentication.types';
import {
  EMAIL_SENT_READER,
  type EmailSentReaderPort,
} from './modules/authentication/application/ports/email-reader.port';
import { ResendEmailReaderAdapter } from './modules/authentication/infrastructure/email/resend-email-reader.adapter';
import type { AuthenticationRuntimeWithLifecycle } from './modules/authentication/infrastructure/composition/authentication-runtime-lifecycle.types';

@Module({
  controllers: [
    AuthenticationController,
    ...(isEmailDiagnosticsEnabled() ? [EmailDiagnosticsController] : []),
  ],
  providers: [
    {
      provide: AUTHENTICATION_RUNTIME,
      useFactory: (
        productionProviders: ProductionAuthenticationProviders | undefined,
      ): AuthenticationRuntimeWithLifecycle => {
        const config = loadAuthenticationConfig();
        if (process.env['NODE_ENV'] === 'test') {
          return createDevelopmentAuthenticationRuntime(config);
        }
        if (process.env['NODE_ENV'] === 'development') {
          return createDevelopmentAuthenticationRuntime(config, {
            allowExternalEmailProvider: true,
          });
        }
        return createProductionAuthenticationRuntime(
          config,
          productionProviders,
        );
      },
      inject: [{ token: AUTHENTICATION_PRODUCTION_PROVIDERS, optional: true }],
    },
    {
      provide: EMAIL_SENT_READER,
      useFactory: (
        runtime: AuthenticationRuntime,
      ): EmailSentReaderPort | undefined => {
        if (
          !runtime.config.emailDiagnosticsEnabled ||
          !isEmailDiagnosticsEnabled()
        ) {
          return undefined;
        }
        return new ResendEmailReaderAdapter({
          apiKey: runtime.config.resendEmailsReadApiKey,
        });
      },
      inject: [AUTHENTICATION_RUNTIME],
    },
    { provide: APP_FILTER, useClass: AuthenticationExceptionFilter },
  ],
})
export class AuthenticationModule implements OnModuleInit, OnModuleDestroy {
  public constructor(
    @Inject(AUTHENTICATION_RUNTIME)
    private readonly runtime: AuthenticationRuntimeWithLifecycle,
  ) {}

  public async onModuleInit(): Promise<void> {
    if (this.runtime.initialize !== undefined) {
      await this.runtime.initialize();
    }
    if (this.runtime.messaging !== undefined) {
      await this.runtime.messaging.start();
    }
  }

  public async onModuleDestroy(): Promise<void> {
    if (this.runtime.messaging !== undefined) {
      await this.runtime.messaging.stop();
    }
    if (this.runtime.shutdown !== undefined) {
      await this.runtime.shutdown();
    }
  }
}

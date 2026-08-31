import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  loadDotEnvFile,
  requireDatabaseUrl,
} from './infrastructure/config/env';
import { readBackendPort } from './infrastructure/config/backend.config';
import {
  SWAGGER_DESCRIPTION,
  SWAGGER_TITLE,
  SWAGGER_UI_PATH,
  SWAGGER_VERSION,
} from './swagger.constants';
import type { AppModule as ApplicationModule } from './app.module.js';

async function bootstrap() {
  loadDotEnvFile();
  requireDatabaseUrl();
  const appModule = (await import('./app.module.js')) as {
    readonly AppModule: typeof ApplicationModule;
  };
  const app = await NestFactory.create(appModule.AppModule);
  const swaggerConfig = new DocumentBuilder()
    .setTitle(SWAGGER_TITLE)
    .setDescription(SWAGGER_DESCRIPTION)
    .setVersion(SWAGGER_VERSION)
    .addCookieAuth('app_session')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(SWAGGER_UI_PATH, app, document);
  await app.listen(readBackendPort());
}
void bootstrap();

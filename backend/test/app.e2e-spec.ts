import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '@';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env['AUTH_FINGERPRINT_SECRET'] =
      'test-only-fingerprint-secret-with-enough-length';
    process.env['AUTH_EMAIL_VERIFICATION_TTL_MS'] = '600000';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  afterEach(async () => {
    await app.close();
    delete process.env['AUTH_FINGERPRINT_SECRET'];
    delete process.env['AUTH_EMAIL_VERIFICATION_TTL_MS'];
  });
});

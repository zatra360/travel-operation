import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Travel Operation API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Public Routes', () => {
    it('POST /api/v1/auth/login - should validate email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ password: 'test' })
        .expect(400);
    });

    it('POST /api/v1/auth/login - should return 401 for invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'wrongpass' })
        .expect(401);
    });
  });

  describe('Protected Routes', () => {
    it('GET /api/v1/platform/tenants - should return 401 without token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/platform/tenants')
        .expect(401);
    });

    it('GET /api/v1/tenant/branches - should return 401 without token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/tenant/branches')
        .expect(401);
    });
  });
});

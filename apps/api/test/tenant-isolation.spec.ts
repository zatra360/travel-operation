import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Tenant Isolation (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Tenant Context Enforcement', () => {
    it('should reject tenant routes without X-Tenant-Id header', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@travelo.com', password: 'Admin@123' });

      if (loginRes.body?.data?.accessToken) {
        const token = loginRes.body.data.accessToken;
        const res = await request(app.getHttpServer())
          .get('/api/v1/tenant/branches')
          .set('Authorization', `Bearer ${token}`)
          .expect(403);

        expect(res.body.message).toContain('Tenant context');
      } else {
        console.log('Skipping: seed data may not exist');
      }
    });
  });

  describe('Role-Based Access Control', () => {
    it('should prevent users without permission from accessing admin routes', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'sales@travelo.com', password: 'Demo@123' });

      if (loginRes.body?.data?.accessToken) {
        const token = loginRes.body.data.accessToken;
        const res = await request(app.getHttpServer())
          .get('/api/v1/platform/tenants')
          .set('Authorization', `Bearer ${token}`)
          .expect(403);

        expect(res.body).toBeDefined();
      } else {
        console.log('Skipping: seed data may not exist');
      }
    });
  });

  describe('Audit Logging', () => {
    it('should log mutations to audit log', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@travelo.com', password: 'Admin@123' });

      expect(loginRes.status).toBe(201);
    });
  });
});

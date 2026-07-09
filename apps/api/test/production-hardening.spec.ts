import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Production Hardening (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let tenantId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@travelo.com', password: 'Admin@123' });
    adminToken = res.body?.data?.accessToken || res.body?.accessToken;

    const tenantRes = await request(app.getHttpServer())
      .get('/api/v1/platform/tenants')
      .set('Authorization', `Bearer ${adminToken}`);
      const tenants = (res.body?.data?.data) || res.body?.data || res.body;
      if (Array.isArray(tenants) && tenants.length > 0) tenantId = tenants[0].id;
  });

  afterAll(async () => { await app.close(); });

  describe('Auth', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'admin@travelo.com', password: 'Admin@123' });
      expect(res.status).toBe(201);
      const data = res.body?.data || res.body;
      expect(data.accessToken).toBeDefined();
      expect(data.user.email).toBe('admin@travelo.com');
    });

    it('should reject invalid credentials', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'admin@travelo.com', password: 'wrong' });
      expect([400, 401]).toContain(res.status);
    });

    it('should return profile for authenticated user', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/auth/profile').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe('Health', () => {
    it('should return ok', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health');
      expect(res.status).toBe(200);
    });
  });

  describe('Tenant Isolation', () => {
    it('should list platform tenants', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/platform/tenants').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      const data = (res.body?.data?.data) || res.body?.data || res.body;
      expect(data).toBeDefined();
    });

    it('should reject tenant route without X-Tenant-Id', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/tenant/leads').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
    });

    it('should allow tenant route with valid X-Tenant-Id', async () => {
      if (!tenantId) return;
      const loginRes = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'admin@tripnow.com', password: 'Demo@123' });
      const token = loginRes.body?.data?.accessToken || loginRes.body?.accessToken;
      if (!token) return;
      const res = await request(app.getHttpServer()).get('/api/v1/tenant/leads').set('Authorization', `Bearer ${token}`).set('X-Tenant-Id', tenantId);
      expect(res.status).toBe(200);
    });

    it('should reject with invalid X-Tenant-Id', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/tenant/leads').set('Authorization', `Bearer ${adminToken}`).set('X-Tenant-Id', 'nonexistent-id');
      expect(res.status).toBe(403);
    });
  });

  describe('RBAC', () => {
    it('should reject platform route for non-admin user', async () => {
      const loginRes = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'sales@travelo.com', password: 'Demo@123' });
      const token = loginRes.body?.data?.accessToken || loginRes.body?.accessToken;
      if (!token) return;
      const res = await request(app.getHttpServer()).get('/api/v1/platform/tenants').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });

  describe('Master Data', () => {
    it('should return effective lookup data', async () => {
      if (!tenantId) return;
      const loginRes = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'admin@tripnow.com', password: 'Demo@123' });
      const token = loginRes.body?.data?.accessToken || loginRes.body?.accessToken;
      if (!token) return;
      const res = await request(app.getHttpServer()).get('/api/v1/tenant/master-data/lookup/lead-status').set('Authorization', `Bearer ${token}`).set('X-Tenant-Id', tenantId);
      expect(res.status).toBe(200);
    });
  });

  describe('Lead CRUD', () => {
    it('should create lead', async () => {
      if (!tenantId) return;
      const loginRes = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'admin@tripnow.com', password: 'Demo@123' });
      const token = loginRes.body?.data?.accessToken || loginRes.body?.accessToken;
      if (!token) return;
      const res = await request(app.getHttpServer()).post('/api/v1/tenant/leads')
        .set('Authorization', `Bearer ${token}`).set('X-Tenant-Id', tenantId)
        .send({ fullName: 'Test Lead', email: 'test@example.com', status: 'NEW', priority: 'MEDIUM', source: 'WEBSITE', serviceType: 'FLIGHT' });
      expect(res.status).toBe(201);
    });

    it('should list leads', async () => {
      if (!tenantId) return;
      const loginRes = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'admin@tripnow.com', password: 'Demo@123' });
      const token = loginRes.body?.data?.accessToken || loginRes.body?.accessToken;
      if (!token) return;
      const res = await request(app.getHttpServer()).get('/api/v1/tenant/leads').set('Authorization', `Bearer ${token}`).set('X-Tenant-Id', tenantId);
      expect(res.status).toBe(200);
    });
  });

  describe('Finance Safety', () => {
    it('should block payment for cross-tenant booking', async () => {
      if (!tenantId) return;
      const loginRes = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'admin@tripnow.com', password: 'Demo@123' });
      const token = loginRes.body?.data?.accessToken || loginRes.body?.accessToken;
      if (!token) return;
      const res = await request(app.getHttpServer()).post('/api/v1/tenant/payments')
        .set('Authorization', `Bearer ${token}`).set('X-Tenant-Id', tenantId)
        .send({ bookingId: 'nonexistent-id', amount: 100 });
      expect([400, 403, 404]).toContain(res.status);
    });
  });
});

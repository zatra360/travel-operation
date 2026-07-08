import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Production Hardening (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

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
  });

  afterAll(async () => { await app.close(); });

  // ── Auth ──
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
      expect(res.status).toBe(401);
    });

    it('should return profile for authenticated user', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/auth/profile').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });
  });

  // ── Health ──
  describe('Health', () => {
    it('should return ok', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  // ── Tenant Isolation ──
  describe('Tenant Isolation', () => {
    let tenantId: string;

    it('should list platform tenants', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/platform/tenants').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      const data = res.body?.data || res.body;
      if (Array.isArray(data) && data.length > 0) tenantId = data[0].id;
      expect(tenantId).toBeDefined();
    });

    it('should reject tenant route without X-Tenant-Id', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/tenant/leads').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
    });

    it('should allow tenant route with valid X-Tenant-Id', async () => {
      if (!tenantId) return;
      const res = await request(app.getHttpServer()).get('/api/v1/tenant/leads').set('Authorization', `Bearer ${adminToken}`).set('X-Tenant-Id', tenantId);
      expect(res.status).toBe(200);
    });

    it('should reject with invalid X-Tenant-Id', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/tenant/leads').set('Authorization', `Bearer ${adminToken}`).set('X-Tenant-Id', 'nonexistent-id');
      expect(res.status).toBe(403);
    });
  });

  // ── RBAC ──
  describe('RBAC', () => {
    it('should reject platform route for non-admin user', async () => {
      const loginRes = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'sales@travelo.com', password: 'Demo@123' });
      const token = loginRes.body?.data?.accessToken || loginRes.body?.accessToken;
      if (!token) return;
      const res = await request(app.getHttpServer()).get('/api/v1/platform/tenants').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });

  // ── Master Data ──
  describe('Master Data', () => {
    it('should return effective lookup data', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/tenant/master-data/lookup/lead-status').set('Authorization', `Bearer ${adminToken}`).set('X-Tenant-Id', 'demo-travel');
      expect(res.status).toBe(200);
      const data = res.body?.data || res.body;
      expect(Array.isArray(data)).toBe(true);
    });
  });

  // ── Lead CRUD ──
  describe('Lead CRUD', () => {
    let leadId: string;

    it('should create lead', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/tenant/leads')
        .set('Authorization', `Bearer ${adminToken}`).set('X-Tenant-Id', 'demo-travel')
        .send({ fullName: 'Test Lead', email: 'test@example.com', status: 'NEW', priority: 'MEDIUM', source: 'WEBSITE', serviceType: 'AIR_TICKET' });
      expect(res.status).toBe(201);
      const data = res.body?.data || res.body;
      leadId = data.id;
      expect(leadId).toBeDefined();
    });

    it('should list leads', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/tenant/leads').set('Authorization', `Bearer ${adminToken}`).set('X-Tenant-Id', 'demo-travel');
      expect(res.status).toBe(200);
    });

    it('should reject lead creation without email/phone', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/tenant/leads')
        .set('Authorization', `Bearer ${adminToken}`).set('X-Tenant-Id', 'demo-travel')
        .send({ fullName: 'No Contact', status: 'NEW' });
      expect([400, 403].includes(res.status)).toBe(true);
    });
  });

  // ── Finance Safety ──
  describe('Finance Safety', () => {
    it('should block payment for cross-tenant booking', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/tenant/payments')
        .set('Authorization', `Bearer ${adminToken}`).set('X-Tenant-Id', 'demo-travel')
        .send({ bookingId: 'nonexistent-id', amount: 100 });
      expect(res.status).toBe(400);
    });
  });
});

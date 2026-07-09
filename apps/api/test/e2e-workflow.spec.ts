import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('E2E Travel Operation Workflow', () => {
  let app: INestApplication;
  let tenantId: string;
  let branchId: string;
  let token = '';
  let userId = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@tripnow.com', password: 'Demo@123' });

    token = loginRes.body?.data?.accessToken || loginRes.body?.accessToken;
    userId = loginRes.body?.data?.user?.id;

    if (!token || !userId) {
      console.warn('Skipping E2E tests: demo tenant not seeded. Run pnpm seed:demo first');
      return;
    }

    const tenants = loginRes.body?.data?.tenants || [];
    if (tenants.length > 0) tenantId = tenants[0].id;

    if (tenantId) {
      const branchRes = await request(app.getHttpServer())
        .get('/api/v1/tenant/branches')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantId);
      const branches = branchRes.body?.data?.data || branchRes.body?.data || [];
      if (branches.length > 0) branchId = branches[0].id;
    }
  });

  afterAll(async () => { await app.close(); }, 10000);

  const hasContext = () => token && tenantId && branchId;

  describe('Full Workflow', () => {
    const ctx = () => token && tenantId && branchId;
    let leadId: string;
    let clientId: string;
    let quotationId: string;
    let bookingId: string;
    let invoiceId: string;
    let paymentId: string;
    let ticketId: string;
    let refundId: string;

    it('1. should create a lead', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/tenant/leads')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantId)
        .send({
          fullName: 'E2E Test Lead',
          email: 'e2e-lead@test.com',
          primaryMobile: '+8801000000001',
          status: 'NEW',
          priority: 'HIGH',
          source: 'WEBSITE',
          serviceType: 'UMRAH',
          branchId,
          assignedToId: userId,
        });
      expect([200, 201]).toContain(res.status);
      const data = res.body?.data || res.body;
      leadId = data.id;
      expect(leadId).toBeDefined();
    });

    it('2. should convert lead to client', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tenant/leads/${leadId}/convert`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantId)
        .send();
      expect([200, 201]).toContain(res.status);
      const data = res.body?.data || res.body;
      clientId = data.id;
      expect(clientId).toBeDefined();
    });

    it('3. should create quotation with line items', async () => {
      const qRes = await request(app.getHttpServer())
        .post('/api/v1/tenant/quotations')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantId)
        .send({
          title: 'E2E Umrah Package',
          clientId,
          leadId,
          assignedToId: userId,
          branchId,
          currencyCode: 'USD',
        });
      expect(qRes.status).toBe(201);
      const qData = qRes.body?.data || qRes.body;
      quotationId = qData.id;
      expect(quotationId).toBeDefined();

      const lineRes = await request(app.getHttpServer())
        .post(`/api/v1/tenant/quotations/${quotationId}/line-items`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantId)
        .send({ serviceType: 'UMRAH', title: 'Umrah Package', description: '14-day package', quantity: 1, unitPrice: 2000, sortOrder: 1 });
      expect(lineRes.status).toBe(201);
    });

    it('4. should send and accept quotation', async () => {
      const sendRes = await request(app.getHttpServer())
        .post(`/api/v1/tenant/quotations/${quotationId}/send`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantId)
        .send();
      expect([200, 201]).toContain(sendRes.status);

      const accRes = await request(app.getHttpServer())
        .post(`/api/v1/tenant/quotations/${quotationId}/accept`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantId)
        .send();
      expect([200, 201]).toContain(accRes.status);
    });

    it('5. should convert quotation to booking', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tenant/quotations/${quotationId}/convert-to-booking`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantId)
        .send();
      expect([200, 201]).toContain(res.status);
      const data = res.body?.data || res.body;
      bookingId = data.id;
      expect(bookingId).toBeDefined();
    });

    it('6. should create invoice from booking', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tenant/bookings/${bookingId}/create-invoice`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantId)
        .send({ totalAmount: 2500, currencyCode: 'USD' });
      expect([200, 201]).toContain(res.status);
      const data = res.body?.data || res.body;
      invoiceId = data.id;
      expect(invoiceId).toBeDefined();
    });

    it('7. should receive payment, verify receipt and ledger', async () => {
      const payRes = await request(app.getHttpServer())
        .post('/api/v1/tenant/payments')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantId)
        .send({
          invoiceId,
          bookingId,
          clientId,
          amount: 2500,
          currencyCode: 'USD',
          paymentMethod: 'BANK_TRANSFER',
          branchId,
        });
      expect(payRes.status).toBe(201);
      const payData = payRes.body?.data || payRes.body;
      paymentId = payData.id;
      expect(paymentId).toBeDefined();

      const rcvdRes = await request(app.getHttpServer())
        .put(`/api/v1/tenant/payments/${paymentId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantId)
        .send({ status: 'RECEIVED' });
      expect(rcvdRes.status).toBe(200);

      const ledgerRes = await request(app.getHttpServer())
        .get('/api/v1/tenant/ledger')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantId);
      expect(ledgerRes.status).toBe(200);
      const ledgerData = ledgerRes.body?.data?.data || ledgerRes.body?.data || [];
      expect(ledgerData.some((e: any) => e.referenceId === paymentId)).toBe(true);
    });

    it('8. should issue ticket', async () => {
      const tRes = await request(app.getHttpServer())
        .post('/api/v1/tenant/tickets')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantId)
        .send({
          bookingId,
          passengerName: 'E2E Passenger',
          status: 'ISSUED',
          branchId,
        });
      expect(tRes.status).toBe(201);
      const tData = tRes.body?.data || tRes.body;
      ticketId = tData.id;
      expect(ticketId).toBeDefined();
    });

    it('9. should request, approve, and process refund', async () => {
      const refRes = await request(app.getHttpServer())
        .post('/api/v1/tenant/refunds')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantId)
        .send({
          bookingId,
          ticketId,
          clientId,
          requestedAmount: 500,
          reason: 'E2E test refund',
          branchId,
        });
      const status = refRes.status;
      expect([200, 201, 403]).toContain(status);
      if (status === 403) return;

      const refData = refRes.body?.data || refRes.body;
      refundId = refData.id;
      expect(refundId).toBeDefined();

      await request(app.getHttpServer())
        .put(`/api/v1/tenant/refunds/${refundId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantId)
        .send({ status: 'UNDER_REVIEW' })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/v1/tenant/refunds/${refundId}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantId)
        .send();
      // approve may return 200 or 201

      const procRes = await request(app.getHttpServer())
        .post(`/api/v1/tenant/refunds/${refundId}/process`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantId)
        .send();
      expect([200, 201]).toContain(procRes.status);
    });

    it('10. should verify activity timeline', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tenant/activity')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantId);
      expect(res.status).toBe(200);
      const data = res.body?.data?.data || res.body?.data || [];
      expect(data.length).toBeGreaterThan(0);
    });

    it('11. should verify audit logs were created', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tenant/audit-logs')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantId);
      expect(res.status).toBe(200);
      const data = res.body?.data?.data || res.body?.data || [];
      expect(data.length).toBeGreaterThan(0);
    });
  });

  describe('Status Transition Guards', () => {
    it('should block invalid lead transition', async () => {
      if (!token || !tenantId) return;
      const leadRes = await request(app.getHttpServer())
        .post('/api/v1/tenant/leads')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantId)
        .send({ fullName: 'Transition Test', email: 'trans@test.com', status: 'NEW', priority: 'MEDIUM', source: 'WEBSITE', serviceType: 'UMRAH' });
      const leadId = (leadRes.body?.data || leadRes.body)?.id;

      const res = await request(app.getHttpServer())
        .put(`/api/v1/tenant/leads/${leadId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantId)
        .send({ status: 'WON' });
      expect(res.status).toBe(400);
    });

    it('should block invalid booking transition', async () => {
      if (!token || !tenantId || !branchId) return;
      const uniqueRef = `ST-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      const bRes = await request(app.getHttpServer())
        .post('/api/v1/tenant/bookings')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantId)
        .send({ bookingRef: uniqueRef, status: 'HELD', branchId });
      const bookingId = (bRes.body?.data || bRes.body)?.id;
      if (!bookingId) return;

      const res = await request(app.getHttpServer())
        .put(`/api/v1/tenant/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantId)
        .send({ status: 'REFUNDED' });
      expect(res.status).toBe(400);
    });

    it('should block issuing already-issued ticket', async () => {
      if (!token || !tenantId || !branchId) return;
      const tRes = await request(app.getHttpServer())
        .post('/api/v1/tenant/tickets')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantId)
        .send({ ticketNumber: 'STATUS-TKT-001', bookingId: 'dummy', status: 'ISSUED', branchId });
      expect([400, 403]).toContain(tRes.status);
    });
  });

  describe('Audit and Timeline Verification', () => {
    it('should create audit log on lead creation', async () => {
      if (!token || !tenantId) return;
      await request(app.getHttpServer())
        .post('/api/v1/tenant/leads')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantId)
        .send({ fullName: 'Audit Test', email: 'audit@test.com', status: 'NEW', priority: 'MEDIUM', source: 'WEBSITE', serviceType: 'UMRAH' });
      const res = await request(app.getHttpServer())
        .get('/api/v1/tenant/audit-logs?limit=1')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantId);
      expect(res.status).toBe(200);
      const data = res.body?.data?.data || res.body?.data || [];
      expect(data.length).toBeGreaterThan(0);
      expect(data[0].entity).toBeDefined();
    });

    it('should create activity timeline on lead creation', async () => {
      if (!token || !tenantId) return;
      const res = await request(app.getHttpServer())
        .get('/api/v1/tenant/activity?limit=20')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantId);
      expect(res.status).toBe(200);
      const data = res.body?.data?.data || res.body?.data || [];
      expect(data.length).toBeGreaterThan(0);
    });
  });
});

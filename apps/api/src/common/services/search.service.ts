import { Injectable, Logger } from '@nestjs/common';

const MEILI_URL = process.env.MEILISEARCH_URL || 'http://localhost:7700';
const MEILI_KEY = process.env.MEILISEARCH_API_KEY || '';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  async indexLeads(tenantId: string, leads: any[]) {
    return this.indexDocuments('leads', leads.map(l => ({
      id: `${tenantId}:${l.id}`,
      tenantId,
      _type: 'lead',
      fullName: l.fullName,
      email: l.email,
      phone: l.primaryMobile,
      status: l.status,
      source: l.source,
      serviceType: l.serviceType,
      city: l.city,
    })));
  }

  async indexClients(tenantId: string, clients: any[]) {
    return this.indexDocuments('clients', clients.map(c => ({
      id: `${tenantId}:${c.id}`,
      tenantId,
      _type: 'client',
      displayName: c.displayName,
      email: c.email,
      phone: c.phone,
      status: c.status,
      type: c.type,
      city: c.city,
    })));
  }

  async search(tenantId: string, query: string, limit = 10) {
    try {
      const [leadsRes, clientsRes] = await Promise.all([
        fetch(`${MEILI_URL}/indexes/leads/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(MEILI_KEY ? { Authorization: `Bearer ${MEILI_KEY}` } : {}) },
          body: JSON.stringify({ q: query, limit, filter: `tenantId = "${tenantId}"` }),
        }),
        fetch(`${MEILI_URL}/indexes/clients/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(MEILI_KEY ? { Authorization: `Bearer ${MEILI_KEY}` } : {}) },
          body: JSON.stringify({ q: query, limit, filter: `tenantId = "${tenantId}"` }),
        }),
      ]);

      const results: any[] = [];
      if (leadsRes.ok) {
        const data = await leadsRes.json();
        results.push(...(data.hits || []).map((h: any) => ({ ...h, _type: 'lead' })));
      }
      if (clientsRes.ok) {
        const data = await clientsRes.json();
        results.push(...(data.hits || []).map((h: any) => ({ ...h, _type: 'client' })));
      }

      return results.slice(0, limit);
    } catch {
      return [];
    }
  }

  private async indexDocuments(index: string, documents: any[]) {
    if (!documents.length) return;
    try {
      const res = await fetch(`${MEILI_URL}/indexes/${index}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(MEILI_KEY ? { Authorization: `Bearer ${MEILI_KEY}` } : {}) },
        body: JSON.stringify(documents),
      });
      if (!res.ok) {
        this.logger.warn(`Search index ${index}: failed to index ${documents.length} docs`);
      }
    } catch (err: any) {
      this.logger.warn(`Search index ${index}: ${err.message}`);
    }
  }
}

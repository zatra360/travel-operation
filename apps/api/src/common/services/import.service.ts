import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ImportService {
  constructor(private readonly prisma: PrismaService) {}

  parseCSV(buffer: Buffer): Record<string, string>[] {
    const text = buffer.toString('utf-8').trim();
    if (!text) throw new BadRequestException('Empty file');
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 2) throw new BadRequestException('File must have a header row and at least one data row');
    const headers = this.parseLine(lines[0]);
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseLine(lines[i]);
      if (values.length === 0) continue;
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h.trim().toLowerCase()] = (values[idx] || '').trim(); });
      rows.push(row);
    }
    return rows;
  }

  private parseLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { result.push(current); current = ''; continue; }
      current += ch;
    }
    result.push(current);
    return result;
  }

  async importLeads(tenantId: string, branchId: string | undefined, rows: Record<string, string>[]) {
    let imported = 0;
    let skipped = 0;
    for (const row of rows) {
      if (!row.fullname && !row.full_name && !row.name) { skipped++; continue; }
      const name = (row.fullname || row.full_name || row.name || '').trim();
      if (!name) { skipped++; continue; }
      await this.prisma.lead.create({
        data: {
          tenantId, branchId: branchId || null,
          fullName: name,
          firstName: row.firstname || row.first_name || null,
          lastName: row.lastname || row.last_name || null,
          email: row.email || null,
          primaryMobile: row.phone || row.mobile || row.primarymobile || null,
          source: row.source || null,
          status: 'NEW',
        },
      });
      imported++;
    }
    return { imported, skipped, total: rows.length };
  }

  async importClients(tenantId: string, branchId: string | undefined, rows: Record<string, string>[]) {
    let imported = 0;
    let skipped = 0;
    for (const row of rows) {
      const name = (row.displayname || row.display_name || row.name || row.fullname || '').trim();
      if (!name) { skipped++; continue; }
      await this.prisma.client.create({
        data: {
          tenantId, branchId: branchId || null,
          displayName: name,
          email: row.email || null,
          phone: row.phone || row.mobile || null,
          companyName: row.company || row.companyname || null,
          type: row.type || 'PERSON',
          status: 'ACTIVE',
        },
      });
      imported++;
    }
    return { imported, skipped, total: rows.length };
  }

  async exportLeadsCSV(tenantId: string): Promise<string> {
    const leads = await this.prisma.lead.findMany({ where: { tenantId, deletedAt: null } });
    const headers = ['FullName', 'Email', 'Phone', 'Source', 'Status', 'CreatedAt'];
    const lines = [headers.join(',')];
    for (const l of leads) {
      lines.push([l.fullName, l.email || '', l.primaryMobile || '', l.source || '', l.status, l.createdAt.toISOString()].map(v => `"${v}"`).join(','));
    }
    return lines.join('\n');
  }

  async exportClientsCSV(tenantId: string): Promise<string> {
    const clients = await this.prisma.client.findMany({ where: { tenantId, deletedAt: null } });
    const headers = ['DisplayName', 'Email', 'Phone', 'Company', 'Type', 'Status', 'CreatedAt'];
    const lines = [headers.join(',')];
    for (const c of clients) {
      lines.push([c.displayName, c.email || '', c.phone || '', c.companyName || '', c.type, c.status, c.createdAt.toISOString()].map(v => `"${v}"`).join(','));
    }
    return lines.join('\n');
  }
}

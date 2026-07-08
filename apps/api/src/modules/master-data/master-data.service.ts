import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MasterDataService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Countries ──
  async listCountries(page = 1, limit = 50, search?: string) {
    const skip = (page - 1) * limit; const where: any = {};
    if (search) where.name = { contains: search, mode: 'insensitive' };
    const [data, total] = await Promise.all([this.prisma.country.findMany({ where, orderBy: { name: 'asc' }, skip, take: limit }), this.prisma.country.count({ where })]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
  async getCountry(id: string) { const c = await this.prisma.country.findUnique({ where: { id } }); if (!c) throw new NotFoundException(); return c; }

  // ── Nationalities ──
  async listNationalities(page = 1, limit = 50, countryId?: string) {
    const skip = (page - 1) * limit; const where: any = {}; if (countryId) where.countryId = countryId;
    const [data, total] = await Promise.all([this.prisma.nationality.findMany({ where, orderBy: { name: 'asc' }, skip, take: limit }), this.prisma.nationality.count({ where })]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Currencies ──
  async listCurrencies(page = 1, limit = 50, search?: string) {
    const skip = (page - 1) * limit; const where: any = {};
    if (search) where.OR = [{ code: { contains: search, mode: 'insensitive' } }, { name: { contains: search, mode: 'insensitive' } }];
    const [data, total] = await Promise.all([this.prisma.currency.findMany({ where, orderBy: { code: 'asc' }, skip, take: limit }), this.prisma.currency.count({ where })]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Airlines ──
  async listAirlines(page = 1, limit = 50, search?: string) {
    const skip = (page - 1) * limit; const where: any = {};
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { iataCode: { contains: search, mode: 'insensitive' } }];
    const [data, total] = await Promise.all([this.prisma.airline.findMany({ where, orderBy: { name: 'asc' }, skip, take: limit }), this.prisma.airline.count({ where })]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Airports ──
  async listAirports(page = 1, limit = 50, search?: string) {
    const skip = (page - 1) * limit; const where: any = {};
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { iataCode: { contains: search, mode: 'insensitive' } }, { city: { contains: search, mode: 'insensitive' } }];
    const [data, total] = await Promise.all([this.prisma.airport.findMany({ where, orderBy: { name: 'asc' }, skip, take: limit }), this.prisma.airport.count({ where })]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}

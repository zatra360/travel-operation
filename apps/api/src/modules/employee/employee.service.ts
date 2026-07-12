import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { enforceBranchScope } from '../../common/utils/scope';
import { AuditService } from '../audit/audit.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { QueryEmployeeDto } from './dto/query-employee.dto';

@Injectable()
export class EmployeeService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async create(tenantId: string, actorId: string, dto: CreateEmployeeDto) {
    const emp = await this.prisma.employee.create({ data: { tenantId, branchId: dto.branchId ?? null, employeeCode: dto.employeeCode, userId: dto.userId ?? null, departmentId: dto.departmentId ?? null, firstName: dto.firstName, lastName: dto.lastName, email: dto.email ?? null, phone: dto.phone ?? null, position: dto.position ?? null, status: dto.status ?? 'ACTIVE', joinedAt: dto.joinedAt ? new Date(dto.joinedAt) : null } });
    await this.audit.logMutation(actorId, tenantId, 'EMPLOYEE', 'Employee', emp.id, 'CREATE', { employeeCode: emp.employeeCode, name: `${emp.firstName} ${emp.lastName}` }, emp.branchId ?? undefined);
    return emp;
  }

  async findAll(tenantId: string, query: QueryEmployeeDto, activeBranchId?: string) {
    const page = query.page ?? 1; const limit = query.limit ?? 50; const skip = (page - 1) * limit;
    const where: any = { tenantId, deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.search) where.OR = [{ firstName: { contains: query.search, mode: 'insensitive' } }, { lastName: { contains: query.search, mode: 'insensitive' } }, { email: { contains: query.search, mode: 'insensitive' } }, { employeeCode: { contains: query.search, mode: 'insensitive' } }];
    enforceBranchScope(where, activeBranchId);
    const [data, total] = await Promise.all([this.prisma.employee.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }), this.prisma.employee.count({ where })]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string) { const emp = await this.prisma.employee.findFirst({ where: { id, tenantId, deletedAt: null } }); if (!emp) throw new NotFoundException('Employee not found'); return emp; }

  async update(tenantId: string, actorId: string, id: string, dto: UpdateEmployeeDto) {
    await this.findById(tenantId, id);
    const emp = await this.prisma.employee.update({ where: { id }, data: { ...(dto.employeeCode !== undefined && { employeeCode: dto.employeeCode }), ...(dto.userId !== undefined && { userId: dto.userId }), ...(dto.departmentId !== undefined && { departmentId: dto.departmentId }), ...(dto.firstName !== undefined && { firstName: dto.firstName }), ...(dto.lastName !== undefined && { lastName: dto.lastName }), ...(dto.email !== undefined && { email: dto.email }), ...(dto.phone !== undefined && { phone: dto.phone }), ...(dto.position !== undefined && { position: dto.position }), ...(dto.status !== undefined && { status: dto.status }), ...(dto.joinedAt !== undefined && { joinedAt: dto.joinedAt ? new Date(dto.joinedAt) : null }), ...(dto.branchId !== undefined && { branchId: dto.branchId }) } });
    await this.audit.logMutation(actorId, tenantId, 'EMPLOYEE', 'Employee', emp.id, 'UPDATE', { changes: dto }, emp.branchId ?? undefined);
    return emp;
  }

  async remove(tenantId: string, actorId: string, id: string) { const emp = await this.findById(tenantId, id); await this.prisma.employee.update({ where: { id }, data: { deletedAt: new Date() } }); await this.audit.logMutation(actorId, tenantId, 'EMPLOYEE', 'Employee', emp.id, 'DELETE', { employeeCode: emp.employeeCode }, emp.branchId ?? undefined); return { id, deleted: true }; }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ActivityService } from '../activity/activity.service';
import { NumberGeneratorService } from '../../common/services/number-generator.service';
import { RelationshipValidationService } from '../../common/services/relationship-validation.service';
import { validateStatusTransition } from '../../common/utils/status-transitions';
import { CreateSalaryRunDto } from './dto/create-salary-run.dto';
import { UpdateSalaryRunDto } from './dto/update-salary-run.dto';
import { QuerySalaryRunDto } from './dto/query-salary-run.dto';

@Injectable()
export class SalaryRunService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly activity: ActivityService,
    private readonly numberGen: NumberGeneratorService,
    private readonly relValidation: RelationshipValidationService,
  ) {}

  async create(tenantId: string, actorId: string, dto: CreateSalaryRunDto) {
    await this.relValidation.validateLinkedEntities({
      tenantId,
      branchId: dto.branchId,
    });

    const salaryRunNumber = await this.numberGen.generateSalaryRunNumber(tenantId);

    const salaryRun = await this.prisma.salaryRun.create({
      data: {
        tenantId,
        branchId: dto.branchId ?? null,
        salaryRunNumber,
        period: dto.period,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        currencyCode: dto.currencyCode ?? 'USD',
        status: 'DRAFT',
        notes: dto.notes ?? null,
        createdById: actorId,
      },
    });

    await this.audit.logMutation(actorId, tenantId, 'SALARY_RUN', 'SalaryRun', salaryRun.id, 'CREATE', { salaryRunNumber, period: dto.period }, salaryRun.branchId ?? undefined);
    await this.activity.logEntityEvent({
      tenantId, userId: actorId, type: 'SALARY_RUN_CREATED',
      subject: `Salary run ${salaryRunNumber} created for ${dto.period}`,
      entity: 'SalaryRun', entityId: salaryRun.id, branchId: salaryRun.branchId,
    });

    return salaryRun;
  }

  async findAll(tenantId: string, query: QuerySalaryRunDto) {
    const page = query.page ?? 1; const limit = query.limit ?? 50; const skip = (page - 1) * limit;
    const where: any = { tenantId };
    if (query.status) where.status = query.status;
    if (query.branchId) where.branchId = query.branchId;
    if (query.search) {
      where.OR = [
        { salaryRunNumber: { contains: query.search, mode: 'insensitive' } },
        { period: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.salaryRun.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.salaryRun.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string) {
    const salaryRun = await this.prisma.salaryRun.findFirst({ where: { id, tenantId } });
    if (!salaryRun) throw new NotFoundException('Salary run not found');
    return salaryRun;
  }

  async update(tenantId: string, actorId: string, id: string, dto: UpdateSalaryRunDto) {
    const current = await this.findById(tenantId, id);

    await this.relValidation.validateLinkedEntities({
      tenantId,
      branchId: dto.branchId,
    });

    const oldStatus = current.status;

    if (dto.status !== undefined && dto.status !== current.status) {
      const check = validateStatusTransition('salary_run', current.status, dto.status);
      if (!check.valid) {
        throw new BadRequestException(`Cannot transition from ${current.status} to ${dto.status}. Allowed: ${check.allowed.join(', ') || 'none'}`);
      }
    }

    const salaryRun = await this.prisma.salaryRun.update({
      where: { id },
      data: {
        ...(dto.period !== undefined && { period: dto.period }),
        ...(dto.periodStart !== undefined && { periodStart: new Date(dto.periodStart) }),
        ...(dto.periodEnd !== undefined && { periodEnd: new Date(dto.periodEnd) }),
        ...(dto.currencyCode !== undefined && { currencyCode: dto.currencyCode }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.branchId !== undefined && { branchId: dto.branchId }),
      },
    });

    if (dto.status && dto.status !== oldStatus) {
      await this.activity.logEntityEvent({
        tenantId, userId: actorId, type: 'SALARY_RUN_STATUS_CHANGED',
        subject: `Salary run ${current.salaryRunNumber}: ${oldStatus} -> ${dto.status}`,
        entity: 'SalaryRun', entityId: id, branchId: salaryRun.branchId,
      });
    }

    await this.audit.logMutation(actorId, tenantId, 'SALARY_RUN', 'SalaryRun', id, dto.status !== oldStatus ? 'STATUS_CHANGE' : 'UPDATE', { changes: dto }, salaryRun.branchId ?? undefined);

    return salaryRun;
  }

  async generateSlips(tenantId: string, actorId: string, id: string) {
    const salaryRun = await this.findById(tenantId, id);

    const check = validateStatusTransition('salary_run', salaryRun.status, 'GENERATED');
    if (!check.valid) {
      throw new BadRequestException(`Cannot generate slips for salary run in status ${salaryRun.status}. Allowed: ${check.allowed.join(', ') || 'none'}`);
    }

    const employees = await this.prisma.employee.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
    });

    const slips = [];
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    for (const employee of employees) {
      const profile = await this.prisma.salaryProfile.findFirst({
        where: { employeeId: employee.id, tenantId, isActive: true },
        orderBy: { effectiveFrom: 'desc' },
      });

      const basePay = Number(profile?.baseSalary ?? 0);
      const grossPay = basePay;
      const deductions = 0;
      const netPay = basePay;

      const slip = await this.prisma.salarySlip.create({
        data: {
          tenantId,
          salaryRunId: id,
          employeeId: employee.id,
          basePay,
          allowances: 0,
          commissionEarned: 0,
          incentiveEarned: 0,
          overtimePay: 0,
          grossPay,
          deductions,
          netPay,
          currencyCode: salaryRun.currencyCode ?? 'USD',
        },
      });
      slips.push(slip);
      totalGross += grossPay;
      totalDeductions += deductions;
      totalNet += netPay;
    }

    await this.prisma.salaryRun.update({
      where: { id },
      data: {
        status: 'GENERATED',
        totalGross,
        totalDeductions,
        totalNet,
      },
    });

    await this.activity.logEntityEvent({
      tenantId, userId: actorId, type: 'SALARY_SLIPS_GENERATED',
      subject: `Generated ${employees.length} salary slips for run ${salaryRun.salaryRunNumber}`,
      entity: 'SalaryRun', entityId: id, branchId: salaryRun.branchId,
    });
    await this.audit.logMutation(actorId, tenantId, 'SALARY_RUN', 'SalaryRun', id, 'STATUS_CHANGE', { from: salaryRun.status, to: 'GENERATED', slipCount: employees.length }, salaryRun.branchId ?? undefined);

    return { salaryRun: await this.findById(tenantId, id), slips };
  }

  async approve(tenantId: string, actorId: string, id: string) {
    const current = await this.findById(tenantId, id);

    const check = validateStatusTransition('salary_run', current.status, 'APPROVED');
    if (!check.valid) {
      throw new BadRequestException(`Cannot approve salary run in status ${current.status}. Allowed: ${check.allowed.join(', ') || 'none'}`);
    }

    const salaryRun = await this.prisma.salaryRun.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: actorId,
        approvedAt: new Date(),
      },
    });

    await this.activity.logEntityEvent({
      tenantId, userId: actorId, type: 'SALARY_RUN_APPROVED',
      subject: `Salary run ${current.salaryRunNumber} approved`,
      entity: 'SalaryRun', entityId: id, branchId: salaryRun.branchId,
    });
    await this.audit.logMutation(actorId, tenantId, 'SALARY_RUN', 'SalaryRun', id, 'STATUS_CHANGE', { from: current.status, to: 'APPROVED' }, salaryRun.branchId ?? undefined);

    return salaryRun;
  }

  async cancel(tenantId: string, actorId: string, id: string) {
    const current = await this.findById(tenantId, id);

    const check = validateStatusTransition('salary_run', current.status, 'CANCELLED');
    if (!check.valid) {
      throw new BadRequestException(`Cannot cancel salary run in status ${current.status}. Allowed: ${check.allowed.join(', ') || 'none'}`);
    }

    const salaryRun = await this.prisma.salaryRun.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });

    await this.activity.logEntityEvent({
      tenantId, userId: actorId, type: 'SALARY_RUN_CANCELLED',
      subject: `Salary run ${current.salaryRunNumber} cancelled`,
      entity: 'SalaryRun', entityId: id, branchId: salaryRun.branchId,
    });
    await this.audit.logMutation(actorId, tenantId, 'SALARY_RUN', 'SalaryRun', id, 'STATUS_CHANGE', { from: current.status, to: 'CANCELLED' }, salaryRun.branchId ?? undefined);

    return salaryRun;
  }

  async getTimeline(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    return this.activity.findByEntity(tenantId, 'SalaryRun', id);
  }

  async remove(tenantId: string, actorId: string, id: string) {
    const salaryRun = await this.findById(tenantId, id);
    await this.prisma.salaryRun.delete({ where: { id } });
    await this.audit.logMutation(actorId, tenantId, 'SALARY_RUN', 'SalaryRun', id, 'DELETE', { salaryRunNumber: salaryRun.salaryRunNumber }, salaryRun.branchId ?? undefined);
    return { id, deleted: true };
  }
}

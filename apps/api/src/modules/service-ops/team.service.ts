import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface TeamDto {
  name?: string;
  code?: string;
  description?: string;
  branchId?: string;
  leaderId?: string;
  isActive?: boolean;
}

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async assertTenantMember(tenantId: string, userId: string) {
    const membership = await this.prisma.userTenantMembership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });
    if (!membership || !membership.isActive) {
      throw new BadRequestException('User is not an active member of this tenant');
    }
  }

  async findAll(tenantId: string) {
    const teams = await this.prisma.team.findMany({
      where: { tenantId },
      include: { members: true, _count: { select: { cases: true, caseItems: true } } },
      orderBy: { name: 'asc' },
    });

    const userIds = [...new Set(teams.flatMap((t) => [t.leaderId, ...t.members.map((m) => m.userId)]).filter(Boolean))] as string[];
    const users = userIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, firstName: true, lastName: true, email: true } })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    return teams.map((t) => ({
      id: t.id,
      name: t.name,
      code: t.code,
      description: t.description,
      branchId: t.branchId,
      isActive: t.isActive,
      leader: t.leaderId ? userMap.get(t.leaderId) ?? null : null,
      members: t.members.map((m) => ({
        id: m.id,
        role: m.role,
        user: userMap.get(m.userId) ?? { id: m.userId, firstName: 'Unknown', lastName: '', email: '' },
      })),
      activeCases: t._count.cases,
      activeItems: t._count.caseItems,
      createdAt: t.createdAt,
    }));
  }

  async findById(tenantId: string, id: string) {
    const team = await this.prisma.team.findFirst({ where: { id, tenantId }, include: { members: true } });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async create(tenantId: string, actorId: string, dto: TeamDto) {
    if (!dto.name?.trim() || !dto.code?.trim()) {
      throw new BadRequestException('Team name and code are required');
    }
    if (dto.leaderId) await this.assertTenantMember(tenantId, dto.leaderId);

    try {
      const team = await this.prisma.team.create({
        data: {
          tenantId,
          name: dto.name.trim(),
          code: dto.code.trim().toUpperCase(),
          description: dto.description,
          branchId: dto.branchId,
          leaderId: dto.leaderId,
        },
      });
      if (dto.leaderId) {
        await this.prisma.teamMember.create({
          data: { teamId: team.id, userId: dto.leaderId, role: 'LEADER' },
        });
      }
      await this.audit.logMutation(actorId, tenantId, 'TEAM', 'Team', team.id, 'CREATE', { name: team.name, code: team.code });
      return team;
    } catch (err: any) {
      if (err?.code === 'P2002') throw new ConflictException(`Team code ${dto.code} already exists`);
      throw err;
    }
  }

  async update(tenantId: string, actorId: string, id: string, dto: TeamDto) {
    const team = await this.findById(tenantId, id);
    if (dto.leaderId) await this.assertTenantMember(tenantId, dto.leaderId);

    const updated = await this.prisma.team.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.branchId !== undefined && { branchId: dto.branchId }),
        ...(dto.leaderId !== undefined && { leaderId: dto.leaderId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
    if (dto.leaderId && !team.members.some((m) => m.userId === dto.leaderId)) {
      await this.prisma.teamMember.create({ data: { teamId: id, userId: dto.leaderId, role: 'LEADER' } });
    }
    await this.audit.logMutation(actorId, tenantId, 'TEAM', 'Team', id, 'UPDATE', { changes: dto });
    return updated;
  }

  async addMember(tenantId: string, actorId: string, teamId: string, userId: string, role = 'MEMBER') {
    await this.findById(tenantId, teamId);
    await this.assertTenantMember(tenantId, userId);
    try {
      const member = await this.prisma.teamMember.create({ data: { teamId, userId, role } });
      await this.audit.logMutation(actorId, tenantId, 'TEAM', 'TeamMember', member.id, 'CREATE', { teamId, userId, role });
      return member;
    } catch (err: any) {
      if (err?.code === 'P2002') throw new ConflictException('User is already a member of this team');
      throw err;
    }
  }

  async removeMember(tenantId: string, actorId: string, teamId: string, userId: string) {
    const team = await this.findById(tenantId, teamId);
    const member = team.members.find((m) => m.userId === userId);
    if (!member) throw new NotFoundException('User is not a member of this team');
    if (team.leaderId === userId) {
      throw new BadRequestException('Remove or replace the team leader before removing them as a member');
    }
    await this.prisma.teamMember.delete({ where: { id: member.id } });
    await this.audit.logMutation(actorId, tenantId, 'TEAM', 'TeamMember', member.id, 'DELETE', { teamId, userId });
    return { removed: true };
  }
}

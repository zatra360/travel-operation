import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Platform - Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('platform/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @RequirePermissions('USER_CREATE')
  @ApiOperation({ summary: 'Create a new user' })
  async create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Get()
  @RequirePermissions('USER_READ')
  @ApiOperation({ summary: 'List all users' })
  async findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @RequirePermissions('USER_READ')
  @ApiOperation({ summary: 'Get user by ID' })
  async findById(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Put(':id')
  @RequirePermissions('USER_UPDATE')
  @ApiOperation({ summary: 'Update user' })
  async update(@Param('id') id: string, @Body() dto: Partial<CreateUserDto>) {
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('USER_DELETE')
  @ApiOperation({ summary: 'Soft delete user' })
  async remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}

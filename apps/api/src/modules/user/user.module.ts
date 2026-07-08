import { Module } from '@nestjs/common';
import { UserController, TenantUserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  controllers: [UserController, TenantUserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}

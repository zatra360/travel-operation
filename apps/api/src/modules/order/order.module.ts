import { Module } from '@nestjs/common';
import { OrderController, OrderListController } from './order.controller';
import { OrderService } from './order.service';

@Module({ controllers: [OrderController, OrderListController], providers: [OrderService], exports: [OrderService] })
export class OrderModule {}

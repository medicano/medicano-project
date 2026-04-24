import { Body, Controller, Get, Post, Put, Param, HttpCode, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionDocument } from './schemas/subscription.schema';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @Roles(Role.CLINIC)
  async create(@Body() dto: CreateSubscriptionDto): Promise<SubscriptionDocument> {
    return this.subscriptionsService.create(dto);
  }

  @Get('clinic/:clinicId')
  async findByClinicId(
    @Param('clinicId') clinicId: string,
  ): Promise<SubscriptionDocument | null> {
    return this.subscriptionsService.findByClinicId(clinicId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<SubscriptionDocument> {
    return this.subscriptionsService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.CLINIC)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
  ): Promise<SubscriptionDocument> {
    return this.subscriptionsService.update(id, dto);
  }

  @Post(':id/cancel')
  @Roles(Role.CLINIC)
  @HttpCode(200)
  async cancel(@Param('id') id: string): Promise<SubscriptionDocument> {
    return this.subscriptionsService.cancel(id);
  }
}

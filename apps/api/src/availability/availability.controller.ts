import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { CreateProfessionalAvailabilityDto } from './dto/create-professional-availability.dto';
import { UpdateProfessionalAvailabilityDto } from './dto/update-professional-availability.dto';
import { GetAvailabilityQueryDto } from './dto/get-availability-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentUserRole } from '../common/decorators/current-user-role.decorator';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import {
  ProfessionalAvailability,
  ProfessionalAvailabilityDocument,
} from './schemas/professional-availability.schema';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post('professionals/:professionalId/availability')
  @Roles(Role.PROFESSIONAL, Role.CLINIC, Role.ATTENDANT)
  @HttpCode(201)
  async create(
    @Param('professionalId', ParseMongoIdPipe) professionalId: string,
    @Body() createDto: CreateProfessionalAvailabilityDto,
    @CurrentUser() currentUserId: string,
    @CurrentUserRole() currentUserRole: Role,
  ): Promise<ProfessionalAvailabilityDocument> {
    return this.availabilityService.create(
      professionalId,
      createDto,
      currentUserId,
      currentUserRole,
    );
  }

  @Get('professionals/:professionalId/availability')
  async findByProfessionalAndDate(
    @Param('professionalId', ParseMongoIdPipe) professionalId: string,
    @Query() query: GetAvailabilityQueryDto,
  ): Promise<ProfessionalAvailability | null> {
    return this.availabilityService.findByProfessionalAndDate(
      professionalId,
      query.date,
    );
  }

  @Patch('availability/:availabilityId')
  @Roles(Role.PROFESSIONAL, Role.CLINIC, Role.ATTENDANT)
  async update(
    @Param('availabilityId', ParseMongoIdPipe) availabilityId: string,
    @Body() updateDto: UpdateProfessionalAvailabilityDto,
    @CurrentUser() currentUserId: string,
    @CurrentUserRole() currentUserRole: Role,
  ): Promise<ProfessionalAvailabilityDocument> {
    return this.availabilityService.update(
      availabilityId,
      updateDto,
      currentUserId,
      currentUserRole,
    );
  }

  @Delete('availability/:availabilityId')
  @Roles(Role.PROFESSIONAL, Role.CLINIC, Role.ATTENDANT)
  @HttpCode(204)
  async remove(
    @Param('availabilityId', ParseMongoIdPipe) availabilityId: string,
    @CurrentUser() currentUserId: string,
    @CurrentUserRole() currentUserRole: Role,
  ): Promise<void> {
    await this.availabilityService.remove(
      availabilityId,
      currentUserId,
      currentUserRole,
    );
  }
}

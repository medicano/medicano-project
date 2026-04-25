import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { UpdateWeeklySlotsDto } from './dto/update-weekly-slots.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { Specialty } from '../common/enums/specialty.enum';
import { ProfessionalDocument } from './schemas/professional.schema';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentUserRole } from '../common/decorators/current-user-role.decorator';

@Controller('professionals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Post()
  @Roles(Role.CLINIC)
  async create(
    @Body() createProfessionalDto: CreateProfessionalDto,
  ): Promise<ProfessionalDocument> {
    return this.professionalsService.create(createProfessionalDto);
  }

  @Get()
  async findAll(
    @Query('city') city?: string,
    @Query('specialty') specialty?: Specialty,
  ): Promise<ProfessionalDocument[]> {
    return this.professionalsService.findAll({ city, specialty });
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseMongoIdPipe) id: string,
  ): Promise<ProfessionalDocument> {
    return this.professionalsService.findById(id);
  }

  @Put(':id')
  @Roles(Role.CLINIC)
  async update(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() updateProfessionalDto: UpdateProfessionalDto,
  ): Promise<ProfessionalDocument> {
    return this.professionalsService.update(id, updateProfessionalDto);
  }

  @Put(':id/weekly-slots')
  @Roles(Role.PROFESSIONAL, Role.CLINIC, Role.ATTENDANT)
  async updateWeeklySlots(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() updateWeeklySlotsDto: UpdateWeeklySlotsDto,
    @CurrentUser() currentUserId: string,
    @CurrentUserRole() currentUserRole: Role,
  ): Promise<ProfessionalDocument> {
    return this.professionalsService.updateWeeklySlots(
      id,
      updateWeeklySlotsDto,
      currentUserId,
      currentUserRole,
    );
  }

  @Delete(':id')
  @Roles(Role.CLINIC)
  @HttpCode(204)
  async remove(@Param('id', ParseMongoIdPipe) id: string): Promise<void> {
    await this.professionalsService.remove(id);
  }
}

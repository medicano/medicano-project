import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ClinicsService } from './clinics.service';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ClinicDocument } from './schemas/clinic.schema';

@Controller('clinics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClinicsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Post()
  @Roles(Role.CLINIC)
  async create(@Body() createClinicDto: CreateClinicDto): Promise<ClinicDocument> {
    return this.clinicsService.create(createClinicDto);
  }

  @Get()
  async findAll(): Promise<ClinicDocument[]> {
    return this.clinicsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ClinicDocument> {
    return this.clinicsService.findById(id);
  }

  @Put(':id')
  @Roles(Role.CLINIC)
  async update(
    @Param('id') id: string,
    @Body() updateClinicDto: UpdateClinicDto,
  ): Promise<ClinicDocument> {
    return this.clinicsService.update(id, updateClinicDto);
  }

  @Delete(':id')
  @Roles(Role.CLINIC)
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.clinicsService.remove(id);
  }
}

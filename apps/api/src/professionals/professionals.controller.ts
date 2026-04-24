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
import { ProfessionalsService } from './professionals.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ProfessionalDocument } from './schemas/professional.schema';

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
  async findAll(): Promise<ProfessionalDocument[]> {
    return this.professionalsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ProfessionalDocument> {
    return this.professionalsService.findById(id);
  }

  @Put(':id')
  @Roles(Role.CLINIC)
  async update(
    @Param('id') id: string,
    @Body() updateProfessionalDto: UpdateProfessionalDto,
  ): Promise<ProfessionalDocument> {
    return this.professionalsService.update(id, updateProfessionalDto);
  }

  @Delete(':id')
  @Roles(Role.CLINIC)
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.professionalsService.remove(id);
  }
}

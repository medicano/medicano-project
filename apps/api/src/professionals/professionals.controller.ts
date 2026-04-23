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
import { ProfessionalDocument } from './schemas/professional.schema';

@Controller('professionals')
@UseGuards(JwtAuthGuard)
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Post()
  async create(@Body() createProfessionalDto: CreateProfessionalDto): Promise<ProfessionalDocument> {
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
  async update(
    @Param('id') id: string,
    @Body() updateProfessionalDto: UpdateProfessionalDto,
  ): Promise<ProfessionalDocument> {
    return this.professionalsService.update(id, updateProfessionalDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.professionalsService.remove(id);
  }
}

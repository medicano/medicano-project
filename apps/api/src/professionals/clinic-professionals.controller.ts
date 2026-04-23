import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ClinicProfessionalsService } from './clinic-professionals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClinicProfessionalDocument } from './schemas/clinic-professional.schema';
import { ProfessionalDocument } from './schemas/professional.schema';

@Controller('clinics')
@UseGuards(JwtAuthGuard)
export class ClinicProfessionalsController {
  constructor(
    private readonly clinicProfessionalsService: ClinicProfessionalsService,
  ) {}

  @Post(':clinicId/professionals/:professionalId')
  async assignProfessional(
    @Param('clinicId') clinicId: string,
    @Param('professionalId') professionalId: string,
  ): Promise<ClinicProfessionalDocument> {
    return this.clinicProfessionalsService.assignProfessionalToClinic(
      clinicId,
      professionalId,
    );
  }

  @Get(':clinicId/professionals')
  async getProfessionals(
    @Param('clinicId') clinicId: string,
  ): Promise<ProfessionalDocument[]> {
    return this.clinicProfessionalsService.getProfessionalsByClinic(clinicId);
  }

  @Delete(':clinicId/professionals/:professionalId')
  async removeProfessional(
    @Param('clinicId') clinicId: string,
    @Param('professionalId') professionalId: string,
  ): Promise<{ success: boolean }> {
    return this.clinicProfessionalsService.removeProfessionalFromClinic(
      clinicId,
      professionalId,
    );
  }
}

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
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ClinicProfessionalDocument } from './schemas/clinic-professional.schema';

@Controller('clinics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClinicProfessionalsController {
  constructor(
    private readonly clinicProfessionalsService: ClinicProfessionalsService,
  ) {}

  @Post(':clinicId/professionals/:professionalId')
  @Roles(Role.CLINIC, Role.ATTENDANT)
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
  ): Promise<ClinicProfessionalDocument[]> {
    return this.clinicProfessionalsService.findProfessionalsByClinic(clinicId);
  }

  @Delete(':clinicId/professionals/:professionalId')
  @Roles(Role.CLINIC, Role.ATTENDANT)
  async removeProfessional(
    @Param('clinicId') clinicId: string,
    @Param('professionalId') professionalId: string,
  ): Promise<ClinicProfessionalDocument> {
    return this.clinicProfessionalsService.removeProfessionalFromClinic(
      clinicId,
      professionalId,
    );
  }
}

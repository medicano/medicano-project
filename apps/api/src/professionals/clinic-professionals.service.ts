import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ClinicProfessional,
  ClinicProfessionalDocument,
} from './schemas/clinic-professional.schema';
import {
  Professional,
  ProfessionalDocument,
} from './schemas/professional.schema';
import { ClinicsService } from '../clinics/clinics.service';
import { ProfessionalsService } from './professionals.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class ClinicProfessionalsService {
  constructor(
    @InjectModel(ClinicProfessional.name)
    private clinicProfessionalModel: Model<ClinicProfessionalDocument>,
    @InjectModel(Professional.name)
    private professionalModel: Model<ProfessionalDocument>,
    private clinicsService: ClinicsService,
    private professionalsService: ProfessionalsService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  async assignProfessionalToClinic(
    clinicId: string,
    professionalId: string,
  ): Promise<ClinicProfessionalDocument> {
    if (!Types.ObjectId.isValid(clinicId)) {
      throw new BadRequestException(`Invalid clinic ID: ${clinicId}`);
    }

    if (!Types.ObjectId.isValid(professionalId)) {
      throw new BadRequestException(
        `Invalid professional ID: ${professionalId}`,
      );
    }

    await this.clinicsService.findById(clinicId);
    await this.professionalsService.findById(professionalId);

    const currentCount = await this.clinicProfessionalModel.countDocuments({
      clinicId: new Types.ObjectId(clinicId),
    });
    await this.subscriptionsService.enforceClinicProfessionalLimit(
      clinicId,
      currentCount,
    );

    try {
      const assignment = new this.clinicProfessionalModel({
        clinicId: new Types.ObjectId(clinicId),
        professionalId: new Types.ObjectId(professionalId),
      });
      return await assignment.save();
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException(
          `Professional ${professionalId} is already assigned to clinic ${clinicId}`,
        );
      }
      throw error;
    }
  }

  async getProfessionalsByClinic(
    clinicId: string,
  ): Promise<ProfessionalDocument[]> {
    if (!Types.ObjectId.isValid(clinicId)) {
      throw new BadRequestException(`Invalid clinic ID: ${clinicId}`);
    }

    await this.clinicsService.findById(clinicId);

    const assignments = await this.clinicProfessionalModel
      .find({ clinicId: new Types.ObjectId(clinicId) })
      .exec();

    const professionalIds = assignments.map((a) => a.professionalId);

    return this.professionalModel
      .find({ _id: { $in: professionalIds } })
      .populate('userId')
      .exec();
  }

  async removeProfessionalFromClinic(
    clinicId: string,
    professionalId: string,
  ): Promise<{ success: boolean }> {
    if (!Types.ObjectId.isValid(clinicId)) {
      throw new BadRequestException(`Invalid clinic ID: ${clinicId}`);
    }

    if (!Types.ObjectId.isValid(professionalId)) {
      throw new BadRequestException(
        `Invalid professional ID: ${professionalId}`,
      );
    }

    const result = await this.clinicProfessionalModel
      .findOneAndDelete({
        clinicId: new Types.ObjectId(clinicId),
        professionalId: new Types.ObjectId(professionalId),
      })
      .exec();

    if (!result) {
      throw new NotFoundException(
        `Assignment between clinic ${clinicId} and professional ${professionalId} not found`,
      );
    }

    return { success: true };
  }
}

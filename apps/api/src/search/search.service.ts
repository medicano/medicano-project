import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Clinic, ClinicDocument } from '../clinics/schemas/clinic.schema';
import { Professional, ProfessionalDocument } from '../professionals/schemas/professional.schema';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchResult } from './interfaces/search-result.interface';

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(Clinic.name) private readonly clinicModel: Model<ClinicDocument>,
    @InjectModel(Professional.name) private readonly professionalModel: Model<ProfessionalDocument>,
  ) {}

  async search(query: SearchQueryDto): Promise<SearchResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const clinicFilter: Record<string, unknown> = {};
    const professionalFilter: Record<string, unknown> = {};

    if (query.specialty) {
      clinicFilter['specialties'] = { $in: [query.specialty] };
      professionalFilter.specialty = query.specialty;
    }
    if (query.city) {
      clinicFilter['address.city'] = query.city;
      professionalFilter['address.city'] = query.city;
    }

    let clinics: ClinicDocument[] = [];
    let professionals: ProfessionalDocument[] = [];

    if (!query.type || query.type === 'clinic' || query.type === 'all') {
      clinics = await this.clinicModel.find(clinicFilter).skip(skip).limit(limit).exec();
    }

    if (!query.type || query.type === 'professional' || query.type === 'all') {
      professionals = await this.professionalModel
        .find(professionalFilter)
        .skip(skip)
        .limit(limit)
        .exec();
    }

    // TODO (Sprint 09): when professional subscriptions are added, filter by active plan (RN20)

    return {
      clinics,
      professionals,
      total: clinics.length + professionals.length,
      page,
      limit,
    };
  }

  async findClinicById(id: string): Promise<ClinicDocument> {
    const clinic = await this.clinicModel.findById(id).exec();
    if (!clinic) {
      throw new NotFoundException(`Clinic with id "${id}" not found`);
    }
    return clinic;
  }

  async findProfessionalById(id: string): Promise<ProfessionalDocument> {
    const professional = await this.professionalModel.findById(id).exec();
    if (!professional) {
      throw new NotFoundException(`Professional with id "${id}" not found`);
    }
    return professional;
  }
}

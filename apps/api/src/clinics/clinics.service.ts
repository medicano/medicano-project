import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Clinic, ClinicDocument } from './schemas/clinic.schema';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';

@Injectable()
export class ClinicsService {
  constructor(
    @InjectModel(Clinic.name) private clinicModel: Model<ClinicDocument>,
  ) {}

  async create(createClinicDto: CreateClinicDto): Promise<ClinicDocument> {
    const clinic = new this.clinicModel(createClinicDto);
    return clinic.save();
  }

  async findAll(): Promise<ClinicDocument[]> {
    return this.clinicModel.find().exec();
  }

  async findById(id: string): Promise<ClinicDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Invalid clinic ID: ${id}`);
    }

    const clinic = await this.clinicModel.findById(id).exec();
    if (!clinic) {
      throw new NotFoundException(`Clinic with ID ${id} not found`);
    }
    return clinic;
  }

  async update(
    id: string,
    updateClinicDto: UpdateClinicDto,
  ): Promise<ClinicDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Invalid clinic ID: ${id}`);
    }

    const clinic = await this.clinicModel
      .findByIdAndUpdate(id, updateClinicDto, { new: true })
      .exec();

    if (!clinic) {
      throw new NotFoundException(`Clinic with ID ${id} not found`);
    }

    return clinic;
  }

  async remove(id: string): Promise<{ success: boolean }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Invalid clinic ID: ${id}`);
    }

    const result = await this.clinicModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Clinic with ID ${id} not found`);
    }

    return { success: true };
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Professional,
  ProfessionalDocument,
} from './schemas/professional.schema';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';

@Injectable()
export class ProfessionalsService {
  constructor(
    @InjectModel(Professional.name)
    private professionalModel: Model<ProfessionalDocument>,
  ) {}

  async create(
    createProfessionalDto: CreateProfessionalDto,
  ): Promise<ProfessionalDocument> {
    if (!Types.ObjectId.isValid(createProfessionalDto.userId)) {
      throw new BadRequestException(
        `Invalid user ID: ${createProfessionalDto.userId}`,
      );
    }

    try {
      const professional = new this.professionalModel({
        specialty: createProfessionalDto.specialty,
        userId: new Types.ObjectId(createProfessionalDto.userId),
      });
      return await professional.save();
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException(
          'A professional with this userId already exists',
        );
      }
      throw error;
    }
  }

  async findAll(): Promise<ProfessionalDocument[]> {
    return this.professionalModel.find().populate('userId').exec();
  }

  async findById(id: string): Promise<ProfessionalDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Invalid professional ID: ${id}`);
    }

    const professional = await this.professionalModel
      .findById(id)
      .populate('userId')
      .exec();

    if (!professional) {
      throw new NotFoundException(`Professional with ID ${id} not found`);
    }

    return professional;
  }

  async update(
    id: string,
    updateProfessionalDto: UpdateProfessionalDto,
  ): Promise<ProfessionalDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Invalid professional ID: ${id}`);
    }

    const professional = await this.professionalModel
      .findByIdAndUpdate(id, updateProfessionalDto, { new: true })
      .populate('userId')
      .exec();

    if (!professional) {
      throw new NotFoundException(`Professional with ID ${id} not found`);
    }

    return professional;
  }

  async remove(id: string): Promise<{ success: boolean }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Invalid professional ID: ${id}`);
    }

    const result = await this.professionalModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Professional with ID ${id} not found`);
    }

    return { success: true };
  }
}

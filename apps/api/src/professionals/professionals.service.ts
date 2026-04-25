import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Professional,
  ProfessionalDocument,
} from './schemas/professional.schema';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { Specialty } from '../common/enums/specialty.enum';

interface FindAllFilter {
  city?: string;
  specialty?: Specialty;
}

@Injectable()
export class ProfessionalsService {
  constructor(
    @InjectModel(Professional.name)
    private readonly professionalModel: Model<ProfessionalDocument>,
  ) {}

  async create(dto: CreateProfessionalDto): Promise<ProfessionalDocument> {
    if (!Types.ObjectId.isValid(dto.userId)) {
      throw new NotFoundException(`Invalid user ID: ${dto.userId}`);
    }

    try {
      const created = new this.professionalModel({
        ...dto,
        userId: new Types.ObjectId(dto.userId),
      });
      return await created.save();
    } catch (err: unknown) {
      if (this.isDuplicateKeyError(err)) {
        throw new ConflictException(
          'A professional with this CPF or userId already exists',
        );
      }
      throw err;
    }
  }

  async findAll(filter: FindAllFilter = {}): Promise<ProfessionalDocument[]> {
    const query: Record<string, unknown> = {};

    if (filter.city) {
      query['address.city'] = filter.city;
    }
    if (filter.specialty) {
      query.specialty = filter.specialty;
    }

    return this.professionalModel.find(query).populate('userId').exec();
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
    dto: UpdateProfessionalDto,
  ): Promise<ProfessionalDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Invalid professional ID: ${id}`);
    }

    try {
      const updated = await this.professionalModel
        .findByIdAndUpdate(id, dto, { new: true, runValidators: true })
        .populate('userId')
        .exec();

      if (!updated) {
        throw new NotFoundException(`Professional with ID ${id} not found`);
      }
      return updated;
    } catch (err: unknown) {
      if (this.isDuplicateKeyError(err)) {
        throw new ConflictException('CPF already registered');
      }
      throw err;
    }
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

  private isDuplicateKeyError(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: number }).code === 11000
    );
  }
}

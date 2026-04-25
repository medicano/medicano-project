import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ProfessionalAvailability,
  ProfessionalAvailabilityDocument,
} from './schemas/professional-availability.schema';
import { CreateProfessionalAvailabilityDto } from './dto/create-professional-availability.dto';
import { UpdateProfessionalAvailabilityDto } from './dto/update-professional-availability.dto';
import { WeeklySlotDto } from '../common/dto/weekly-slot.dto';
import { ProfessionalsService } from '../professionals/professionals.service';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectModel(ProfessionalAvailability.name)
    private readonly availabilityModel: Model<ProfessionalAvailabilityDocument>,
    private readonly professionalsService: ProfessionalsService,
  ) {}

  async create(
    professionalId: string,
    dto: CreateProfessionalAvailabilityDto,
    currentUserId: string,
    currentUserRole: Role,
  ): Promise<ProfessionalAvailabilityDocument> {
    await this.enforceOwnership(
      professionalId,
      currentUserId,
      currentUserRole,
    );

    const isUnavailable = dto.isUnavailable ?? false;
    const customSlots = dto.customSlots ?? [];

    this.validateSlots(isUnavailable, customSlots);

    const normalizedDate = this.normalizeDateToUtcMidnight(dto.date);

    try {
      const created = new this.availabilityModel({
        professionalId: new Types.ObjectId(professionalId),
        date: normalizedDate,
        isUnavailable,
        customSlots,
      });
      return await created.save();
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          `Availability for this professional on ${dto.date} already exists`,
        );
      }
      throw error;
    }
  }

  async findByProfessionalAndDate(
    professionalId: string,
    dateString: string,
  ): Promise<ProfessionalAvailabilityDocument | null> {
    if (!Types.ObjectId.isValid(professionalId)) {
      throw new NotFoundException(
        `Invalid professional ID: ${professionalId}`,
      );
    }

    const normalizedDate = this.normalizeDateToUtcMidnight(dateString);

    return this.availabilityModel
      .findOne({
        professionalId: new Types.ObjectId(professionalId),
        date: normalizedDate,
      })
      .exec();
  }

  async findById(
    availabilityId: string,
  ): Promise<ProfessionalAvailabilityDocument> {
    if (!Types.ObjectId.isValid(availabilityId)) {
      throw new NotFoundException(
        `Invalid availability ID: ${availabilityId}`,
      );
    }

    const availability = await this.availabilityModel
      .findById(availabilityId)
      .exec();

    if (!availability) {
      throw new NotFoundException(
        `Availability with ID ${availabilityId} not found`,
      );
    }

    return availability;
  }

  async update(
    availabilityId: string,
    dto: UpdateProfessionalAvailabilityDto,
    currentUserId: string,
    currentUserRole: Role,
  ): Promise<ProfessionalAvailabilityDocument> {
    const availability = await this.findById(availabilityId);

    await this.enforceOwnership(
      availability.professionalId.toString(),
      currentUserId,
      currentUserRole,
    );

    const nextIsUnavailable =
      dto.isUnavailable ?? availability.isUnavailable;
    const nextCustomSlots =
      dto.customSlots !== undefined ? dto.customSlots : availability.customSlots;

    this.validateSlots(nextIsUnavailable, nextCustomSlots);

    if (dto.date !== undefined) {
      availability.date = this.normalizeDateToUtcMidnight(dto.date);
    }
    if (dto.isUnavailable !== undefined) {
      availability.isUnavailable = dto.isUnavailable;
    }
    if (dto.customSlots !== undefined) {
      availability.customSlots = dto.customSlots;
    }

    try {
      return await availability.save();
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          'Availability for this professional on this date already exists',
        );
      }
      throw error;
    }
  }

  async remove(
    availabilityId: string,
    currentUserId: string,
    currentUserRole: Role,
  ): Promise<{ success: boolean }> {
    const availability = await this.findById(availabilityId);

    await this.enforceOwnership(
      availability.professionalId.toString(),
      currentUserId,
      currentUserRole,
    );

    await this.availabilityModel.findByIdAndDelete(availabilityId).exec();
    return { success: true };
  }

  private async enforceOwnership(
    professionalId: string,
    currentUserId: string,
    currentUserRole: Role,
  ): Promise<void> {
    if (currentUserRole !== Role.PROFESSIONAL) {
      return;
    }

    const professional = await this.professionalsService.findById(
      professionalId,
    );
    if (professional.userId.toString() !== currentUserId) {
      throw new ForbiddenException(
        'You can only manage your own availability',
      );
    }
  }

  private normalizeDateToUtcMidnight(dateString: string): Date {
    const date = new Date(dateString);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  private validateSlots(
    isUnavailable: boolean,
    customSlots: WeeklySlotDto[],
  ): void {
    if (isUnavailable && customSlots.length > 0) {
      throw new BadRequestException(
        'Cannot have custom slots when marked as unavailable',
      );
    }

    if (customSlots.length === 0) {
      return;
    }

    for (const slot of customSlots) {
      if (slot.startTime >= slot.endTime) {
        throw new BadRequestException(
          `Invalid time range: startTime (${slot.startTime}) must be before endTime (${slot.endTime})`,
        );
      }
    }

    const sorted = [...customSlots].sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) {
        return a.dayOfWeek - b.dayOfWeek;
      }
      return a.startTime.localeCompare(b.startTime);
    });

    for (let index = 0; index < sorted.length - 1; index++) {
      const current = sorted[index];
      const next = sorted[index + 1];
      if (
        current.dayOfWeek === next.dayOfWeek &&
        current.endTime > next.startTime
      ) {
        throw new BadRequestException(
          `Overlapping slots detected on day ${current.dayOfWeek}: ${current.startTime}-${current.endTime} and ${next.startTime}-${next.endTime}`,
        );
      }
    }
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: number }).code === 11000
    );
  }
}

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
import { AvailableSlotDto } from './dto/available-slot.dto';
import { WeeklySlotDto } from '../common/dto/weekly-slot.dto';
import { ProfessionalsService } from '../professionals/professionals.service';
import { Role } from '../common/enums/role.enum';
import { validateWeeklySlots } from '../common/utils/validate-weekly-slots';
import {
  Appointment,
  AppointmentDocument,
  AppointmentStatus,
} from '../appointments/schemas/appointment.schema';
import { computeSlotsForDay } from './utils/compute-slots';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectModel(ProfessionalAvailability.name)
    private readonly availabilityModel: Model<ProfessionalAvailabilityDocument>,
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
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

    this.validateAvailabilitySlots(isUnavailable, customSlots);

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

    this.validateAvailabilitySlots(nextIsUnavailable, nextCustomSlots);

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

  async getAvailableSlots(
    professionalId: string,
    dateString: string,
  ): Promise<AvailableSlotDto[]> {
    const professional = await this.professionalsService.findById(
      professionalId,
    );

    const dayStart = this.normalizeDateToUtcMidnight(dateString);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const override = await this.availabilityModel
      .findOne({
        professionalId: new Types.ObjectId(professionalId),
        date: dayStart,
      })
      .exec();

    if (override && override.isUnavailable) {
      return [];
    }

    const sourceSlots: WeeklySlotDto[] =
      override && override.customSlots && override.customSlots.length > 0
        ? override.customSlots
        : professional.weeklySlots ?? [];

    if (sourceSlots.length === 0) {
      return [];
    }

    const appointments = await this.appointmentModel
      .find({
        professionalId: new Types.ObjectId(professionalId),
        status: { $ne: AppointmentStatus.CANCELLED },
        startAt: { $lt: dayEnd },
        endAt: { $gt: dayStart },
      })
      .select('startAt endAt')
      .exec();

    return computeSlotsForDay(dayStart, sourceSlots, appointments);
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

  private validateAvailabilitySlots(
    isUnavailable: boolean,
    customSlots: WeeklySlotDto[],
  ): void {
    if (isUnavailable && customSlots.length > 0) {
      throw new BadRequestException(
        'Cannot have custom slots when marked as unavailable',
      );
    }

    validateWeeklySlots(customSlots);
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

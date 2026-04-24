import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Appointment,
  AppointmentDocument,
  AppointmentStatus,
  VALID_STATUS_TRANSITIONS,
} from './schemas/appointment.schema';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { GetAppointmentsQueryDto } from './dto/get-appointments-query.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
  ) {}

  async create(dto: CreateAppointmentDto): Promise<AppointmentDocument> {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(startAt.getTime() + dto.durationMinutes * 60 * 1000);

    await this.checkConflict(dto.professionalId, startAt, endAt);

    const appointment = new this.appointmentModel({
      clinicId: new Types.ObjectId(dto.clinicId),
      professionalId: new Types.ObjectId(dto.professionalId),
      patientId: new Types.ObjectId(dto.patientId),
      startAt,
      endAt,
      durationMinutes: dto.durationMinutes,
      notes: dto.notes,
      status: AppointmentStatus.SCHEDULED,
    });

    return appointment.save();
  }

  async findAll(query: GetAppointmentsQueryDto): Promise<AppointmentDocument[]> {
    const filter: Record<string, unknown> = {};

    if (query.clinicId) filter.clinicId = new Types.ObjectId(query.clinicId);
    if (query.professionalId) filter.professionalId = new Types.ObjectId(query.professionalId);
    if (query.patientId) filter.patientId = new Types.ObjectId(query.patientId);
    if (query.status) filter.status = query.status;

    if (query.date) {
      const dayStart = new Date(query.date);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
      filter.startAt = { $gte: dayStart, $lt: dayEnd };
    }

    return this.appointmentModel.find(filter).sort({ startAt: 1 }).exec();
  }

  async findById(id: string): Promise<AppointmentDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Invalid appointment ID: ${id}`);
    }

    const appointment = await this.appointmentModel.findById(id).exec();

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    return appointment;
  }

  async update(id: string, dto: UpdateAppointmentDto): Promise<AppointmentDocument> {
    const existing = await this.findById(id);

    if (dto.startAt !== undefined || dto.durationMinutes !== undefined) {
      const startAt = dto.startAt ? new Date(dto.startAt) : existing.startAt;
      const durationMinutes = dto.durationMinutes ?? existing.durationMinutes;
      const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);

      await this.checkConflict(existing.professionalId.toString(), startAt, endAt, id);
    }

    const updateData: Partial<Appointment> & { endAt?: Date } = {};

    if (dto.startAt !== undefined) {
      updateData.startAt = new Date(dto.startAt);
      const durationMinutes = dto.durationMinutes ?? existing.durationMinutes;
      updateData.endAt = new Date(updateData.startAt.getTime() + durationMinutes * 60 * 1000);
    } else if (dto.durationMinutes !== undefined) {
      updateData.endAt = new Date(existing.startAt.getTime() + dto.durationMinutes * 60 * 1000);
    }

    if (dto.durationMinutes !== undefined) updateData.durationMinutes = dto.durationMinutes;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    const updated = await this.appointmentModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    return updated;
  }

  async updateStatus(
    id: string,
    dto: UpdateAppointmentStatusDto,
  ): Promise<AppointmentDocument> {
    const appointment = await this.findById(id);

    const allowedNextStatuses = VALID_STATUS_TRANSITIONS[appointment.status];
    if (!allowedNextStatuses.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${appointment.status} to ${dto.status}`,
      );
    }

    const updated = await this.appointmentModel
      .findByIdAndUpdate(id, { status: dto.status }, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    return updated;
  }

  async cancel(id: string): Promise<{ success: boolean }> {
    await this.updateStatus(id, { status: AppointmentStatus.CANCELLED });
    return { success: true };
  }

  private async checkConflict(
    professionalId: string,
    startAt: Date,
    endAt: Date,
    excludeId?: string,
  ): Promise<void> {
    const filter: Record<string, unknown> = {
      professionalId: new Types.ObjectId(professionalId),
      status: { $nin: [AppointmentStatus.CANCELLED] },
      startAt: { $lt: endAt },
      endAt: { $gt: startAt },
    };

    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    const conflicting = await this.appointmentModel.findOne(filter).exec();

    if (conflicting) {
      throw new ConflictException(
        'Appointment slot overlaps with an existing appointment',
      );
    }
  }
}

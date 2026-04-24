import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { AppointmentsService } from '../appointments.service';
import { Appointment, AppointmentStatus } from '../schemas/appointment.schema';

const clinicId = new Types.ObjectId().toHexString();
const professionalId = new Types.ObjectId().toHexString();
const patientId = new Types.ObjectId().toHexString();
const appointmentId = new Types.ObjectId().toHexString();

const mockSave = jest.fn();

function MockAppointmentModel(this: any, dto: any) {
  Object.assign(this, { ...dto, save: mockSave });
}
MockAppointmentModel.findOne = jest.fn();
MockAppointmentModel.find = jest.fn();
MockAppointmentModel.findById = jest.fn();
MockAppointmentModel.findByIdAndUpdate = jest.fn();

describe('AppointmentsService', () => {
  let appointmentsService: AppointmentsService;

  beforeEach(async () => {
    mockSave.mockImplementation(function (this: any) {
      return Promise.resolve(this);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        {
          provide: getModelToken(Appointment.name),
          useValue: MockAppointmentModel,
        },
      ],
    }).compile();

    appointmentsService = module.get<AppointmentsService>(AppointmentsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    const baseCreateDto = {
      clinicId,
      professionalId,
      patientId,
      startAt: '2026-05-01T10:00:00.000Z',
      durationMinutes: 60,
    };

    it('should create appointment and compute endAt correctly', async () => {
      MockAppointmentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await appointmentsService.create(baseCreateDto);

      const expectedEndAt = new Date(
        new Date(baseCreateDto.startAt).getTime() + 60 * 60 * 1000,
      );
      expect(result.endAt).toEqual(expectedEndAt);
      expect(result.status).toBe(AppointmentStatus.SCHEDULED);
      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException when professional has overlapping appointment', async () => {
      MockAppointmentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'existing-id' }),
      });

      await expect(appointmentsService.create(baseCreateDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ─── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return all appointments when no filters provided', async () => {
      const appointments = [{ status: AppointmentStatus.SCHEDULED }];
      MockAppointmentModel.find.mockReturnValue({
        sort: jest
          .fn()
          .mockReturnValue({ exec: jest.fn().mockResolvedValue(appointments) }),
      });

      const result = await appointmentsService.findAll({});

      expect(result).toEqual(appointments);
      expect(MockAppointmentModel.find).toHaveBeenCalledWith({});
    });

    it('should filter appointments by clinicId', async () => {
      const appointments = [{ clinicId: new Types.ObjectId(clinicId) }];
      MockAppointmentModel.find.mockReturnValue({
        sort: jest
          .fn()
          .mockReturnValue({ exec: jest.fn().mockResolvedValue(appointments) }),
      });

      const result = await appointmentsService.findAll({ clinicId });

      expect(result).toEqual(appointments);
      const [[filterArg]] = MockAppointmentModel.find.mock.calls as [
        [{ clinicId: Types.ObjectId }],
      ];
      expect(filterArg.clinicId.toString()).toBe(clinicId);
    });

    it('should filter appointments by date returning only that calendar day', async () => {
      const appointments = [{ startAt: new Date('2026-05-01T10:00:00Z') }];
      MockAppointmentModel.find.mockReturnValue({
        sort: jest
          .fn()
          .mockReturnValue({ exec: jest.fn().mockResolvedValue(appointments) }),
      });

      await appointmentsService.findAll({ date: '2026-05-01' });

      const [[filterArg]] = MockAppointmentModel.find.mock.calls as [
        [{ startAt: unknown }],
      ];
      expect(filterArg.startAt).toEqual({
        $gte: new Date('2026-05-01T00:00:00.000Z'),
        $lt: new Date('2026-05-02T00:00:00.000Z'),
      });
    });
  });

  // ─── findById ──────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return the appointment when found', async () => {
      const appointment = {
        _id: appointmentId,
        status: AppointmentStatus.SCHEDULED,
      };
      MockAppointmentModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(appointment),
      });

      const result = await appointmentsService.findById(appointmentId);

      expect(result).toEqual(appointment);
    });

    it('should throw NotFoundException for an invalid ObjectId', async () => {
      await expect(appointmentsService.findById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when appointment does not exist', async () => {
      MockAppointmentModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(appointmentsService.findById(appointmentId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update appointment and recheck conflict excluding itself', async () => {
      const newStartAt = '2026-05-01T14:00:00.000Z';
      const existing = {
        _id: appointmentId,
        startAt: new Date('2026-05-01T10:00:00Z'),
        durationMinutes: 60,
        professionalId: new Types.ObjectId(professionalId),
        status: AppointmentStatus.SCHEDULED,
      };
      const updated = {
        ...existing,
        startAt: new Date(newStartAt),
        endAt: new Date(new Date(newStartAt).getTime() + 60 * 60 * 1000),
      };

      MockAppointmentModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });
      MockAppointmentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      MockAppointmentModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updated),
      });

      const result = await appointmentsService.update(appointmentId, {
        startAt: newStartAt,
      });

      expect(result.startAt).toEqual(new Date(newStartAt));
      // conflict check ran and excluded the appointment being updated
      expect(MockAppointmentModel.findOne).toHaveBeenCalledTimes(1);
      const [[conflictFilter]] = MockAppointmentModel.findOne.mock.calls as [
        [{ _id: unknown }],
      ];
      expect(conflictFilter._id).toEqual({ $ne: appointmentId });
    });
  });

  // ─── updateStatus ──────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    it('should transition status from SCHEDULED to CONFIRMED', async () => {
      const appointment = {
        _id: appointmentId,
        status: AppointmentStatus.SCHEDULED,
      };
      const updated = { ...appointment, status: AppointmentStatus.CONFIRMED };

      MockAppointmentModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(appointment),
      });
      MockAppointmentModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updated),
      });

      const result = await appointmentsService.updateStatus(appointmentId, {
        status: AppointmentStatus.CONFIRMED,
      });

      expect(result.status).toBe(AppointmentStatus.CONFIRMED);
      expect(MockAppointmentModel.findByIdAndUpdate).toHaveBeenCalledWith(
        appointmentId,
        { status: AppointmentStatus.CONFIRMED },
        { new: true },
      );
    });

    it('should throw BadRequestException for invalid transition (COMPLETED → SCHEDULED)', async () => {
      const appointment = {
        _id: appointmentId,
        status: AppointmentStatus.COMPLETED,
      };

      MockAppointmentModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(appointment),
      });

      await expect(
        appointmentsService.updateStatus(appointmentId, {
          status: AppointmentStatus.SCHEDULED,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── cancel ────────────────────────────────────────────────────────────────

  describe('cancel', () => {
    it('should set status to CANCELLED and return { success: true }', async () => {
      const appointment = {
        _id: appointmentId,
        status: AppointmentStatus.SCHEDULED,
      };
      const cancelled = { ...appointment, status: AppointmentStatus.CANCELLED };

      MockAppointmentModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(appointment),
      });
      MockAppointmentModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(cancelled),
      });

      const result = await appointmentsService.cancel(appointmentId);

      expect(result).toEqual({ success: true });
      expect(MockAppointmentModel.findByIdAndUpdate).toHaveBeenCalledWith(
        appointmentId,
        { status: AppointmentStatus.CANCELLED },
        { new: true },
      );
    });
  });
});

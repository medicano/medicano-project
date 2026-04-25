import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { AvailabilityService } from '../availability.service';
import { ProfessionalAvailability } from '../schemas/professional-availability.schema';
import { ProfessionalsService } from '../../professionals/professionals.service';
import { Role } from '../../common/enums/role.enum';

const professionalId = new Types.ObjectId().toHexString();
const availabilityId = new Types.ObjectId().toHexString();
const ownerUserId = new Types.ObjectId().toHexString();
const otherUserId = new Types.ObjectId().toHexString();

const mockSave = jest.fn();

function MockAvailabilityModel(this: any, dto: any) {
  Object.assign(this, { ...dto, save: mockSave });
}
MockAvailabilityModel.findOne = jest.fn();
MockAvailabilityModel.findById = jest.fn();
MockAvailabilityModel.findByIdAndDelete = jest.fn();

const mockProfessionalsService = {
  findById: jest.fn(),
};

describe('AvailabilityService', () => {
  let availabilityService: AvailabilityService;

  beforeEach(async () => {
    mockSave.mockImplementation(function (this: any) {
      return Promise.resolve(this);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        {
          provide: getModelToken(ProfessionalAvailability.name),
          useValue: MockAvailabilityModel,
        },
        {
          provide: ProfessionalsService,
          useValue: mockProfessionalsService,
        },
      ],
    }).compile();

    availabilityService = module.get<AvailabilityService>(AvailabilityService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    const baseDto = {
      date: '2026-05-01T00:00:00.000Z',
      isUnavailable: false,
      customSlots: [
        {
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '12:00',
          slotDurationMinutes: 30,
        },
      ],
    };

    it('should create availability with normalized UTC-midnight date', async () => {
      mockProfessionalsService.findById.mockResolvedValue({
        userId: { toString: () => ownerUserId },
      });

      const result = await availabilityService.create(
        professionalId,
        baseDto,
        ownerUserId,
        Role.PROFESSIONAL,
      );

      expect(result.date).toEqual(new Date('2026-05-01T00:00:00.000Z'));
      expect(result.isUnavailable).toBe(false);
      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('should skip ownership check for CLINIC role', async () => {
      const result = await availabilityService.create(
        professionalId,
        baseDto,
        otherUserId,
        Role.CLINIC,
      );

      expect(mockProfessionalsService.findById).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw ForbiddenException when professional acts on another professional', async () => {
      mockProfessionalsService.findById.mockResolvedValue({
        userId: { toString: () => ownerUserId },
      });

      await expect(
        availabilityService.create(
          professionalId,
          baseDto,
          otherUserId,
          Role.PROFESSIONAL,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when isUnavailable is true and customSlots are provided', async () => {
      await expect(
        availabilityService.create(
          professionalId,
          { ...baseDto, isUnavailable: true },
          ownerUserId,
          Role.CLINIC,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when a slot has startTime >= endTime', async () => {
      await expect(
        availabilityService.create(
          professionalId,
          {
            ...baseDto,
            customSlots: [
              {
                dayOfWeek: 1,
                startTime: '12:00',
                endTime: '09:00',
                slotDurationMinutes: 30,
              },
            ],
          },
          ownerUserId,
          Role.CLINIC,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for overlapping slots on the same day', async () => {
      await expect(
        availabilityService.create(
          professionalId,
          {
            ...baseDto,
            customSlots: [
              {
                dayOfWeek: 1,
                startTime: '09:00',
                endTime: '12:00',
                slotDurationMinutes: 30,
              },
              {
                dayOfWeek: 1,
                startTime: '11:00',
                endTime: '14:00',
                slotDurationMinutes: 30,
              },
            ],
          },
          ownerUserId,
          Role.CLINIC,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException on duplicate key error', async () => {
      mockSave.mockRejectedValueOnce({ code: 11000 });

      await expect(
        availabilityService.create(
          professionalId,
          baseDto,
          ownerUserId,
          Role.CLINIC,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── findByProfessionalAndDate ─────────────────────────────────────────────

  describe('findByProfessionalAndDate', () => {
    it('should return availability normalized to UTC midnight', async () => {
      const found = { _id: availabilityId };
      MockAvailabilityModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(found),
      });

      const result = await availabilityService.findByProfessionalAndDate(
        professionalId,
        '2026-05-01T15:00:00.000Z',
      );

      expect(result).toEqual(found);
      const [[filter]] = MockAvailabilityModel.findOne.mock.calls as [
        [{ date: Date }],
      ];
      expect(filter.date).toEqual(new Date('2026-05-01T00:00:00.000Z'));
    });

    it('should return null when no availability exists', async () => {
      MockAvailabilityModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await availabilityService.findByProfessionalAndDate(
        professionalId,
        '2026-05-01',
      );
      expect(result).toBeNull();
    });

    it('should throw NotFoundException for an invalid professional ID', async () => {
      await expect(
        availabilityService.findByProfessionalAndDate(
          'invalid-id',
          '2026-05-01',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findById ──────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return availability when found', async () => {
      const found = { _id: availabilityId };
      MockAvailabilityModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(found),
      });

      const result = await availabilityService.findById(availabilityId);
      expect(result).toEqual(found);
    });

    it('should throw NotFoundException for an invalid ObjectId', async () => {
      await expect(availabilityService.findById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when not found', async () => {
      MockAvailabilityModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        availabilityService.findById(availabilityId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update isUnavailable when provided', async () => {
      const existing = {
        _id: availabilityId,
        professionalId: { toString: () => professionalId },
        date: new Date('2026-05-01T00:00:00.000Z'),
        isUnavailable: false,
        customSlots: [],
        save: jest.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        }),
      };
      MockAvailabilityModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });

      const result = await availabilityService.update(
        availabilityId,
        { isUnavailable: true },
        ownerUserId,
        Role.CLINIC,
      );

      expect(result.isUnavailable).toBe(true);
    });

    it('should throw BadRequestException when update would produce unavailable-with-slots state', async () => {
      const existing = {
        _id: availabilityId,
        professionalId: { toString: () => professionalId },
        date: new Date('2026-05-01T00:00:00.000Z'),
        isUnavailable: false,
        customSlots: [
          {
            dayOfWeek: 1,
            startTime: '09:00',
            endTime: '12:00',
            slotDurationMinutes: 30,
          },
        ],
        save: jest.fn(),
      };
      MockAvailabilityModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });

      await expect(
        availabilityService.update(
          availabilityId,
          { isUnavailable: true },
          ownerUserId,
          Role.CLINIC,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete availability and return { success: true }', async () => {
      const existing = {
        _id: availabilityId,
        professionalId: { toString: () => professionalId },
      };
      MockAvailabilityModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });
      MockAvailabilityModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });

      const result = await availabilityService.remove(
        availabilityId,
        ownerUserId,
        Role.CLINIC,
      );

      expect(result).toEqual({ success: true });
      expect(MockAvailabilityModel.findByIdAndDelete).toHaveBeenCalledWith(
        availabilityId,
      );
    });

    it('should throw ForbiddenException for professional not owning the availability', async () => {
      const existing = {
        _id: availabilityId,
        professionalId: { toString: () => professionalId },
      };
      MockAvailabilityModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });
      mockProfessionalsService.findById.mockResolvedValue({
        userId: { toString: () => ownerUserId },
      });

      await expect(
        availabilityService.remove(
          availabilityId,
          otherUserId,
          Role.PROFESSIONAL,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

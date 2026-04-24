import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';

import { SubscriptionsService } from '../subscriptions.service';
import {
  Subscription,
  SubscriptionPlan,
  PLAN_PROFESSIONAL_LIMITS,
} from '../schemas/subscription.schema';
import { SubscriptionStatus } from '../../clinics/schemas/clinic.schema';
import { ClinicsService } from '../../clinics/clinics.service';

interface MockModel {
  findOne: jest.Mock;
  findById: jest.Mock;
  findByIdAndUpdate: jest.Mock;
  create: jest.Mock;
}

interface MockClinicsService {
  findById: jest.Mock;
}

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;

  const mockSubscriptionModel: MockModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    create: jest.fn(),
  };

  const mockClinicsService: MockClinicsService = {
    findById: jest.fn(),
  };

  const mockClinicId = new Types.ObjectId().toString();
  const mockId = new Types.ObjectId().toString();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: getModelToken(Subscription.name),
          useValue: mockSubscriptionModel,
        },
        {
          provide: ClinicsService,
          useValue: mockClinicsService,
        },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create subscription for a valid clinic', async () => {
      const dto = {
        clinicId: mockClinicId,
        plan: SubscriptionPlan.FREE,
        expiresAt: new Date().toISOString(),
      };
      const created = {
        _id: mockId,
        clinicId: new Types.ObjectId(mockClinicId),
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.ACTIVE,
      };

      mockClinicsService.findById.mockResolvedValue({
        _id: mockClinicId,
        name: 'Clinic',
      });
      mockSubscriptionModel.create.mockResolvedValue(created);

      const result = await service.create(dto as never);

      expect(mockClinicsService.findById).toHaveBeenCalledWith(mockClinicId);
      expect(mockSubscriptionModel.create).toHaveBeenCalled();
      expect(result).toEqual(created);
    });

    it('should throw ConflictException when subscription already exists for clinic', async () => {
      const dto = {
        clinicId: mockClinicId,
        plan: SubscriptionPlan.FREE,
        expiresAt: new Date().toISOString(),
      };
      const duplicateErr: Error & { code?: number } = new Error('duplicate');
      duplicateErr.code = 11000;

      mockClinicsService.findById.mockResolvedValue({ _id: mockClinicId });
      mockSubscriptionModel.create.mockRejectedValue(duplicateErr);

      await expect(service.create(dto as never)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException when clinic does not exist', async () => {
      const dto = {
        clinicId: mockClinicId,
        plan: SubscriptionPlan.FREE,
        expiresAt: new Date().toISOString(),
      };
      mockClinicsService.findById.mockRejectedValue(
        new NotFoundException('Clinic not found'),
      );

      await expect(service.create(dto as never)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockSubscriptionModel.create).not.toHaveBeenCalled();
    });
  });

  describe('findByClinicId', () => {
    it('should return subscription when found', async () => {
      const sub = {
        _id: mockId,
        clinicId: new Types.ObjectId(mockClinicId),
        plan: SubscriptionPlan.BASIC,
        status: SubscriptionStatus.ACTIVE,
      };
      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(sub),
      });

      const result = await service.findByClinicId(mockClinicId);

      expect(result).toEqual(sub);
      expect(mockSubscriptionModel.findOne).toHaveBeenCalled();
    });

    it('should return null when not found', async () => {
      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findByClinicId(mockClinicId);

      expect(result).toBeNull();
    });

    it('should return null for invalid ObjectId without throwing', async () => {
      const result = await service.findByClinicId('invalid-id');
      expect(result).toBeNull();
      expect(mockSubscriptionModel.findOne).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return subscription when found', async () => {
      const sub = {
        _id: mockId,
        clinicId: new Types.ObjectId(mockClinicId),
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.ACTIVE,
      };
      mockSubscriptionModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(sub),
      });

      const result = await service.findById(mockId);

      expect(result).toEqual(sub);
    });

    it('should throw NotFoundException when not found', async () => {
      mockSubscriptionModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findById(mockId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for invalid ObjectId', async () => {
      await expect(service.findById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('cancel', () => {
    it('should set status to INACTIVE and return updated subscription', async () => {
      const existing = {
        _id: mockId,
        clinicId: new Types.ObjectId(mockClinicId),
        plan: SubscriptionPlan.BASIC,
        status: SubscriptionStatus.ACTIVE,
      };
      const updated = {
        ...existing,
        status: SubscriptionStatus.INACTIVE,
      };

      mockSubscriptionModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });
      mockSubscriptionModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updated),
      });

      const result = await service.cancel(mockId);

      expect(mockSubscriptionModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockId,
        { status: SubscriptionStatus.INACTIVE },
        { new: true },
      );
      expect(result).toEqual(updated);
      expect(result?.status).toBe(SubscriptionStatus.INACTIVE);
    });
  });

  describe('enforceClinicProfessionalLimit', () => {
    it('should resolve without error when count is below FREE limit', async () => {
      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ plan: SubscriptionPlan.FREE }),
      });

      await expect(
        service.enforceClinicProfessionalLimit(mockClinicId, 0),
      ).resolves.not.toThrow();
    });

    it('should resolve when count equals limit minus 1', async () => {
      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ plan: SubscriptionPlan.FREE }),
      });

      const limit = PLAN_PROFESSIONAL_LIMITS[SubscriptionPlan.FREE];
      await expect(
        service.enforceClinicProfessionalLimit(mockClinicId, limit - 1),
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when count equals FREE limit', async () => {
      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ plan: SubscriptionPlan.FREE }),
      });

      const limit = PLAN_PROFESSIONAL_LIMITS[SubscriptionPlan.FREE];
      await expect(
        service.enforceClinicProfessionalLimit(mockClinicId, limit),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when count exceeds BASIC limit', async () => {
      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ plan: SubscriptionPlan.BASIC }),
      });

      const limit = PLAN_PROFESSIONAL_LIMITS[SubscriptionPlan.BASIC];
      await expect(
        service.enforceClinicProfessionalLimit(mockClinicId, limit + 5),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should never throw for PRO plan regardless of count', async () => {
      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ plan: SubscriptionPlan.PRO }),
      });

      await expect(
        service.enforceClinicProfessionalLimit(mockClinicId, 9999),
      ).resolves.not.toThrow();
    });

    it('should default to FREE limits when no subscription found', async () => {
      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const limit = PLAN_PROFESSIONAL_LIMITS[SubscriptionPlan.FREE];
      await expect(
        service.enforceClinicProfessionalLimit(mockClinicId, limit),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

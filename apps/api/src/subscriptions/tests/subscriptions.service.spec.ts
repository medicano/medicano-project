import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';

import { SubscriptionsService } from '../subscriptions.service';
import { Subscription } from '../schemas/subscription.schema';
import { ClinicsService } from '../../clinics/clinics.service';
import {
  SubscriptionPlan,
  SubscriptionStatus,
  PLAN_PROFESSIONAL_LIMITS,
} from '../constants/subscription.constants';

type MockModel = {
  findOne: jest.Mock;
  findById: jest.Mock;
  findByIdAndUpdate: jest.Mock;
  create: jest.Mock;
};

interface MockClinicsService {
  findById: jest.Mock;
}

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let subscriptionModel: MockModel;
  let clinicsService: MockClinicsService;

  const mockClinicId = new Types.ObjectId().toString();
  const mockId = new Types.ObjectId().toString();

  beforeEach(async () => {
    subscriptionModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      create: jest.fn(),
    };

    clinicsService = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: getModelToken(Subscription.name),
          useValue: subscriptionModel,
        },
        {
          provide: ClinicsService,
          useValue: clinicsService,
        },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create subscription for a valid clinic', async () => {
      const dto = {
        clinicId: mockClinicId,
        plan: SubscriptionPlan.BASIC,
      } as any;

      const created = {
        _id: mockId,
        clinicId: new Types.ObjectId(mockClinicId),
        plan: SubscriptionPlan.BASIC,
        status: SubscriptionStatus.ACTIVE,
      };

      clinicsService.findById.mockResolvedValue({ _id: mockClinicId });
      subscriptionModel.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(clinicsService.findById).toHaveBeenCalledWith(mockClinicId);
      expect(subscriptionModel.create).toHaveBeenCalled();
      expect(result).toEqual(created);
    });

    it('should throw ConflictException when subscription already exists for clinic', async () => {
      const dto = {
        clinicId: mockClinicId,
        plan: SubscriptionPlan.BASIC,
      } as any;

      clinicsService.findById.mockResolvedValue({ _id: mockClinicId });
      const duplicateError: any = new Error('duplicate key');
      duplicateError.code = 11000;
      subscriptionModel.create.mockRejectedValue(duplicateError);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when clinic does not exist', async () => {
      const dto = {
        clinicId: mockClinicId,
        plan: SubscriptionPlan.BASIC,
      } as any;

      clinicsService.findById.mockRejectedValue(
        new NotFoundException('Clinic not found'),
      );

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(subscriptionModel.create).not.toHaveBeenCalled();
    });
  });

  describe('findByClinicId', () => {
    it('should return subscription when found', async () => {
      const subscription = {
        _id: mockId,
        clinicId: new Types.ObjectId(mockClinicId),
        plan: SubscriptionPlan.BASIC,
        status: SubscriptionStatus.ACTIVE,
      };

      subscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(subscription),
      });

      const result = await service.findByClinicId(mockClinicId);

      expect(result).toEqual(subscription);
    });

    it('should return null when not found', async () => {
      subscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findByClinicId(mockClinicId);

      expect(result).toBeNull();
    });

    it('should return null for invalid ObjectId without throwing', async () => {
      const result = await service.findByClinicId('invalid-object-id');

      expect(result).toBeNull();
      expect(subscriptionModel.findOne).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return subscription when found', async () => {
      const subscription = {
        _id: mockId,
        clinicId: new Types.ObjectId(mockClinicId),
        plan: SubscriptionPlan.BASIC,
        status: SubscriptionStatus.ACTIVE,
      };

      subscriptionModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(subscription),
      });

      const result = await service.findById(mockId);

      expect(result).toEqual(subscription);
    });

    it('should throw NotFoundException when not found', async () => {
      subscriptionModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findById(mockId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for invalid ObjectId', async () => {
      await expect(service.findById('invalid-object-id')).rejects.toThrow(
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

      subscriptionModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });
      subscriptionModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updated),
      });

      const result = await service.cancel(mockId);

      expect(subscriptionModel.findByIdAndUpdate).toHaveBeenCalledWith(
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
      subscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.ACTIVE,
        }),
      });

      await expect(
        service.enforceClinicProfessionalLimit(mockClinicId, 0),
      ).resolves.not.toThrow();
    });

    it('should resolve when count equals limit minus 1', async () => {
      subscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.ACTIVE,
        }),
      });

      const limit = PLAN_PROFESSIONAL_LIMITS[SubscriptionPlan.FREE] as number;

      await expect(
        service.enforceClinicProfessionalLimit(mockClinicId, limit - 1),
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when count equals FREE limit', async () => {
      subscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.ACTIVE,
        }),
      });

      const limit = PLAN_PROFESSIONAL_LIMITS[SubscriptionPlan.FREE] as number;

      await expect(
        service.enforceClinicProfessionalLimit(mockClinicId, limit),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when count exceeds BASIC limit', async () => {
      subscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          plan: SubscriptionPlan.BASIC,
          status: SubscriptionStatus.ACTIVE,
        }),
      });

      const limit = PLAN_PROFESSIONAL_LIMITS[SubscriptionPlan.BASIC] as number;

      await expect(
        service.enforceClinicProfessionalLimit(mockClinicId, limit + 1),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should never throw for PRO plan regardless of count', async () => {
      subscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          plan: SubscriptionPlan.PRO,
          status: SubscriptionStatus.ACTIVE,
        }),
      });

      await expect(
        service.enforceClinicProfessionalLimit(mockClinicId, 9999),
      ).resolves.not.toThrow();
    });

    it('should default to FREE limits when no subscription found', async () => {
      subscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const limit = PLAN_PROFESSIONAL_LIMITS[SubscriptionPlan.FREE] as number;

      await expect(
        service.enforceClinicProfessionalLimit(mockClinicId, limit),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

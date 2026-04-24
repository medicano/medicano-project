import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Subscription,
  SubscriptionDocument,
  SubscriptionPlan,
  PLAN_PROFESSIONAL_LIMITS,
} from './schemas/subscription.schema';
import { SubscriptionStatus } from '../clinics/schemas/clinic.schema';
import { ClinicsService } from '../clinics/clinics.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    private readonly clinicsService: ClinicsService,
  ) {}

  async create(dto: CreateSubscriptionDto): Promise<SubscriptionDocument> {
    if (!Types.ObjectId.isValid(dto.clinicId)) {
      throw new NotFoundException(`Invalid clinic ID: ${dto.clinicId}`);
    }

    await this.clinicsService.findById(dto.clinicId);

    try {
      return await this.subscriptionModel.create({
        ...dto,
        clinicId: new Types.ObjectId(dto.clinicId),
        expiresAt: new Date(dto.expiresAt),
      });
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException(
          'Subscription already exists for this clinic',
        );
      }
      throw error;
    }
  }

  async findByClinicId(
    clinicId: string,
  ): Promise<SubscriptionDocument | null> {
    if (!Types.ObjectId.isValid(clinicId)) {
      return null;
    }

    return this.subscriptionModel
      .findOne({ clinicId: new Types.ObjectId(clinicId) })
      .exec();
  }

  async findById(id: string): Promise<SubscriptionDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Invalid subscription ID: ${id}`);
    }

    const subscription = await this.subscriptionModel.findById(id).exec();

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }

    return subscription;
  }

  async update(
    id: string,
    dto: UpdateSubscriptionDto,
  ): Promise<SubscriptionDocument> {
    await this.findById(id);

    const updateData: Record<string, unknown> = { ...dto };
    if (dto.expiresAt) {
      updateData.expiresAt = new Date(dto.expiresAt);
    }

    const updated = await this.subscriptionModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }

    return updated;
  }

  async cancel(id: string): Promise<SubscriptionDocument> {
    return this.update(id, { status: SubscriptionStatus.INACTIVE });
  }

  async enforceClinicProfessionalLimit(
    clinicId: string,
    currentCount: number,
  ): Promise<void> {
    const subscription = await this.findByClinicId(clinicId);
    const plan = subscription?.plan ?? SubscriptionPlan.FREE;
    const limit = PLAN_PROFESSIONAL_LIMITS[plan];

    if (limit !== -1 && currentCount >= limit) {
      throw new ForbiddenException(
        `Professional limit reached for current subscription plan (${plan}): max ${limit}`,
      );
    }
  }
}

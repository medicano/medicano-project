import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ClinicsModule } from '../clinics/clinics.module';

import {
  Subscription,
  SubscriptionSchema,
} from './schemas/subscription.schema';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
    ClinicsModule,
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}

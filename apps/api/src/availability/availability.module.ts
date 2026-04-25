import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import {
  ProfessionalAvailability,
  ProfessionalAvailabilitySchema,
} from './schemas/professional-availability.schema';
import { ProfessionalsModule } from '../professionals/professionals.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: ProfessionalAvailability.name,
        schema: ProfessionalAvailabilitySchema,
      },
    ]),
    ProfessionalsModule,
  ],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}

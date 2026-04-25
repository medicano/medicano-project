import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Clinic, ClinicSchema } from '../clinics/schemas/clinic.schema';
import { Professional, ProfessionalSchema } from '../professionals/schemas/professional.schema';

import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Clinic.name, schema: ClinicSchema },
      { name: Professional.name, schema: ProfessionalSchema },
    ]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}

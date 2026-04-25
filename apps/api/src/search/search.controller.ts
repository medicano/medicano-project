import { Controller, Get, Param, Query } from '@nestjs/common';

import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(@Query() query: SearchQueryDto) {
    return this.searchService.search(query);
  }

  @Get('clinics/:id')
  findClinicById(@Param('id', ParseMongoIdPipe) id: string) {
    return this.searchService.findClinicById(id);
  }

  @Get('professionals/:id')
  findProfessionalById(@Param('id', ParseMongoIdPipe) id: string) {
    return this.searchService.findProfessionalById(id);
  }
}

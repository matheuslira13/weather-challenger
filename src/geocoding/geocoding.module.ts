import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { GeocodingResolver } from './geocoding.resolver';
import { GeocodingService } from './geocoding.service';

@Module({
  imports: [HttpModule],
  providers: [GeocodingService, GeocodingResolver],
})
export class GeocodingModule {}

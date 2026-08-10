import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { GeocodingResolver } from './geocoding.resolver';
import { GeocodingService } from './geocoding.service';
import { LoggerModule } from '../common/modules/log/logger.module';

@Module({
  imports: [HttpModule, LoggerModule],
  providers: [GeocodingService, GeocodingResolver],
  exports: [GeocodingService],
})
export class GeocodingModule {}

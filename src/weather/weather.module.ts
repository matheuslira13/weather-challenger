import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { WeatherService } from './weather.service';
import { WeatherResolver } from './weather.resolver';
import { LoggerModule } from '../common/modules/log/logger.module';
import { GeocodingModule } from '../geocoding/geocoding.module';
import { RedisModule } from '../redis/redis.module';
import { ScoringModule } from '../scoring/scoring.module';

@Module({
  imports: [
    HttpModule,
    LoggerModule,
    GeocodingModule,
    RedisModule,
    ScoringModule,
  ],
  providers: [WeatherService, WeatherResolver],
  exports: [WeatherService],
})
export class WeatherModule {}

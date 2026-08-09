import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { GeocodingResolver } from './geocoding.resolver';
import { GeocodingService } from './geocoding.service';
import { WeatherModule } from '../weather/weather.module';

@Module({
  imports: [HttpModule,WeatherModule],
  providers: [GeocodingService, GeocodingResolver],
})
export class GeocodingModule {}

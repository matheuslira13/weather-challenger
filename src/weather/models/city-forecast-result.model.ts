import { Field, ObjectType } from '@nestjs/graphql';
import { GeocodingResult } from '../../geocoding/models/geocoding-result.model';
import { WeatherResult } from './daily-forecast-result.model';

@ObjectType()
export class CityForecastResult {
  @Field(() => GeocodingResult)
  location: GeocodingResult;

  @Field(() => [WeatherResult])
  forecast: WeatherResult[];
}

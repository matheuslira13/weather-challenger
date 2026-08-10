import { Args, Query, Resolver } from '@nestjs/graphql';
import { WeatherInput } from './dto/wather.input';
import { WeatherResult } from './models/daily-forecast-result.model';
import { CityForecastResult } from './models/city-forecast-result.model';
import { ZodValidationPipe } from '../common/validations/validations.pipe';
import { createWeatherSchema } from '../common/validations/schema/weather.schema';
import { createGeocodingSchema } from '../common/validations/schema/geocoding.schema';
import { WeatherService } from './weather.service';
import { GeocodeCityInput } from '../geocoding/dto/geocode-city.input';

@Resolver(() => WeatherResult)
export class WeatherResolver {
  constructor(private readonly weatherService: WeatherService) {}

  @Query(() => [WeatherResult], { name: 'weather' })
  getDailyForecast(
    @Args('input', new ZodValidationPipe(createWeatherSchema))
    input: WeatherInput,
  ): Promise<WeatherResult[]> {
    return this.weatherService.getDailyForecast(
      input.latitude,
      input.longitude,
      input.timezone,
    );
  }

  @Query(() => CityForecastResult, { name: 'cityForecast' })
  getCityForecast(
    @Args('input', new ZodValidationPipe(createGeocodingSchema))
    input: GeocodeCityInput,
  ): Promise<CityForecastResult> {
    return this.weatherService.getCityForecast(input);
  }
}

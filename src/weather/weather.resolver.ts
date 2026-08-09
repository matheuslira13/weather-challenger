  import { Args, Query, Resolver } from '@nestjs/graphql';
  import { WeatherInput } from './dto/wather.input'
  import { WeatherResult } from './models/daily-forecast-result.model';
  import { ZodValidationPipe } from '../common/validations/validations.pipe';
  import { createWeatherSchema } from '../common/validations/schema/weather.schema';
  import { WeatherService } from './weather.service';

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
        input.timezone
      );
    }
  }

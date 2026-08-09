import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { WeatherResult } from './models/daily-forecast-result.model';

const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

const DAILY_VARIABLES = [
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_probability_max',
  'snowfall_sum',
  'wind_speed_10m_max',
  'wind_direction_10m_dominant',
  'weather_code',
].join(',');

interface OpenMeteoDailyForecast {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_probability_max: number[];
  snowfall_sum: number[];
  wind_speed_10m_max: number[];
  wind_direction_10m_dominant: number[];
  weather_code: number[];
}

interface OpenMeteoForecastResponse {
  daily: OpenMeteoDailyForecast;
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  constructor(private readonly httpService: HttpService) {}

  getDailyForecast(
    latitude: number,
    longitude: number,
    timezone: string,
  ): Promise<WeatherResult[]> {
    return firstValueFrom(
      this.httpService
        .get<OpenMeteoForecastResponse>(OPEN_METEO_FORECAST_URL, {
          params: {
            latitude,
            longitude,
            daily: DAILY_VARIABLES,
            timezone,
            forecast_days: 7,
          },
        })
        .pipe(
          tap((response) => {
            this.logger.debug(`weatherService`);
            this.logger.debug(
              `Open-Meteo forecast response for (${latitude}, ${longitude}, ${timezone}): status ${response.status}`,
            );
          }),
          catchError((error: Error) => {
            (this.logger.error('watherService'),
              this.logger.error(
                `Open-Meteo forecast request failed for (${latitude}, ${longitude}, ${timezone}): ${error.message}`,
                error.stack,
              ));
            throw new InternalServerErrorException(
              'Failed to reach the weather forecast service',
            );
          }),
          map((response) => {
            const { daily } = response.data;
            return daily.time.map((date, index) => ({
              date,
              temperatureMax: daily.temperature_2m_max[index],
              temperatureMin: daily.temperature_2m_min[index],
              precipitationProbabilityMax:
                daily.precipitation_probability_max[index],
              snowfallSum: daily.snowfall_sum[index],
              windSpeedMax: daily.wind_speed_10m_max[index],
              windDirectionDominant: daily.wind_direction_10m_dominant[index],
              weatherCode: daily.weather_code[index],
            }));
          }),
        ),
    );
  }
}

import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { firstValueFrom, from, Observable } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { WeatherResult } from './models/daily-forecast-result.model';
import { CityForecastResult } from './models/city-forecast-result.model';
import { LoggerService } from '../common/modules/log/logger.service';
import { GeocodingService } from '../geocoding/geocoding.service';
import { GeocodeCityInput } from '../geocoding/dto/geocode-city.input';

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
  constructor(
    private readonly httpService: HttpService,
    private readonly logger: LoggerService,
    private readonly geocodingService: GeocodingService,
  ) {}

  getDailyForecast(
    latitude: number,
    longitude: number,
    timezone: string,
  ): Promise<WeatherResult[]> {
    return firstValueFrom(this.fetchForecast$(latitude, longitude, timezone));
  }

  getCityForecast(input: GeocodeCityInput): Promise<CityForecastResult> {
    const { city, countryCode } = input;

    return firstValueFrom(
      from(this.geocodingService.geocodeCity(input)).pipe(
        tap((location) =>
          this.logger.log(
            `Geocoding resolved "${city}, ${countryCode}" to (${location.latitude}, ${location.longitude})`,
            WeatherService.name,
          ),
        ),
        catchError((error: Error) => {
          this.logger.error(
            `Geocoding leg failed for "${city}, ${countryCode}": ${error.message}`,
            error.stack,
            WeatherService.name,
          );
          throw error;
        }),
        switchMap((location) =>
          this.fetchForecast$(
            location.latitude,
            location.longitude,
            location.timezone,
          ).pipe(
            map((forecast): CityForecastResult => ({ location, forecast })),
          ),
        ),
      ),
    );
  }

  private fetchForecast$(
    latitude: number,
    longitude: number,
    timezone: string,
  ): Observable<WeatherResult[]> {
    return this.httpService
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
        tap((response) =>
          this.logger.log(
            `Open-Meteo forecast response for (${latitude}, ${longitude}, ${timezone}): status ${response.status}`,
            WeatherService.name,
          ),
        ),
        catchError((error: Error) => {
          this.logger.error(
            `Open-Meteo forecast request failed for (${latitude}, ${longitude}, ${timezone}): ${error.message}`,
            error.stack,
            WeatherService.name,
          );
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
      );
  }
}

import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { GeocodeCityInput } from './dto/geocode-city.input';
import { GeocodingResult } from './models/geocoding-result.model';
import { LoggerService } from '../common/modules/log/logger.service';

const OPEN_METEO_GEOCODING_URL =
  'https://geocoding-api.open-meteo.com/v1/search';

interface OpenMeteoGeocodingResult {
  latitude: number;
  longitude: number;
  timezone: string;
  admin1?: string;
  admin2?: string;
}

interface OpenMeteoGeocodingResponse {
  results?: OpenMeteoGeocodingResult[];
}

@Injectable()
export class GeocodingService {
  constructor(
    private readonly httpService: HttpService,
    private readonly logger: LoggerService,
  ) {}

  geocodeCity(input: GeocodeCityInput): Promise<GeocodingResult> {
    const { city, countryCode } = input;

    return firstValueFrom(
      this.httpService
        .get<OpenMeteoGeocodingResponse>(OPEN_METEO_GEOCODING_URL, {
          params: {
            name: city,
            count: 1,
            language: 'en',
            format: 'json',
            countryCode,
          },
        })
        .pipe(
          tap((response) =>
            this.logger.log(
              `Open-Meteo geocoding response for "${city}, ${countryCode}": ${JSON.stringify(response.data)}`,
              GeocodingService.name,
            ),
          ),
          catchError((error: Error) => {
            this.logger.error(
              `Open-Meteo geocoding request failed for "${city}, ${countryCode}": ${error.message}`,
              error.stack,
              GeocodingService.name,
            );
            throw new InternalServerErrorException(
              'Failed to reach the geocoding service',
            );
          }),
          map((response) => response.data.results),
          tap((results) => {
            if (!results || results.length === 0) {
              this.logger.warn(
                `No geocoding results found for "${city}, ${countryCode}"`,
                GeocodingService.name,
              );
            }
          }),
          map((results) => {
            if (!results || results.length === 0) {
              throw new NotFoundException(
                `No location found for "${city}, ${countryCode}"`,
              );
            }
            return results[0];
          }),
        ),
    );
  }
}

import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { GeocodeCityInput } from './dto/geocode-city.input';
import { GeocodingResult } from './models/geocoding-result.model';

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
  private readonly logger = new Logger(GeocodingService.name);

  constructor(private readonly httpService: HttpService) {}

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
            this.logger.debug(
              `Open-Meteo geocoding response for "${city}, ${countryCode}": ${JSON.stringify(response.data)}`,
            ),
          ),
          catchError((error: Error) => {
            this.logger.error(
              `Open-Meteo geocoding request failed for "${city}, ${countryCode}": ${error.message}`,
              error.stack,
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

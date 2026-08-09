import { HttpService } from '@nestjs/axios';
import { InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';
import { WeatherService } from './weather.service';

describe('WeatherService', () => {
  let service: WeatherService;
  let httpService: { get: jest.Mock };

  beforeEach(async () => {
    httpService = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeatherService,
        { provide: HttpService, useValue: httpService },
      ],
    }).compile();

    service = module.get<WeatherService>(WeatherService);
  });

  const mockResponse = (data: unknown): AxiosResponse =>
    ({
      data,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as AxiosResponse['config'],
    }) as AxiosResponse;

  it('maps the daily forecast into 7 DailyForecast entries', async () => {
    httpService.get.mockReturnValue(
      of(
        mockResponse({
          daily: {
            time: [
              '2026-08-09',
              '2026-08-10',
              '2026-08-11',
              '2026-08-12',
              '2026-08-13',
              '2026-08-14',
              '2026-08-15',
            ],
            temperature_2m_max: [25.0, 17.7, 16.6, 22.8, 29.6, 30.9, 25.9],
            temperature_2m_min: [15.7, 13.5, 13.0, 13.4, 14.7, 17.0, 17.5],
            precipitation_probability_max: [24, 12, 4, 4, 4, 20, 14],
            snowfall_sum: [0, 0, 0, 0, 0, 0, 0],
            wind_speed_10m_max: [12.8, 14.6, 13.3, 10.3, 14.7, 16.8, 8.7],
            wind_direction_10m_dominant: [158, 143, 132, 105, 333, 285, 134],
            weather_code: [51, 3, 51, 3, 3, 2, 3],
          },
        }),
      ),
    );

    const result = await service.getDailyForecast(
      -23.5475,
      -46.63611,
      'America/Sao_Paulo',
    );

    expect(result).toHaveLength(7);
    expect(result[0]).toEqual({
      date: '2026-08-09',
      temperatureMax: 25.0,
      temperatureMin: 15.7,
      precipitationProbabilityMax: 24,
      snowfallSum: 0,
      windSpeedMax: 12.8,
      windDirectionDominant: 158,
      weatherCode: 51,
    });
    expect(httpService.get).toHaveBeenCalledWith(
      'https://api.open-meteo.com/v1/forecast',
      {
        params: {
          latitude: -23.5475,
          longitude: -46.63611,
          daily:
            'temperature_2m_max,temperature_2m_min,precipitation_probability_max,snowfall_sum,wind_speed_10m_max,wind_direction_10m_dominant,weather_code',
          timezone: 'America/Sao_Paulo',
          forecast_days: 7,
        },
      },
    );
  });

  it('throws InternalServerErrorException when the request fails', async () => {
    httpService.get.mockReturnValue(
      throwError(() => new Error('network error')),
    );

    await expect(
      service.getDailyForecast(-23.5475, -46.63611, 'America/Sao_Paulo'),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});

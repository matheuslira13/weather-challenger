import { HttpService } from '@nestjs/axios';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';
import { GeocodingService } from './geocoding.service';

describe('GeocodingService', () => {
  let service: GeocodingService;
  let httpService: { get: jest.Mock };

  beforeEach(async () => {
    httpService = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeocodingService,
        { provide: HttpService, useValue: httpService },
      ],
    }).compile();

    service = module.get<GeocodingService>(GeocodingService);
  });

  const mockResponse = (data: unknown): AxiosResponse =>
    ({
      data,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as AxiosResponse['config'],
    }) as AxiosResponse;

  it('returns the first geocoding result', async () => {
    httpService.get.mockReturnValue(
      of(
        mockResponse({
          results: [
            {
              latitude: -23.55,
              longitude: -46.63,
              timezone: 'America/Sao_Paulo',
              admin1: 'São Paulo',
              admin2: 'São Paulo',
            },
          ],
        }),
      ),
    );

    const result = await service.geocodeCity({
      city: 'São Paulo',
      countryCode: 'BR',
    });

    expect(result).toEqual({
      latitude: -23.55,
      longitude: -46.63,
      timezone: 'America/Sao_Paulo',
      admin1: 'São Paulo',
      admin2: 'São Paulo',
    });
    expect(httpService.get).toHaveBeenCalledWith(
      'https://geocoding-api.open-meteo.com/v1/search',
      {
        params: {
          name: 'São Paulo',
          count: 1,
          language: 'en',
          format: 'json',
          countryCode: 'BR',
        },
      },
    );
  });

  it('throws NotFoundException when results are empty', async () => {
    httpService.get.mockReturnValue(of(mockResponse({ results: [] })));

    await expect(
      service.geocodeCity({ city: 'Nowhereland', countryCode: 'XX' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when results are missing', async () => {
    httpService.get.mockReturnValue(of(mockResponse({})));

    await expect(
      service.geocodeCity({ city: 'Nowhereland', countryCode: 'XX' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws InternalServerErrorException when the request fails', async () => {
    httpService.get.mockReturnValue(
      throwError(() => new Error('network error')),
    );

    await expect(
      service.geocodeCity({ city: 'São Paulo', countryCode: 'BR' }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { GeocodingResolver } from './geocoding.resolver';
import { GeocodingService } from './geocoding.service';

describe('GeocodingResolver', () => {
  let resolver: GeocodingResolver;
  let geocodingService: { geocodeCity: jest.Mock };

  beforeEach(async () => {
    geocodingService = { geocodeCity: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeocodingResolver,
        { provide: GeocodingService, useValue: geocodingService },
      ],
    }).compile();

    resolver = module.get<GeocodingResolver>(GeocodingResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('delegates to GeocodingService.geocodeCity', async () => {
    const expected = {
      latitude: -23.55,
      longitude: -46.63,
      timezone: 'America/Sao_Paulo',
      admin1: 'São Paulo',
      admin2: 'São Paulo',
    };
    geocodingService.geocodeCity.mockResolvedValue(expected);

    const input = { city: 'São Paulo', countryCode: 'BR' };
    const result = await resolver.geocodeCity(input);

    expect(geocodingService.geocodeCity).toHaveBeenCalledWith(input);
    expect(result).toBe(expected);
  });
});

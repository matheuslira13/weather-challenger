import { Test, TestingModule } from '@nestjs/testing';
import { WeatherResolver } from './weather.resolver';
import { WeatherService } from './weather.service';

describe('WeatherResolver', () => {
  let resolver: WeatherResolver;
  let weatherService: {
    getDailyForecast: jest.Mock;
    getCityForecast: jest.Mock;
  };

  beforeEach(async () => {
    weatherService = {
      getDailyForecast: jest.fn(),
      getCityForecast: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeatherResolver,
        { provide: WeatherService, useValue: weatherService },
      ],
    }).compile();

    resolver = module.get<WeatherResolver>(WeatherResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('delegates to WeatherService.getDailyForecast', async () => {
    const expected = [
      {
        date: '2026-08-09',
        temperatureMax: 25.0,
        temperatureMin: 15.7,
        precipitationProbabilityMax: 24,
        snowfallSum: 0,
        windSpeedMax: 12.8,
        windDirectionDominant: 158,
        weatherCode: 51,
      },
    ];
    weatherService.getDailyForecast.mockResolvedValue(expected);

    const input = {
      latitude: -23.5475,
      longitude: -46.63611,
      timezone: 'America/Sao_Paulo',
    };
    const result = await resolver.getDailyForecast(input);

    expect(weatherService.getDailyForecast).toHaveBeenCalledWith(
      input.latitude,
      input.longitude,
      input.timezone,
    );
    expect(result).toBe(expected);
  });

  it('delegates to WeatherService.getCityForecast', async () => {
    const expected = {
      location: {
        latitude: -23.55,
        longitude: -46.63,
        timezone: 'America/Sao_Paulo',
      },
      forecast: [],
    };
    weatherService.getCityForecast.mockResolvedValue(expected);

    const input = { city: 'São Paulo', countryCode: 'BR' };
    const result = await resolver.getCityForecast(input);

    expect(weatherService.getCityForecast).toHaveBeenCalledWith(input);
    expect(result).toBe(expected);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { IndoorSightseeingScoreService } from './indoor-sightseeing-score.service';
import { OutdoorSightseeingScoreService } from './outdoor-sightseeing.service';
import { WeatherResult } from '../weather/models/daily-forecast-result.model';

const day: WeatherResult = {
  date: '2026-08-10',
  temperatureMax: 23,
  temperatureMin: 15,
  precipitationProbabilityMax: 0,
  snowfallSum: 0,
  windSpeedMax: 10,
  windDirectionDominant: 180,
  weatherCode: 1,
  activities: {
    skiing: 0,
    surfing: 0,
    outdoorSightseeing: 0,
    indoorSightseeing: 0,
  },
};

describe('IndoorSightseeingScoreService', () => {
  let service: IndoorSightseeingScoreService;
  let outdoorSightseeingScoreService: { calculateScore: jest.Mock };

  beforeEach(async () => {
    // The outdoor formula itself already has full coverage in
    // outdoor-sightseeing.service.spec.ts — mocking it here isolates this
    // service to what it actually owns: the 100 - outdoorScore inversion.
    outdoorSightseeingScoreService = { calculateScore: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IndoorSightseeingScoreService,
        {
          provide: OutdoorSightseeingScoreService,
          useValue: outdoorSightseeingScoreService,
        },
      ],
    }).compile();

    service = module.get<IndoorSightseeingScoreService>(
      IndoorSightseeingScoreService,
    );
  });

  it.each([
    [0, 100],
    [100, 0],
    [30, 70],
    [75, 25],
  ])(
    'derives the indoor score as the exact inverse of the outdoor score (outdoor=%i -> indoor=%i)',
    (outdoorScore, expectedIndoorScore) => {
      outdoorSightseeingScoreService.calculateScore.mockReturnValue(
        outdoorScore,
      );

      const result = service.calculateScore(day);

      expect(result).toBe(expectedIndoorScore);
      expect(
        outdoorSightseeingScoreService.calculateScore,
      ).toHaveBeenCalledWith(day);
    },
  );
});

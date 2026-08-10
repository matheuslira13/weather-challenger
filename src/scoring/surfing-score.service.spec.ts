import { SurfingScoreService } from './surfing-score.service';
import { WeatherResult } from '../weather/models/daily-forecast-result.model';

const buildDay = (overrides: Partial<WeatherResult> = {}): WeatherResult => ({
  date: '2026-08-10',
  temperatureMax: 26,
  temperatureMin: 20,
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
  ...overrides,
});

describe('SurfingScoreService', () => {
  let service: SurfingScoreService;

  beforeEach(() => {
    service = new SurfingScoreService();
  });

  it('scores a light-wind day at 100', () => {
    const score = service.calculateScore(buildDay({ windSpeedMax: 10 }));

    expect(score).toBe(100);
  });

  it('floors an extreme-wind day at 10, never 0 — wind penalty caps at 90', () => {
    // Reflects the low confidence of a wind-only swell proxy: since the
    // penalty caps at 90 and there's no other factor, this formula can
    // never actually reach a score of 0.
    const score = service.calculateScore(buildDay({ windSpeedMax: 500 }));

    expect(score).toBe(10);
  });

  describe('wind neutral threshold boundary (25km/h) and penalty cap', () => {
    it.each([
      [25, 100],
      [26, 98],
      [200, 10],
    ])('windSpeedMax=%i km/h -> score %i', (windSpeedMax, expectedScore) => {
      const score = service.calculateScore(buildDay({ windSpeedMax }));

      expect(score).toBe(expectedScore);
    });
  });
});

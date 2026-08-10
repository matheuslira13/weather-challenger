import { SkiingScoreService } from './skiing-score.service';
import { WeatherResult } from '../weather/models/daily-forecast-result.model';

const buildDay = (overrides: Partial<WeatherResult> = {}): WeatherResult => ({
  date: '2026-01-15',
  temperatureMax: -5,
  temperatureMin: -10,
  precipitationProbabilityMax: 0,
  snowfallSum: 20,
  windSpeedMax: 5,
  windDirectionDominant: 180,
  weatherCode: 71,
  activities: {
    skiing: 0,
    surfing: 0,
    outdoorSightseeing: 0,
    indoorSightseeing: 0,
  },
  ...overrides,
});

describe('SkiingScoreService', () => {
  let service: SkiingScoreService;

  beforeEach(() => {
    service = new SkiingScoreService();
  });

  it('scores a cold, calm, snowy day at 100', () => {
    const score = service.calculateScore(buildDay());

    expect(score).toBe(100);
  });

  it('scores a warm, windy but still snowy day at 20 (not 0 — see hard cutoff tests)', () => {
    const score = service.calculateScore(
      buildDay({ temperatureMax: 40, windSpeedMax: 100 }),
    );

    // Temp penalty caps at 50 + wind penalty caps at 30 = 80 max penalty,
    // so a snowy day can never be scored 0 — 0 is reserved exclusively for
    // "no snow" (see the hard-cutoff tests below).
    expect(score).toBe(20);
  });

  describe('hard snowfall cutoff', () => {
    it('returns exactly 0 when there is no snowfall, even with otherwise-perfect conditions', () => {
      const score = service.calculateScore(
        buildDay({ snowfallSum: 0, temperatureMax: -10, windSpeedMax: 0 }),
      );

      expect(score).toBe(0);
    });

    it('returns exactly 0 when snowfall is just below the minimum threshold (0.99cm)', () => {
      const score = service.calculateScore(buildDay({ snowfallSum: 0.99 }));

      expect(score).toBe(0);
    });

    it('does not apply the cutoff exactly at the minimum snowfall threshold (1cm)', () => {
      const score = service.calculateScore(buildDay({ snowfallSum: 1 }));

      expect(score).toBe(100);
    });
  });

  describe('penalty caps', () => {
    it.each([
      ['temperature penalty caps at 50', { temperatureMax: 50 }, 50],
      ['wind penalty caps at 30', { windSpeedMax: 100 }, 70],
    ])('%s', (_description, overrides, expectedScore) => {
      const score = service.calculateScore(buildDay(overrides));

      expect(score).toBe(expectedScore);
    });
  });

  describe('temperature threshold boundary (2°C)', () => {
    it.each([
      [2, 100],
      [3, 96],
    ])('temperatureMax=%i°C -> score %i', (temperatureMax, expectedScore) => {
      const score = service.calculateScore(buildDay({ temperatureMax }));

      expect(score).toBe(expectedScore);
    });
  });

  describe('wind threshold boundary (30km/h)', () => {
    it.each([
      [30, 100],
      [31, 98],
    ])('windSpeedMax=%i km/h -> score %i', (windSpeedMax, expectedScore) => {
      const score = service.calculateScore(buildDay({ windSpeedMax }));

      expect(score).toBe(expectedScore);
    });
  });
});

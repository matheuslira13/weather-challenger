import { OutdoorSightseeingScoreService } from './outdoor-sightseeing.service';
import { WeatherResult } from '../weather/models/daily-forecast-result.model';

const buildDay = (overrides: Partial<WeatherResult> = {}): WeatherResult => ({
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
  ...overrides,
});

describe('OutdoorSightseeingScoreService', () => {
  let service: OutdoorSightseeingScoreService;

  beforeEach(() => {
    service = new OutdoorSightseeingScoreService();
  });

  it('scores a dry, comfortable, calm day at 100', () => {
    const score = service.calculateScore(buildDay());

    expect(score).toBe(100);
  });

  it('scores a rainy, extreme-temperature, windy day at 0', () => {
    const score = service.calculateScore(
      buildDay({
        precipitationProbabilityMax: 100,
        temperatureMax: 45,
        windSpeedMax: 100,
      }),
    );

    expect(score).toBe(0);
  });

  describe('penalty caps', () => {
    it.each([
      // Rain probability is domain-bounded to 0-100, so 100 * 0.6 = 60
      // already equals RAIN_PENALTY_CAP — an out-of-domain value is used
      // here purely to exercise the Math.min cap itself.
      ['rain penalty caps at 60', { precipitationProbabilityMax: 150 }, 40],
      ['heat penalty caps at 25', { temperatureMax: 60 }, 75],
      ['cold penalty caps at 25', { temperatureMax: -20 }, 75],
      ['wind penalty caps at 15', { windSpeedMax: 200 }, 85],
    ])('%s', (_description, overrides, expectedScore) => {
      const score = service.calculateScore(buildDay(overrides));

      expect(score).toBe(expectedScore);
    });
  });

  describe('comfort temperature range boundaries (18-28°C)', () => {
    it.each([
      [18, 100],
      [28, 100],
      [17, 97],
      [29, 97],
    ])('temperatureMax=%i°C -> score %i', (temperatureMax, expectedScore) => {
      const score = service.calculateScore(buildDay({ temperatureMax }));

      expect(score).toBe(expectedScore);
    });
  });

  describe('wind threshold boundary (20km/h)', () => {
    it.each([
      [20, 100],
      [21, 99],
    ])('windSpeedMax=%i km/h -> score %i', (windSpeedMax, expectedScore) => {
      const score = service.calculateScore(buildDay({ windSpeedMax }));

      expect(score).toBe(expectedScore);
    });
  });
});

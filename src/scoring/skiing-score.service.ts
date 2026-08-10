import { Injectable } from '@nestjs/common';
import { WeatherResult } from '../weather/models/daily-forecast-result.model';

const MIN_SNOWFALL_CM = 1;

const TEMP_THRESHOLD_C = 2;
const TEMP_WEIGHT = 4;
const TEMP_PENALTY_CAP = 50;

const WIND_THRESHOLD_KMH = 30;
const WIND_WEIGHT = 2;
const WIND_PENALTY_CAP = 30;

@Injectable()
export class SkiingScoreService {
  calculateScore(day: WeatherResult): number {
    if (day.snowfallSum < MIN_SNOWFALL_CM) {
      return 0;
    }

    const tempPenalty = this.calculateTemperaturePenalty(day.temperatureMax);
    const windPenalty = this.calculateWindPenalty(day.windSpeedMax);

    const score = 100 - tempPenalty - windPenalty;

    return Math.max(score, 0);
  }

  private calculateTemperaturePenalty(temperatureMax: number): number {
    if (temperatureMax <= TEMP_THRESHOLD_C) {
      return 0;
    }

    const penalty = (temperatureMax - TEMP_THRESHOLD_C) * TEMP_WEIGHT;
    return Math.min(penalty, TEMP_PENALTY_CAP);
  }

  private calculateWindPenalty(windSpeedMax: number): number {
    if (windSpeedMax <= WIND_THRESHOLD_KMH) {
      return 0;
    }

    const penalty = (windSpeedMax - WIND_THRESHOLD_KMH) * WIND_WEIGHT;
    return Math.min(penalty, WIND_PENALTY_CAP);
  }
}

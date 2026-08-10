import { Injectable } from '@nestjs/common';
import { WeatherResult } from '../weather/models/daily-forecast-result.model';

const WIND_NEUTRAL_MAX_KMH = 25;
const WIND_WEIGHT = 2;
const WIND_PENALTY_CAP = 90;

@Injectable()
export class SurfingScoreService {
  calculateScore(day: WeatherResult): number {
    const windPenalty = this.calculateWindPenalty(day.windSpeedMax);
    const score = 100 - windPenalty;

    return Math.max(score, 0);
  }

  private calculateWindPenalty(windSpeedMax: number): number {
    if (windSpeedMax <= WIND_NEUTRAL_MAX_KMH) {
      return 0;
    }

    const penalty = (windSpeedMax - WIND_NEUTRAL_MAX_KMH) * WIND_WEIGHT;
    return Math.min(penalty, WIND_PENALTY_CAP);
  }
}

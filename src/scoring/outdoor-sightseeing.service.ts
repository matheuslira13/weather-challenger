import { Injectable } from '@nestjs/common';
import { WeatherResult } from '../weather/models/daily-forecast-result.model';

const RAIN_WEIGHT = 0.6;
const RAIN_PENALTY_CAP = 60;

const COMFORT_TEMP_MIN = 18;
const COMFORT_TEMP_MAX = 28;
const TEMP_WEIGHT = 3;
const TEMP_PENALTY_CAP = 25;

const WIND_THRESHOLD_KMH = 20;
const WIND_WEIGHT = 1;
const WIND_PENALTY_CAP = 15;

@Injectable()
export class OutdoorSightseeingScoreService {
  calculateScore(day: WeatherResult): number {
    const rainPenalty = this.calculateRainPenalty(
      day.precipitationProbabilityMax,
    );
    const tempPenalty = this.calculateTemperaturePenalty(day.temperatureMax);
    const windPenalty = this.calculateWindPenalty(day.windSpeedMax);

    const score = 100 - rainPenalty - tempPenalty - windPenalty;

    return Math.max(score, 0);
  }

  private calculateRainPenalty(precipitationProbabilityMax: number): number {
    const penalty = precipitationProbabilityMax * RAIN_WEIGHT;
    return Math.min(penalty, RAIN_PENALTY_CAP);
  }

  private calculateTemperaturePenalty(temperatureMax: number): number {
    let penalty = 0;

    if (temperatureMax > COMFORT_TEMP_MAX) {
      penalty = (temperatureMax - COMFORT_TEMP_MAX) * TEMP_WEIGHT;
    } else if (temperatureMax < COMFORT_TEMP_MIN) {
      penalty = (COMFORT_TEMP_MIN - temperatureMax) * TEMP_WEIGHT;
    }

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

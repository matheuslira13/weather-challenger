import { Injectable } from '@nestjs/common';
import { WeatherResult } from '../weather/models/daily-forecast-result.model';
import { OutdoorSightseeingScoreService } from './outdoor-sightseeing.service';

@Injectable()
export class IndoorSightseeingScoreService {
  constructor(
    private readonly outdoorSightseeingScoreService: OutdoorSightseeingScoreService,
  ) {}

  calculateScore(day: WeatherResult): number {
    const outdoorScore =
      this.outdoorSightseeingScoreService.calculateScore(day);
    return 100 - outdoorScore;
  }
}

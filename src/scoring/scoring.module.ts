import { Module } from '@nestjs/common';
import { OutdoorSightseeingScoreService } from './outdoor-sightseeing.service';
import { SkiingScoreService } from './skiing-score.service';
import { SurfingScoreService } from './surfing-score.service';
import { IndoorSightseeingScoreService } from './indoor-sightseeing-score.service';

@Module({
  providers: [
    OutdoorSightseeingScoreService,
    SkiingScoreService,
    SurfingScoreService,
    IndoorSightseeingScoreService,
  ],
  exports: [
    OutdoorSightseeingScoreService,
    SkiingScoreService,
    SurfingScoreService,
    IndoorSightseeingScoreService,
  ],
})
export class ScoringModule {}

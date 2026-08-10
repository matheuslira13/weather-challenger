import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { ActivityScores } from './activity-scores.model';

@ObjectType()
export class WeatherResult {
  @Field(() => String)
  date: string;

  @Field(() => Float)
  temperatureMax: number;

  @Field(() => Float)
  temperatureMin: number;

  @Field(() => Int)
  precipitationProbabilityMax: number;

  @Field(() => Float)
  snowfallSum: number;

  @Field(() => Float)
  windSpeedMax: number;

  @Field(() => Float)
  windDirectionDominant: number;

  @Field(() => Int)
  weatherCode: number;

  @Field(() => ActivityScores)
  activities: ActivityScores;
}

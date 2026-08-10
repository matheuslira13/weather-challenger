import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ActivityScores {
  @Field(() => Float)
  skiing: number;

  @Field(() => Float)
  surfing: number;

  @Field(() => Float)
  outdoorSightseeing: number;

  @Field(() => Float)
  indoorSightseeing: number;
}

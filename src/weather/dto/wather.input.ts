import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class WeatherInput {
  @Field()
  latitude: number;

  @Field()
  longitude: number;

  @Field()
  timezone: string;
}
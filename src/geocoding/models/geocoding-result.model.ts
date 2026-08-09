import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class GeocodingResult {
  @Field(() => Float)
  latitude: number;

  @Field(() => Float)
  longitude: number;

  @Field(() => String)
  timezone: string;

  @Field(() => String, { nullable: true })
  admin1?: string;

  @Field(() => String, { nullable: true })
  admin2?: string;
}

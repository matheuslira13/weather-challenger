import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class GeocodeCityInput {
  @Field(() => String)
  city: string;

  @Field(() => String)
  countryCode: string;
}

import { Args, Query, Resolver } from '@nestjs/graphql';
import { GeocodeCityInput } from './dto/geocode-city.input';
import { GeocodingService } from './geocoding.service';
import { GeocodingResult } from './models/geocoding-result.model';
import { ZodValidationPipe } from './validations/validations.pipe';
import { createGeocodingSchema } from './validations/geocoding.schema';

@Resolver(() => GeocodingResult)
export class GeocodingResolver {
  constructor(private readonly geocodingService: GeocodingService) {}

  @Query(() => GeocodingResult, { name: 'geocodeCity' })
  geocodeCity(
    @Args('input', new ZodValidationPipe(createGeocodingSchema))
    input: GeocodeCityInput,
  ): Promise<GeocodingResult> {
    return this.geocodingService.geocodeCity(input);
  }
}

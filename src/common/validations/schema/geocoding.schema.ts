import { z } from 'zod';

export const createGeocodingSchema = z.object({
  city: z.string().min(2).max(100),
  countryCode: z.string().min(2).max(3),
});

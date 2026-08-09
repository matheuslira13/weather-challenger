import { Module } from '@nestjs/common';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { AppController } from './app.resolver';
import { AppService } from './app.service';
import { GraphQLModule } from '@nestjs/graphql';
import { WeatherResolver } from './weather/weather.resolver';
import { WeatherModule } from './weather/weather.module';
import { GeocodingModule } from './geocoding/geocoding.module';
import { join } from 'path';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src', 'schema.gql'),
    }),
    GeocodingModule,
    WeatherModule,
  ],
  controllers: [AppController],
  providers: [AppService, WeatherResolver],
})
export class AppModule {}

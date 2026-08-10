import {
  CallHandler,
  NestInterceptor,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { from, Observable, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { RedisService } from '../../redis/redis.service';
import { LoggerService } from '../modules/log/logger.service';

const CACHE_TTL_SECONDS = 60 * 60 * 3;

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const gqlContext = GqlExecutionContext.create(context);
    const args = gqlContext.getArgs();
    const cacheKey = this.generateCacheKey(args);

    const cachedValue$ = from(this.redisService.get(cacheKey)).pipe(
      map((cached): unknown =>
        cached ? (JSON.parse(cached) as unknown) : null,
      ),
      catchError((error: Error) => {
        this.logger.error(
          `Cache read failed for "${cacheKey}": ${error.message}`,
          error.stack,
          CacheInterceptor.name,
        );
        return of(null);
      }),
    );

    return cachedValue$.pipe(
      switchMap((cached) => {
        if (cached) {
          console.info(`cache hit: ${cacheKey}`);
          return of(cached);
        }

        console.log(`cache miss: ${cacheKey}`);
        return next.handle().pipe(
          tap((response) => {
            this.redisService.set(
              cacheKey,
              JSON.stringify(response),
              CACHE_TTL_SECONDS,
            );
          }),
        );
      }),
    );
  }
  private generateCacheKey(args: any): string {
    const { city, countryCode } = args.input;
    return `forecast:${countryCode.toLowerCase()}:${city.toLowerCase().replace(/\s+/g, '-')}`;
  }
}

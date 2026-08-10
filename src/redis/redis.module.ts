import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { CacheInterceptor } from '../common/cache/cache.interceptor';

@Module({
  providers: [RedisService, CacheInterceptor],
  exports: [RedisService, CacheInterceptor],
})
export class RedisModule {}

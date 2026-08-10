import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { CacheInterceptor } from '../common/cache/cache.interceptor';
import { LoggerModule } from '../common/modules/log/logger.module';

@Module({
  imports: [LoggerModule],
  providers: [RedisService, CacheInterceptor],
  exports: [RedisService, CacheInterceptor],
})
export class RedisModule {}

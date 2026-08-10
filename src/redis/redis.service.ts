import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { LoggerService } from '../common/modules/log/logger.service';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(private readonly logger: LoggerService) {
    this.client = new Redis(process.env.REDIS_URL as string, {
      retryStrategy: (times) => {
        if (times > 2) {
          return null;
        }
        return Math.min(times * 200, 1000);
      },
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    this.client.on('error', (error) => {
      this.logger.error(
        `Redis client error: ${error.message}`,
        error.stack,
        RedisService.name,
      );
    });
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.error(
        `Redis GET failed for "${key}": ${(error as Error).message}`,
        (error as Error).stack,
        RedisService.name,
      );
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } catch (error) {
      this.logger.error(
        `Redis SET failed for "${key}": ${(error as Error).message}`,
        (error as Error).stack,
        RedisService.name,
      );
    }
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}

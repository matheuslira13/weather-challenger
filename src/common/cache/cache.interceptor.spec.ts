import { ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GqlExecutionContext } from '@nestjs/graphql';
import { of } from 'rxjs';
import { CacheInterceptor } from './cache.interceptor';
import { RedisService } from '../../redis/redis.service';

const CACHE_TTL_SECONDS = 60 * 60 * 3;

describe('CacheInterceptor', () => {
  let interceptor: CacheInterceptor;
  let redisService: { get: jest.Mock; set: jest.Mock };
  let callHandler: { handle: jest.Mock };
  const context = {} as ExecutionContext;

  const mockGqlArgs = (input: { city: string; countryCode: string }) => {
    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
      getArgs: () => ({ input }),
    } as unknown as GqlExecutionContext);
  };

  beforeEach(async () => {
    redisService = { get: jest.fn(), set: jest.fn() };
    callHandler = { handle: jest.fn() };

    jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheInterceptor,
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    interceptor = module.get<CacheInterceptor>(CacheInterceptor);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('builds the cache key from the GraphQL args (city + countryCode)', (done) => {
    mockGqlArgs({ city: 'New York', countryCode: 'US' });
    redisService.get.mockResolvedValue(null);
    callHandler.handle.mockReturnValue(of({ some: 'result' }));
    redisService.set.mockResolvedValue(undefined);

    interceptor.intercept(context, callHandler).subscribe(() => {
      expect(redisService.get).toHaveBeenCalledWith('forecast:us:new-york');
      done();
    });
  });

  it('returns the cached value and skips next.handle() on a cache hit', (done) => {
    mockGqlArgs({ city: 'São Paulo', countryCode: 'BR' });
    const cachedValue = { location: { latitude: -23.55 }, forecast: [] };
    redisService.get.mockResolvedValue(JSON.stringify(cachedValue));

    interceptor.intercept(context, callHandler).subscribe((result) => {
      expect(result).toEqual(cachedValue);
      expect(callHandler.handle).not.toHaveBeenCalled();
      expect(redisService.set).not.toHaveBeenCalled();
      done();
    });
  });

  it('calls next.handle() and writes the result to the cache on a miss', (done) => {
    mockGqlArgs({ city: 'São Paulo', countryCode: 'BR' });
    redisService.get.mockResolvedValue(null);
    const freshValue = { location: { latitude: -23.55 }, forecast: [] };
    callHandler.handle.mockReturnValue(of(freshValue));
    redisService.set.mockResolvedValue(undefined);

    interceptor.intercept(context, callHandler).subscribe((result) => {
      expect(callHandler.handle).toHaveBeenCalled();
      expect(result).toEqual(freshValue);
      expect(redisService.set).toHaveBeenCalledWith(
        'forecast:br:são-paulo',
        JSON.stringify(freshValue),
        CACHE_TTL_SECONDS,
      );
      done();
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import Redis from 'ioredis';
import { RedisService } from './redis.service';
import { LoggerService } from '../common/modules/log/logger.service';

jest.mock('ioredis');

describe('RedisService', () => {
  let service: RedisService;
  let loggerService: { log: jest.Mock; error: jest.Mock; warn: jest.Mock };
  let mockClient: {
    get: jest.Mock;
    set: jest.Mock;
    on: jest.Mock<void, [string, (error: Error) => void]>;
    disconnect: jest.Mock;
  };

  beforeEach(async () => {
    mockClient = {
      get: jest.fn(),
      set: jest.fn(),
      on: jest.fn<void, [string, (error: Error) => void]>(),
      disconnect: jest.fn(),
    };
    (Redis as unknown as jest.Mock).mockImplementation(() => mockClient);

    loggerService = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: LoggerService, useValue: loggerService },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('registers an error listener on the ioredis client so connection errors do not crash the process', () => {
    expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));

    const errorHandler = mockClient.on.mock.calls[0][1];
    errorHandler(new Error('connection refused'));

    expect(loggerService.error).toHaveBeenCalled();
  });

  describe('get', () => {
    it('returns the value on success', async () => {
      mockClient.get.mockResolvedValue('cached-value');

      await expect(service.get('some-key')).resolves.toBe('cached-value');
    });

    it('resolves to null and logs when the client rejects (Redis unreachable)', async () => {
      mockClient.get.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(service.get('some-key')).resolves.toBeNull();
      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('set', () => {
    it('writes the value with the given TTL on success', async () => {
      mockClient.set.mockResolvedValue('OK');

      await service.set('some-key', 'some-value', 60);

      expect(mockClient.set).toHaveBeenCalledWith(
        'some-key',
        'some-value',
        'EX',
        60,
      );
    });

    it('resolves without throwing and logs when the client rejects (Redis unreachable)', async () => {
      mockClient.set.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(
        service.set('some-key', 'some-value', 60),
      ).resolves.toBeUndefined();
      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  it('disconnects the client on module destroy', () => {
    service.onModuleDestroy();

    expect(mockClient.disconnect).toHaveBeenCalled();
  });
});

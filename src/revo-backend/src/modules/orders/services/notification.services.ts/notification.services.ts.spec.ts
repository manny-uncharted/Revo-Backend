import { Test, TestingModule } from '@nestjs/testing';
import { NotificationServicesTs } from './notification.services.ts';

describe('NotificationServicesTs', () => {
  let provider: NotificationServicesTs;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationServicesTs],
    }).compile();

    provider = module.get<NotificationServicesTs>(NotificationServicesTs);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});

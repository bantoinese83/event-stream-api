import { faker } from '@faker-js/faker';
import type { Event } from '../../src/interfaces/event.interface';

export class EventFactory {
  static create(
    overrides: Partial<Omit<Event, 'id' | 'createdAt'>> = {}
  ): Omit<Event, 'id' | 'createdAt'> {
    const defaultData = {
      page: faker.internet.url(),
      userAgent: faker.internet.userAgent(),
      country: faker.location.country(),
      device: faker.helpers.arrayElement(['desktop', 'mobile', 'tablet']),
    };
    return {
      eventType: faker.helpers.arrayElement(['user', 'system', 'error', 'audit']),
      source: faker.internet.domainName(),
      timestamp: faker.date.recent().toISOString(),
      data: overrides.data !== undefined ? overrides.data : defaultData,
      status: faker.helpers.arrayElement(['pending', 'processed', 'failed', 'archived']),
      priority:
        overrides.priority !== undefined
          ? overrides.priority
          : faker.helpers.arrayElement([1, 2, 3, 4, 5]),
      tags: overrides.tags !== undefined ? overrides.tags : [faker.word.noun()],
      userId: overrides.userId,
      sessionId: overrides.sessionId,
      duration: overrides.duration,
      metadata: overrides.metadata !== undefined ? overrides.metadata : {},
      updatedAt:
        overrides.updatedAt !== undefined ? overrides.updatedAt : faker.date.recent().toISOString(),
      ...overrides,
    };
  }

  static createMany(
    count: number,
    overrides: Partial<Omit<Event, 'id' | 'createdAt'>> = {}
  ): Array<Omit<Event, 'id' | 'createdAt'>> {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}

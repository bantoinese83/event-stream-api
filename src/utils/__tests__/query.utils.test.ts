import { buildWhereClause, buildSelectClauses, buildGroupByClause } from '../query.utils';

describe('buildWhereClause', () => {
  it('should build where clause with all filters', () => {
    const query = {
      startTime: '2023-01-01',
      endTime: '2023-01-02',
      eventType: 'test',
      source: 'src',
      userId: 'u1',
      sessionId: 's1',
      status: 'pending',
      minPriority: 2,
      tags: ['a', 'b'],
    };
    const where = buildWhereClause(query as any);
    expect(where.timestamp.gte).toEqual(new Date('2023-01-01'));
    expect(where.timestamp.lte).toEqual(new Date('2023-01-02'));
    expect(where.eventType).toBe('test');
    expect(where.source).toBe('src');
    expect(where.userId).toBe('u1');
    expect(where.sessionId).toBe('s1');
    expect(where.status).toBe('pending');
    expect(where.priority?.gte).toBe(2);
    expect(where.tags?.hasEvery).toEqual(['a', 'b']);
  });
  it('should omit undefined filters', () => {
    const query = {
      startTime: '2023-01-01',
      endTime: '2023-01-02',
    };
    const where = buildWhereClause(query as any);
    expect(where.eventType).toBeUndefined();
    expect(where.source).toBeUndefined();
    expect(where.userId).toBeUndefined();
    expect(where.sessionId).toBeUndefined();
    expect(where.status).toBeUndefined();
    expect(where.priority).toBeUndefined();
    expect(where.tags).toBeUndefined();
  });
});

describe('buildSelectClauses', () => {
  it('should build select clauses for metrics', () => {
    expect(buildSelectClauses(['count', 'unique_sources'])).toContain('count(*) as event_count');
    expect(buildSelectClauses(['count', 'unique_sources'])).toContain(
      'count(DISTINCT source) as unique_sources'
    );
  });
  it('should default to count if unknown metric', () => {
    expect(buildSelectClauses(['unknown'])).toBe('count(*) as event_count');
  });
});

describe('buildGroupByClause', () => {
  it('should build group by clause for fields', () => {
    expect(buildGroupByClause(['eventType', 'source'])).toBe('eventType, source');
  });
  it('should handle data.* fields as JSON', () => {
    expect(buildGroupByClause(['eventType', 'data.bar'])).toBe(`eventType, data->>'bar'`);
  });
});

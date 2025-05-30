import type { RawEventsQuery } from '../schemas/event.schema';

/**
 * Builds a where clause for event queries based on provided filters
 */
export function buildWhereClause(query: RawEventsQuery) {
  return {
    timestamp: {
      gte: new Date(query.startTime),
      lte: new Date(query.endTime),
    },
    ...(query.eventType && { eventType: query.eventType }),
    ...(query.source && { source: query.source }),
    ...(query.userId && { userId: query.userId }),
    ...(query.sessionId && { sessionId: query.sessionId }),
    ...(query.status && { status: query.status }),
    ...(query.minPriority && { priority: { gte: query.minPriority } }),
    ...(query.tags && { tags: { hasEvery: query.tags } }),
  };
}

/**
 * Builds SELECT clauses for analytics queries based on requested metrics
 */
export function buildSelectClauses(metrics: string[] = ['count']) {
  return metrics
    .map(metric => {
      switch (metric) {
        case 'count':
          return 'count(*) as event_count';
        case 'unique_sources':
          return 'count(DISTINCT source) as unique_sources';
        case 'unique_users':
          return 'count(DISTINCT userId) as unique_users';
        case 'unique_sessions':
          return 'count(DISTINCT sessionId) as unique_sessions';
        case 'avg_duration':
          return 'avg(duration) as avg_duration';
        case 'min_duration':
          return 'min(duration) as min_duration';
        case 'max_duration':
          return 'max(duration) as max_duration';
        case 'dominant_status':
          return 'mode() WITHIN GROUP (ORDER BY status) as dominant_status';
        case 'unique_tags':
          return 'array_agg(DISTINCT tags) as unique_tags';
        case 'p50_duration':
          return 'percentile_cont(0.5) WITHIN GROUP (ORDER BY duration) as p50_duration';
        case 'p90_duration':
          return 'percentile_cont(0.9) WITHIN GROUP (ORDER BY duration) as p90_duration';
        case 'p95_duration':
          return 'percentile_cont(0.95) WITHIN GROUP (ORDER BY duration) as p95_duration';
        case 'p99_duration':
          return 'percentile_cont(0.99) WITHIN GROUP (ORDER BY duration) as p99_duration';
        default:
          return 'count(*) as event_count';
      }
    })
    .join(', ');
}

/**
 * Builds GROUP BY clause for analytics queries
 */
export function buildGroupByClause(groupBy: string[] = ['eventType']) {
  return groupBy
    .map(field => {
      if (field.startsWith('data.')) {
        const jsonField = field.split('.')[1];
        return `data->>'${jsonField}'`;
      }
      return field;
    })
    .join(', ');
}

import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { container } from '../../container';

export async function healthzRoutes(fastify: FastifyInstance) {
  const prisma = container.resolve<PrismaClient>(PrismaClient);

  fastify.get('/healthz', async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;

      // Check TimescaleDB extension
      const ext = await prisma.$queryRaw`SELECT extname FROM pg_extension WHERE extname = 'timescaledb'`;
      const timescaleOk = Array.isArray(ext) && ext.length > 0;

      // Check hypertable
      const hypertable = await prisma.$queryRaw`SELECT hypertable_name FROM timescaledb_information.hypertables WHERE hypertable_name = 'Event'`;
      const hypertableOk = Array.isArray(hypertable) && hypertable.length > 0;

      // Check continuous aggregates
      const cagg = await prisma.$queryRaw`SELECT view_name FROM timescaledb_information.continuous_aggregates WHERE view_name IN ('event_stats_1min', 'event_stats_hourly', 'event_stats_daily')`;
      const caggNames = Array.isArray(cagg) ? cagg.map((v: any) => v.view_name) : [];
      const caggOk = ['event_stats_1min', 'event_stats_hourly', 'event_stats_daily'].every(name => caggNames.includes(name));

      // Check policies
      const jobs = await prisma.$queryRaw`SELECT proc_name FROM timescaledb_information.jobs WHERE proc_name LIKE '%policy%'`;
      const jobNames = Array.isArray(jobs) ? jobs.map((j: any) => j.proc_name) : [];
      const policyOk = ['policy_retention', 'policy_compression', 'policy_refresh_continuous_aggregate'].some(policy => jobNames.some(j => j.includes(policy)));

      const health = {
        status: timescaleOk && hypertableOk && caggOk && policyOk ? 'ok' : 'error',
        timescaledb: timescaleOk,
        hypertable: hypertableOk,
        continuousAggregates: caggOk,
        policies: policyOk,
        details: {
          extensions: ext,
          hypertable: hypertable,
          continuousAggregates: cagg,
          policies: jobs,
        },
      };
      const code = health.status === 'ok' ? 200 : 500;
      return reply.status(code).send(health);
    } catch (err) {
      return reply.status(500).send({ status: 'error', error: (err as Error).message });
    }
  });
}

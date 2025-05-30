-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
CREATE EXTENSION IF NOT EXISTS postgis;  -- For potential geographical data
CREATE EXTENSION IF NOT EXISTS vector;   -- For potential vector operations

-- After the Event table is created by Prisma, convert it to a hypertable
SELECT create_hypertable('"Event"', 'timestamp', chunk_time_interval => INTERVAL '1 day');

-- Create retention policy (30 days for raw data)
SELECT add_retention_policy('Event', INTERVAL '30 days');

-- Create compression policy (compress after 7 days)
SELECT add_compression_policy('Event', INTERVAL '7 days', if_not_exists => true);

-- Create continuous aggregate for minute-level statistics
CREATE MATERIALIZED VIEW event_stats_1min
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 minute', timestamp) AS bucket,
    eventType,
    source,
    count(*) as event_count,
    count(DISTINCT source) as unique_sources,
    count(DISTINCT userId) as unique_users,
    count(DISTINCT sessionId) as unique_sessions,
    avg(CASE WHEN duration IS NOT NULL THEN duration ELSE 0 END) as avg_duration,
    mode() WITHIN GROUP (ORDER BY status) as dominant_status,
    array_agg(DISTINCT tags) as all_tags
FROM "Event"
GROUP BY bucket, eventType, source;

-- Create continuous aggregate for hourly statistics
CREATE MATERIALIZED VIEW event_stats_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', timestamp) AS bucket,
    eventType,
    source,
    count(*) as event_count,
    count(DISTINCT source) as unique_sources,
    count(DISTINCT userId) as unique_users,
    count(DISTINCT sessionId) as unique_sessions,
    avg(CASE WHEN duration IS NOT NULL THEN duration ELSE 0 END) as avg_duration,
    mode() WITHIN GROUP (ORDER BY status) as dominant_status,
    array_agg(DISTINCT tags) as all_tags
FROM "Event"
GROUP BY bucket, eventType, source;

-- Create continuous aggregate for daily statistics
CREATE MATERIALIZED VIEW event_stats_daily
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', timestamp) AS bucket,
    eventType,
    source,
    count(*) as event_count,
    count(DISTINCT source) as unique_sources,
    count(DISTINCT userId) as unique_users,
    count(DISTINCT sessionId) as unique_sessions,
    avg(CASE WHEN duration IS NOT NULL THEN duration ELSE 0 END) as avg_duration,
    mode() WITHIN GROUP (ORDER BY status) as dominant_status,
    array_agg(DISTINCT tags) as all_tags
FROM "Event"
GROUP BY bucket, eventType, source;

-- Add refresh policies for continuous aggregates
SELECT add_continuous_aggregate_policy('event_stats_1min',
    start_offset => INTERVAL '5 minutes',
    end_offset => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 minute');

SELECT add_continuous_aggregate_policy('event_stats_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

SELECT add_continuous_aggregate_policy('event_stats_daily',
    start_offset => INTERVAL '2 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day');

-- Create additional indexes for performance
CREATE INDEX ON event_stats_1min (bucket DESC, eventType, source);
CREATE INDEX ON event_stats_hourly (bucket DESC, eventType, source);
CREATE INDEX ON event_stats_daily (bucket DESC, eventType, source);

-- Create a function to clean up old continuous aggregate data
CREATE OR REPLACE FUNCTION cleanup_continuous_aggregates()
RETURNS void AS $$
BEGIN
    CALL drop_chunks('event_stats_1min', older_than => INTERVAL '7 days');
    CALL drop_chunks('event_stats_hourly', older_than => INTERVAL '30 days');
    CALL drop_chunks('event_stats_daily', older_than => INTERVAL '365 days');
END;
$$ LANGUAGE plpgsql; 
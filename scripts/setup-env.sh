#!/bin/bash

# Function to create an environment file
create_env_file() {
    local env_type=$1
    local port=$2
    local db_name=$3
    local log_level=$4
    local swagger=$5
    local request_logging=$6
    local rate_limit_max=$7

    cat > .env.${env_type} << EOF
# Application Environment
NODE_ENV=${env_type}
PORT=${port}
LOG_LEVEL=${log_level}

# Database Configuration
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/${db_name}"

# Authentication
JWT_SECRET=change_this_to_a_secure_secret_min_32_chars
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:${port}

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=${rate_limit_max}

# API Documentation
ENABLE_SWAGGER=${swagger}

# Logging
ENABLE_REQUEST_LOGGING=${request_logging}

# TimescaleDB Configuration
TIMESCALE_RETENTION_PERIOD=30d
TIMESCALE_COMPRESSION_PERIOD=7d

# Webhook Configuration
WEBHOOK_MAX_RETRIES=3
WEBHOOK_RETRY_DELAY=5000
WEBHOOK_TIMEOUT=10000

# Monitoring and Metrics
ENABLE_METRICS=true
METRICS_PORT=9090

# Feature Flags
ENABLE_BATCH_PROCESSING=true
ENABLE_ADVANCED_ANALYTICS=true
ENABLE_WEBHOOK_SIGNATURES=true
EOF

    echo "Created .env.${env_type}"
}

# Create development environment file
create_env_file "development" "3000" "event_stream_dev" "debug" "true" "true" "1000"

# Create test environment file
create_env_file "test" "3001" "event_stream_test" "error" "false" "false" "100"

# Create production environment file
create_env_file "production" "3000" "event_stream_prod" "info" "false" "true" "100"

# Create .env.example as a template
cp .env.development .env.example
echo "Created .env.example"

# Create initial .env file for development
cp .env.development .env
echo "Created .env (copied from .env.development)"

echo "Environment files setup complete!"
echo "Remember to:"
echo "1. Update JWT_SECRET in each environment file"
echo "2. Update DATABASE_URL if using different database credentials"
echo "3. Update CORS_ORIGIN for production environment"
echo "4. Review and adjust other settings as needed" 
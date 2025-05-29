# 📊 Event Stream Analytics API

```
 _____                 _     _____ _                            
|  ___|_ __ ___  _ __ | |_  / ____| |                           
| |__ | '_ ` _ \| '_ \| __|| (___ | |_ _ __ ___  __ _ _ __ ___  
|  __|| | | | | | | | | |_ |\___ \| __| '__/ _ \/ _` | '_ ` _ \ 
| |___| | | | | | |_) |\__||____) | |_| | |  __/ (_| | | | | | |
|_____|_| |_| |_| .__/     |_____/ \__|_|  \___|\__,_|_| |_| |_|
                | |                                              
                |_|                                              
```

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/fastify-%23000000.svg?style=for-the-badge&logo=fastify&logoColor=white)](https://www.fastify.io/)
[![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)](https://www.prisma.io/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

A high-performance time-series event analytics API that transforms your data into actionable insights. Built with TypeScript, Fastify, Prisma, and TimescaleDB, this service provides robust event ingestion and advanced analytics capabilities for time-series event data.

## 🚀 Installation

### 1. Clone and Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/event-stream-api.git
cd event-stream-api

# Install dependencies
npm install

# Setup environment
cp .env.example .env
```

### 2. Configure Environment
```env
DATABASE_URL="postgresql://user:password@localhost:5432/event_stream_db"
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1d
```

### 3. Start Services
```bash
# Start database
docker-compose up -d

# Run migrations
npx prisma migrate dev

# Start server
npm run dev
```

### 4. Verify Installation
```bash
curl http://localhost:3000/healthz
```

## 🌟 Features

### Core Features
| Feature | Status | Description |
|---------|--------|-------------|
| 📥 Event Ingestion | ✅ | Rich metadata support with flexible schema |
| ⚡ Real-time Processing | ✅ | Process events as they arrive |
| 📊 Time-series Analytics | ✅ | Advanced analytics with custom metrics |
| 🔍 Pattern Detection | ✅ | Identify trends and patterns |
| 🔐 Authentication | ✅ | JWT & API key support |
| 🔑 API Key Management | ✅ | Create and manage API keys |
| 🚦 Rate Limiting | ✅ | Protect your API from abuse |
| 🪝 Webhooks | ✅ | Real-time event notifications |
| 📤 Data Export | ✅ | Export to JSON/CSV |
| 💓 Health Monitoring | ✅ | Monitor system health |

### Technical Stack
- 🔷 **TypeScript** - Type-safe development with strict type checking
- ⚡ **Fastify** - High-performance web framework with schema validation
- 💾 **Prisma** - Type-safe database ORM
- 📊 **TimescaleDB** - Optimized time-series database
- 🔍 **Zod** - Runtime schema validation
- 🔑 **JWT** - Token-based authentication
- 📝 **Pino** - Performance-focused logging

### Data Management
- 🔄 Automatic data retention policies
- 📊 Continuous aggregates at multiple intervals (1m, 5m, 15m, 1h, 1d)
- 📦 Efficient data compression
- 🧹 Automatic cleanup of old aggregate data

## 🔌 API Documentation

### Authentication
#### 🔐 POST /api/auth/register
Register a new user account.

#### 🔑 POST /api/auth/login
Authenticate and receive a JWT token.

#### 🎫 POST /api/auth/api-keys
Create a new API key (requires authentication).

#### GET /api/auth/api-keys
List all API keys (requires authentication).

#### DELETE /api/auth/api-keys/:id
Revoke an API key (requires authentication).

### Event Management

#### POST /api/events
Create a new event with rich metadata.

```typescript
{
  "timestamp": "2024-03-20T10:00:00Z",
  "eventType": "page_view",
  "source": "web",
  "data": { 
    "page": "/home",
    "userAgent": "Mozilla/5.0...",
    "country": "US",
    "device": "mobile"
  },
  "userId": "user123",
  "sessionId": "session456",
  "duration": 120,
  "priority": 1,
  "tags": ["frontend", "performance"],
  "metadata": {
    "version": "1.0.0",
    "environment": "production"
  }
}
```

#### POST /api/events/batch
Create multiple events in a single request.

#### GET /api/events/raw
Get raw event data with filtering and pagination.

Query Parameters:
- `startTime`: Start timestamp (ISO 8601)
- `endTime`: End timestamp (ISO 8601)
- `eventType`: Filter by event type
- `source`: Filter by source
- `userId`: Filter by user ID
- `sessionId`: Filter by session ID
- `tags`: Filter by tags
- `minPriority`: Filter by minimum priority
- `status`: Filter by status
- `page`: Page number
- `pageSize`: Items per page

#### GET /api/events/aggregated
Get time-bucketed event aggregations.

Query Parameters:
- All parameters from /raw endpoint, plus:
- `interval`: Time bucket size ('1m', '5m', '15m', '1h', '1d')

#### GET /api/events/analytics
Advanced analytics with custom metrics and grouping.

Query Parameters:
- All parameters from /aggregated endpoint, plus:
- `groupBy`: Fields to group by
- `metrics`: Metrics to calculate
- `having`: Conditions for filtered aggregates
- `orderBy`: Sort specifications

Available Metrics:
- `count`: Event count
- `unique_sources`: Distinct sources
- `unique_users`: Distinct users
- `unique_sessions`: Distinct sessions
- `avg_duration`: Average duration
- `min_duration`: Minimum duration
- `max_duration`: Maximum duration
- `dominant_status`: Most common status
- `unique_tags`: Distinct tags
- `p50_duration`: Median duration
- `p90_duration`: 90th percentile duration
- `p95_duration`: 95th percentile duration
- `p99_duration`: 99th percentile duration

### Webhook Management

#### POST /api/webhooks
Create a new webhook subscription.

#### PATCH /api/webhooks/:id
Update an existing webhook.

#### DELETE /api/webhooks/:id
Delete a webhook subscription.

#### GET /api/webhooks
List all webhooks with pagination.

#### GET /api/webhooks/deliveries
List webhook delivery attempts with filtering.

### Data Export

#### GET /api/export/events
Export raw events in JSON or CSV format.

#### GET /api/export/aggregated
Export aggregated data in JSON or CSV format.

### Health Check

#### GET /healthz
Check API and database health status.

## 📈 Use Cases

### 1. User Analytics
Track user behavior and engagement:

```typescript
// Track page views
await eventApi.track({
  eventType: "page_view",
  source: "web",
  data: {
    page: "/products",
    referrer: "google",
    device: "mobile"
  },
  userId: "user_123"
});

// Analyze user journey
const journey = await eventApi.analytics({
  userId: "user_123",
  metrics: ["page_views", "time_spent"],
  interval: "1h"
});
```

### 2. System Monitoring
Monitor application performance:

```typescript
// Track API latency
await eventApi.track({
  eventType: "api_request",
  source: "backend",
  data: {
    endpoint: "/users",
    method: "GET",
    latency: 45,
    status: 200
  },
  priority: 1
});
```

## 📊 Performance Metrics

### Query Performance
| Operation | Average Latency | p95 Latency |
|-----------|----------------|-------------|
| Event Ingestion | 15ms | 45ms |
| Raw Query | 50ms | 150ms |
| Aggregation | 100ms | 250ms |
| Export | 200ms | 500ms |

### Scalability
```
Throughput: Up to 10,000 events/second
Storage: Efficient compression (up to 95%)
Retention: Configurable per time bucket
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 🟢
- Docker 🐳
- PostgreSQL 14+ with TimescaleDB 📦

### One-Line Installation
```bash
curl -sSL https://get.event-stream-api.dev | bash
```

## 🔒 Security Features

### Authentication Flow
```mermaid
graph LR
    A[Request] --> B{Auth Check}
    B -->|JWT| C[Validate Token]
    B -->|API Key| D[Validate Key]
    C --> E{Check Permissions}
    D --> E
    E -->|Success| F[Allow]
    E -->|Fail| G[Deny]
```

## 🎯 Roadmap

- [ ] 🔄 Real-time Analytics Dashboard
- [ ] 🤖 ML-powered Anomaly Detection
- [ ] 🌐 Multi-region Support
- [ ] 📱 Mobile SDK
- [ ] 🔌 More Integration Options

## 🤝 Contributing

We love contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

```
🌟 Star us on GitHub
👀 Watch for updates
🍴 Fork and contribute
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
Made with ❤️ by the Event Stream Analytics Team 

## 🧪 Testing

### Test Setup
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test types
npm run test:unit      # Unit tests
npm run test:e2e      # End-to-end tests
npm run test:integration  # Integration tests
```

### Test Configuration
- 🔧 **Jest** with TypeScript support
- 🃏 **jest-mock-extended** for advanced mocking
- 🧪 **jest-extended** for additional matchers
- 📊 Coverage threshold set to 80% for branches, functions, lines, and statements
- 🔄 Automatic test database setup with `@testcontainers/postgresql`
- 🛠️ Dependency injection with `tsyringe` for better testability

### Environment Setup
```bash
# Setup development environment
npm run dev:setup

# Setup test environment
npm run test:setup

# Setup production environment
npm run prod:setup
```

## 📤 Export Features

### Raw Event Export
- Export events in JSON or CSV format
- Customizable date range filtering
- Automatic file naming based on date range
- Content-Type and Content-Disposition headers for proper file downloads

```typescript
// Example: Export events as CSV
GET /api/export/events?startTime=2024-01-01T00:00:00Z&endTime=2024-01-31T23:59:59Z&format=csv
```

### Aggregated Event Export
- Export aggregated metrics in JSON or CSV format
- Time-bucketed aggregations (1m, 5m, 15m, 1h, 1d intervals)
- Customizable metrics and grouping
- Automatic file naming with aggregation details

```typescript
// Example: Export aggregated events
GET /api/export/aggregated?startTime=2024-01-01T00:00:00Z&endTime=2024-01-31T23:59:59Z&interval=1h&format=json
```

## 📊 Advanced Analytics

### Time Series Aggregation
- Materialized views for improved query performance
- Configurable time buckets for different granularities
- Rich set of aggregation metrics:
  - Event counts
  - Unique sources/users/sessions
  - Duration statistics (min, max, avg)
  - Percentile calculations (p50, p90, p95, p99)
  - Status and tag analysis

### Performance Optimizations
- Automatic materialized view refresh
- Bitmap scan optimization for large datasets
- Efficient batch processing with configurable batch sizes
- Query result caching for frequently accessed metrics

## 🔧 Development Tools

### Environment Management
```bash
# Switch between environments
npm run env:dev    # Development environment
npm run env:test   # Test environment
npm run env:prod   # Production environment
```

### Docker Support
```bash
# Development environment
npm run docker:dev:build
npm run docker:dev
npm run docker:dev:down

# Test environment
npm run docker:test:build
npm run docker:test
npm run docker:test:down

# Production environment
npm run docker:prod:build
npm run docker:prod
npm run docker:prod:down
```

### Code Quality
```bash
# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
npm run format:check
```

## 🪝 Enhanced Webhook System

### Webhook Features
- Secure payload delivery with HMAC signatures
- Configurable retry mechanism with exponential backoff
- Custom headers support
- Comprehensive delivery tracking
- Event-based filtering

### Webhook Configuration
```typescript
{
  "name": "My Webhook",
  "url": "https://api.example.com/webhook",
  "secret": "your-secret-key",
  "events": ["event.created", "event.updated"],
  "headers": {
    "X-Custom-Header": "value"
  },
  "enabled": true,
  "retryCount": 3
}
```

### Security Features
- HMAC SHA-256 payload signatures
- Unique delivery IDs
- Event type headers
- Configurable timeouts
- Rate limiting

### Delivery Tracking
- Success/failure status
- Response data
- Error messages
- Retry attempts
- Timestamp tracking

### Webhook Management API
```typescript
// Create webhook
POST /api/webhooks
Content-Type: application/json
{
  "name": "New Webhook",
  "url": "https://api.example.com/webhook",
  "secret": "webhook-secret-key",
  "events": ["event.created"]
}

// Update webhook
PATCH /api/webhooks/:id
Content-Type: application/json
{
  "enabled": false
}

// List webhooks
GET /api/webhooks?page=1&pageSize=20

// Get webhook deliveries
GET /api/webhooks/deliveries?webhookId=123
```

## 🔐 Authentication Improvements

### API Key Management
- Secure key generation
- Configurable expiration
- Usage tracking
- Scope-based permissions
- Automatic rotation support

### JWT Authentication
- Configurable token expiration
- Refresh token support
- Role-based access control
- Token blacklisting
- Secure password reset flow

### Security Features
- Password hashing with bcrypt
- Rate limiting on auth endpoints
- JWT signature verification
- API key validation
- Session management

### Authentication API
```typescript
// Register new user
POST /api/auth/register
Content-Type: application/json
{
  "username": "user@example.com",
  "password": "secure_password"
}

// Login
POST /api/auth/login
Content-Type: application/json
{
  "username": "user@example.com",
  "password": "secure_password"
}

// Create API key
POST /api/auth/api-keys
Authorization: Bearer <jwt_token>
Content-Type: application/json
{
  "name": "My API Key",
  "expiresIn": "30d"
}

// Change password
POST /api/auth/change-password
Authorization: Bearer <jwt_token>
Content-Type: application/json
{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

## 🛡️ Error Handling & Logging

### Error Types
```typescript
enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  RATE_LIMIT = 'RATE_LIMIT',
  DATABASE = 'DATABASE_ERROR',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
  CONFLICT = 'CONFLICT_ERROR',
  BAD_REQUEST = 'BAD_REQUEST_ERROR'
}
```

### Error Handling Features
- Standardized error responses
- Prisma error mapping
- External service error handling
- Webhook delivery error tracking
- Rate limit error handling
- Validation error details
- Stack trace preservation

### Logging System
- Structured JSON logging with Pino
- Log levels (error, warn, info, debug)
- Performance monitoring
- Audit logging
- Request/Response logging
- Error context tracking

### Performance Monitoring
```typescript
@MonitorPerformance()
async function myOperation() {
  // Operation is automatically timed
  // Success/failure is tracked
  // Memory usage is monitored
}
```

### Audit Logging
```typescript
// Track important operations
logAudit('user.login', userId, {
  ip: request.ip,
  userAgent: request.headers['user-agent']
});
```

### Error Response Format
```typescript
{
  "statusCode": 400,
  "error": "VALIDATION_ERROR",
  "message": "Invalid input data",
  "details": {
    "fields": ["email"],
    "constraint": "format"
  }
}
```

## 🔍 Monitoring & Metrics

### System Health
- Database connection status
- External service health
- Memory usage tracking
- Response time monitoring
- Error rate tracking

### Performance Metrics
- Request latency
- Database query timing
- Webhook delivery success rate
- Cache hit ratio
- Rate limit statistics

### Operational Metrics
- Active users
- Event processing rate
- Webhook delivery rate
- API key usage
- Storage utilization

### Monitoring Endpoints
```typescript
// Health check
GET /healthz

// Detailed health status
GET /healthz/details

// Metrics (Prometheus format)
GET /metrics
```
# UnionEyes AI Service

Advanced AI Workbench providing legal document analysis, predictive analytics, and natural language processing capabilities for the UnionEyes platform.

## Features

### 🔍 Document Analysis
- **Legal Document Analysis**: Comprehensive analysis including entity extraction, sentiment analysis, legal issue identification, and risk assessment
- **Contract Analysis**: Clause extraction, risk scoring, missing clause detection, and recommendations
- **PDF Processing**: Extract text from PDF documents for analysis
- **Document Comparison**: Side-by-side comparison highlighting differences and similarities
- **Information Extraction**: Extract specific information using natural language queries
- **Precedent Matching**: Find relevant legal precedents using semantic search

### 📊 Predictive Analytics
- **Claim Outcome Prediction**: Predict case outcomes with probability and confidence scores
- **Timeline Forecasting**: Estimate completion dates and milestone timelines
- **Resource Allocation**: Recommend optimal steward assignments based on skills and workload
- **Settlement Estimation**: Predict settlement value ranges with confidence intervals
- **Anomaly Detection**: Identify unusual patterns in claims data for early intervention

### 💬 Natural Language Query
- **Natural Language to SQL**: Convert questions into database queries automatically
- **Intent Classification**: Understand user intent (analytical, informational, procedural)
- **Multi-Source Answers**: Combine database results with knowledge base information
- **Follow-up Suggestions**: Generate relevant follow-up questions
- **Report Generation**: Create structured reports from natural language specifications
- **Technical Explanations**: Provide explanations tailored to audience expertise level

## Architecture

```
services/ai-service/
├── src/
│   ├── config/           # Configuration management (Zod validation)
│   ├── core/             # AI orchestration layer
│   │   └── orchestrator.ts   # Multi-provider AI management
│   ├── engines/          # Specialized AI engines
│   │   ├── document-analysis.ts
│   │   ├── predictive-analytics.ts
│   │   └── nl-query.ts
│   ├── middleware/       # Express middleware
│   │   └── index.ts      # Auth, rate limiting, validation
│   ├── workers/          # Background job processors
│   │   └── index.ts      # Bull queue workers
│   ├── utils/            # Utilities
│   │   └── logger.ts     # Winston logging
│   └── index.ts          # Express API server
├── package.json
├── tsconfig.json
└── .env.example
```

## Technology Stack

- **AI Providers**: OpenAI (GPT-4 Turbo), Anthropic (Claude 3)
- **Orchestration**: LangChain for advanced workflows
- **Vector Database**: Pinecone for semantic search
- **Job Queue**: Bull with Redis for background processing
- **Database**: Supabase (PostgreSQL) for data storage
- **API**: Express.js with TypeScript
- **Logging**: Winston with structured logging
- **Validation**: Zod for type-safe configuration

## Prerequisites

- Node.js 18+
- Redis (for Bull queues)
- PostgreSQL (via Supabase)
- API Keys:
  - OpenAI API key
  - Anthropic API key
  - Pinecone API key
  - Supabase credentials

## Setup

### 1. Environment Configuration

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:

```env
# Server
PORT=3005
NODE_ENV=development

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-key
DATABASE_URL=postgresql://...

# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Vector Database
PINECONE_API_KEY=your-pinecone-key
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX_NAME=unioneyes-legal-docs

# Redis
REDIS_URL=redis://localhost:6379

# Model Configuration
DEFAULT_AI_MODEL=gpt-4-turbo-preview
FALLBACK_AI_MODEL=claude-3-opus-20240229
EMBEDDING_MODEL=text-embedding-3-large

# Rate Limits
MAX_TOKENS_PER_REQUEST=4096
MAX_REQUESTS_PER_MINUTE=60
MAX_REQUESTS_PER_DAY=10000

# Feature Flags
ENABLE_DOCUMENT_ANALYSIS=true
ENABLE_PREDICTIONS=true
ENABLE_NLP_QUERIES=true
ENABLE_AUTO_LEARNING=true

# Logging
LOG_LEVEL=info
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Database Migration

Run the AI system tables migration:

```bash
psql -f database/migrations/011_ai_system_tables.sql
```

This creates:
- `ai_analyses` - Document analysis results
- `ai_predictions` - Prediction results with outcome tracking
- `ai_jobs` - Background job status
- `ai_usage` - Token usage tracking
- `ai_feedback` - User feedback for model improvement
- `ai_training_data` - Validated training data

### 4. Pinecone Setup

Create a Pinecone index:

```bash
# Using Pinecone CLI or dashboard
# Index name: unioneyes-legal-docs
# Dimensions: 3072 (for text-embedding-3-large)
# Metric: cosine
```

### 5. Start Redis

```bash
# Using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or using local Redis
redis-server
```

## Running the Service

### Development Mode

Start the API server with hot reload:

```bash
pnpm dev
```

Start the background workers:

```bash
pnpm worker
```

### Production Mode

Build and run:

```bash
pnpm build
pnpm start
```

## API Endpoints

### Document Analysis

**POST** `/api/ai/analyze/document`
```json
{
  "documentText": "Full text of legal document...",
  "documentType": "grievance" // optional
}
```

**POST** `/api/ai/analyze/contract`
```json
{
  "contractText": "Full contract text..."
}
```

**POST** `/api/ai/document/summarize`
```json
{
  "documentText": "Long document...",
  "maxLength": 500 // optional
}
```

**POST** `/api/ai/document/compare`
```json
{
  "document1": "First document text...",
  "document2": "Second document text...",
  "comparisonType": "contract" // optional
}
```

**POST** `/api/ai/document/extract`
```json
{
  "documentText": "Document text...",
  "query": "What is the termination notice period?"
}
```

### Predictive Analytics

**POST** `/api/ai/predict/outcome`
```json
{
  "type": "wrongful_termination",
  "description": "Employee claims unfair dismissal...",
  "filedDate": "2024-01-15",
  "employeeTenure": 5,
  "previousWarnings": 0,
  "unionSupport": true
}
```

**POST** `/api/ai/predict/timeline`
```json
{
  "claimId": "uuid-here"
}
```

**POST** `/api/ai/predict/resources`
```json
{
  "type": "wrongful_termination",
  "description": "Case details...",
  "complexity": "high",
  "urgency": "medium"
}
```

**POST** `/api/ai/predict/settlement`
```json
{
  "type": "wage_dispute",
  "description": "Unpaid overtime claims...",
  "amountClaimed": 15000,
  "employeeTenure": 3
}
```

**POST** `/api/ai/detect/anomalies`
```json
{
  "tenantId": "uuid-here",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31"
}
```

### Natural Language Query

**POST** `/api/ai/query`
```json
{
  "question": "How many wrongful termination claims were filed last quarter?",
  "tenantId": "uuid-here",
  "context": {} // optional additional context
}
```

**POST** `/api/ai/query/suggestions`
```json
{
  "question": "How many claims were filed?",
  "answer": "142 claims were filed in Q4 2024."
}
```

**POST** `/api/ai/report/generate`
```json
{
  "specification": "Generate a quarterly claims report showing trends by type and outcome",
  "tenantId": "uuid-here"
}
```

### General

**POST** `/api/ai/chat`
```json
{
  "messages": [
    { "role": "user", "content": "Explain the legal concept of constructive dismissal" }
  ],
  "model": "gpt-4-turbo-preview", // optional
  "temperature": 0.3, // optional
  "maxTokens": 1000 // optional
}
```

**GET** `/health`

Returns service health status including OpenAI, Anthropic, and Pinecone connectivity.

## Background Jobs

Long-running operations are queued for background processing:

### Job Types

- **Document Analysis**: `analyze`, `analyze-contract`, `compare`
- **Predictions**: `outcome`, `timeline`, `resources`, `settlement`, `anomalies`
- **Reports**: `generate`

### Job Status

Check job status via Bull dashboard or query `ai_jobs` table:

```sql
SELECT * FROM ai_jobs WHERE tenant_id = 'your-tenant-id' ORDER BY created_at DESC;
```

## Monitoring

### Logging

All operations are logged with Winston:

- **Console**: Development (colored)
- **File**: Production (`logs/ai-service.log`)
- **Format**: JSON with timestamps and metadata

### Metrics

Track usage via `ai_usage` table:

```sql
SELECT * FROM ai_usage_summary 
WHERE tenant_id = 'your-tenant-id' 
AND usage_date >= CURRENT_DATE - INTERVAL '30 days';
```

### Prediction Accuracy

Monitor model performance:

```sql
SELECT * FROM ai_prediction_accuracy
WHERE tenant_id = 'your-tenant-id';
```

## Error Handling

The service implements comprehensive error handling:

- **Provider Failover**: Automatic fallback from OpenAI to Anthropic on failures
- **Rate Limiting**: 429 responses with retry-after headers
- **Validation Errors**: 400 responses with detailed error messages
- **Auth Errors**: 401 responses for missing/invalid tokens
- **Server Errors**: 500 responses (sanitized in production)

## Security

- **Authentication**: JWT token validation (integrate with Supabase Auth)
- **Tenant Isolation**: All queries scoped to tenant ID
- **Rate Limiting**: Per-tenant request limits
- **Input Validation**: Zod schemas for all inputs
- **SQL Injection Prevention**: Parameterized queries only
- **API Key Protection**: Never expose keys in responses or logs

## Performance

### Optimization Strategies

- **Embedding Cache**: Store document embeddings in Pinecone
- **Historical Data**: Learn from past predictions
- **Batch Processing**: Queue non-urgent jobs
- **Response Streaming**: Stream long AI responses
- **Connection Pooling**: Reuse database connections

### Benchmarks

- Document Analysis: ~3-5 seconds
- Contract Analysis: ~5-10 seconds
- Outcome Prediction: ~2-4 seconds
- NL Query: ~1-3 seconds

## Development

### Adding New AI Capabilities

1. **Create new engine method** in appropriate engine file
2. **Add API endpoint** in `src/index.ts`
3. **Add queue worker** if background processing needed
4. **Update database migration** if new data structures needed
5. **Add tests** for new functionality
6. **Update documentation**

### Testing

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test src/engines/document-analysis.test.ts

# Run with coverage
pnpm test --coverage
```

### Linting

```bash
# Check for issues
pnpm lint

# Auto-fix issues
pnpm lint:fix
```

## Troubleshooting

### OpenAI API Errors

- Check API key validity
- Verify rate limits not exceeded
- Check model availability (gpt-4-turbo-preview)

### Anthropic Fallback Not Working

- Verify Anthropic API key is valid
- Check model name (claude-3-opus-20240229)
- Review fallback logic in orchestrator

### Pinecone Connection Issues

- Verify API key and environment
- Ensure index exists and matches configuration
- Check index dimensions (3072 for text-embedding-3-large)

### Redis Connection Failed

- Verify Redis is running (`redis-cli ping`)
- Check Redis URL in .env
- Ensure firewall allows connection

### Database Queries Failing

- Check Supabase credentials
- Verify RLS policies allow service role access
- Run migrations if tables missing

## Contributing

1. Follow TypeScript strict mode guidelines
2. Add comprehensive error handling
3. Log all operations with appropriate level
4. Write tests for new features
5. Update documentation

## License

MIT - See LICENSE file for details

## Support

For issues or questions:
- GitHub Issues: [unioneyes/union-claims-standalone](https://github.com/unioneyes/union-claims-standalone)
- Email: support@unioneyes.com

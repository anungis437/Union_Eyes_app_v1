import express, { Request, Response, NextFunction } from 'express';
import { config } from './config';
import logger from './utils/logger';
import { aiOrchestrator } from './core/orchestrator';
import { documentAnalysisEngine } from './engines/document-analysis';
import { predictiveAnalyticsEngine } from './engines/predictive-analytics';
import { nlQueryEngine } from './engines/nl-query';

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// Health check
app.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await aiOrchestrator.healthCheck();
    const allHealthy = Object.values(health).every((v) => v === true);

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'degraded',
      services: health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed',
    });
  }
});

// ========================================
// DOCUMENT ANALYSIS ROUTES
// ========================================

/**
 * POST /api/ai/analyze/document
 * Analyze a legal document
 */
app.post('/api/ai/analyze/document', async (req: Request, res: Response) => {
  try {
    const { documentText, documentType } = req.body;

    if (!documentText) {
      return res.status(400).json({ error: 'documentText is required' });
    }

    const analysis = await documentAnalysisEngine.analyzeDocument(
      documentText,
      documentType
    );

    res.json({ analysis });
  } catch (error) {
    logger.error('Document analysis failed', { error });
    res.status(500).json({ error: 'Document analysis failed' });
  }
});

/**
 * POST /api/ai/analyze/contract
 * Analyze a contract for risks and clauses
 */
app.post('/api/ai/analyze/contract', async (req: Request, res: Response) => {
  try {
    const { contractText } = req.body;

    if (!contractText) {
      return res.status(400).json({ error: 'contractText is required' });
    }

    const analysis = await documentAnalysisEngine.analyzeContract(contractText);

    res.json({ analysis });
  } catch (error) {
    logger.error('Contract analysis failed', { error });
    res.status(500).json({ error: 'Contract analysis failed' });
  }
});

/**
 * POST /api/ai/document/summarize
 * Summarize a document
 */
app.post('/api/ai/document/summarize', async (req: Request, res: Response) => {
  try {
    const { documentText, maxLength } = req.body;

    if (!documentText) {
      return res.status(400).json({ error: 'documentText is required' });
    }

    const summary = await documentAnalysisEngine.summarizeDocument(
      documentText,
      maxLength
    );

    res.json({ summary });
  } catch (error) {
    logger.error('Document summarization failed', { error });
    res.status(500).json({ error: 'Document summarization failed' });
  }
});

/**
 * POST /api/ai/document/compare
 * Compare two documents
 */
app.post('/api/ai/document/compare', async (req: Request, res: Response) => {
  try {
    const { document1, document2, comparisonType } = req.body;

    if (!document1 || !document2) {
      return res.status(400).json({ error: 'Both documents are required' });
    }

    const comparison = await documentAnalysisEngine.compareDocuments(
      document1,
      document2,
      comparisonType
    );

    res.json({ comparison });
  } catch (error) {
    logger.error('Document comparison failed', { error });
    res.status(500).json({ error: 'Document comparison failed' });
  }
});

/**
 * POST /api/ai/document/extract
 * Extract specific information from document
 */
app.post('/api/ai/document/extract', async (req: Request, res: Response) => {
  try {
    const { documentText, query } = req.body;

    if (!documentText || !query) {
      return res.status(400).json({ error: 'documentText and query are required' });
    }

    const information = await documentAnalysisEngine.extractInformation(
      documentText,
      query
    );

    res.json({ information });
  } catch (error) {
    logger.error('Information extraction failed', { error });
    res.status(500).json({ error: 'Information extraction failed' });
  }
});

// ========================================
// PREDICTIVE ANALYTICS ROUTES
// ========================================

/**
 * POST /api/ai/predict/outcome
 * Predict claim outcome
 */
app.post('/api/ai/predict/outcome', async (req: Request, res: Response) => {
  try {
    const claimData = req.body;

    if (!claimData.type || !claimData.description) {
      return res.status(400).json({ error: 'type and description are required' });
    }

    const prediction = await predictiveAnalyticsEngine.predictClaimOutcome(
      claimData
    );

    res.json({ prediction });
  } catch (error) {
    logger.error('Outcome prediction failed', { error });
    res.status(500).json({ error: 'Outcome prediction failed' });
  }
});

/**
 * POST /api/ai/predict/timeline
 * Predict case timeline
 */
app.post('/api/ai/predict/timeline', async (req: Request, res: Response) => {
  try {
    const { claimId } = req.body;

    if (!claimId) {
      return res.status(400).json({ error: 'claimId is required' });
    }

    const prediction = await predictiveAnalyticsEngine.predictTimeline(claimId);

    res.json({ prediction });
  } catch (error) {
    logger.error('Timeline prediction failed', { error });
    res.status(500).json({ error: 'Timeline prediction failed' });
  }
});

/**
 * POST /api/ai/predict/resources
 * Predict optimal resource allocation
 */
app.post('/api/ai/predict/resources', async (req: Request, res: Response) => {
  try {
    const claimData = req.body;

    if (!claimData.type || !claimData.description) {
      return res.status(400).json({ error: 'type and description are required' });
    }

    const prediction = await predictiveAnalyticsEngine.predictResourceAllocation(
      claimData
    );

    res.json({ prediction });
  } catch (error) {
    logger.error('Resource prediction failed', { error });
    res.status(500).json({ error: 'Resource prediction failed' });
  }
});

/**
 * POST /api/ai/predict/settlement
 * Predict settlement value
 */
app.post('/api/ai/predict/settlement', async (req: Request, res: Response) => {
  try {
    const claimData = req.body;

    if (!claimData.type || !claimData.description) {
      return res.status(400).json({ error: 'type and description are required' });
    }

    const prediction = await predictiveAnalyticsEngine.predictSettlementValue(
      claimData
    );

    res.json({ prediction });
  } catch (error) {
    logger.error('Settlement prediction failed', { error });
    res.status(500).json({ error: 'Settlement prediction failed' });
  }
});

/**
 * POST /api/ai/detect/anomalies
 * Detect anomalies in claims data
 */
app.post('/api/ai/detect/anomalies', async (req: Request, res: Response) => {
  try {
    const { tenantId, startDate, endDate } = req.body;

    if (!tenantId || !startDate || !endDate) {
      return res.status(400).json({ error: 'tenantId, startDate, and endDate are required' });
    }

    const analysis = await predictiveAnalyticsEngine.detectAnomalies(tenantId, {
      start: new Date(startDate),
      end: new Date(endDate),
    });

    res.json({ analysis });
  } catch (error) {
    logger.error('Anomaly detection failed', { error });
    res.status(500).json({ error: 'Anomaly detection failed' });
  }
});

// ========================================
// NATURAL LANGUAGE QUERY ROUTES
// ========================================

/**
 * POST /api/ai/query
 * Process natural language query
 */
app.post('/api/ai/query', async (req: Request, res: Response) => {
  try {
    const { question, tenantId, context } = req.body;

    if (!question || !tenantId) {
      return res.status(400).json({ error: 'question and tenantId are required' });
    }

    const result = await nlQueryEngine.query(question, tenantId, context);

    res.json({ result });
  } catch (error) {
    logger.error('NL query failed', { error });
    res.status(500).json({ error: 'Natural language query failed' });
  }
});

/**
 * POST /api/ai/query/suggestions
 * Get suggested follow-up questions
 */
app.post('/api/ai/query/suggestions', async (req: Request, res: Response) => {
  try {
    const { question, answer } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ error: 'question and answer are required' });
    }

    const suggestions = await nlQueryEngine.getSuggestedQuestions(question, answer);

    res.json({ suggestions });
  } catch (error) {
    logger.error('Suggestion generation failed', { error });
    res.status(500).json({ error: 'Suggestion generation failed' });
  }
});

/**
 * POST /api/ai/report/generate
 * Generate report from natural language specification
 */
app.post('/api/ai/report/generate', async (req: Request, res: Response) => {
  try {
    const { specification, tenantId } = req.body;

    if (!specification || !tenantId) {
      return res.status(400).json({ error: 'specification and tenantId are required' });
    }

    const report = await nlQueryEngine.generateReport(specification, tenantId);

    res.json({ report });
  } catch (error) {
    logger.error('Report generation failed', { error });
    res.status(500).json({ error: 'Report generation failed' });
  }
});

// ========================================
// GENERAL AI ROUTES
// ========================================

/**
 * POST /api/ai/chat
 * General purpose AI chat
 */
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { messages, model, temperature, maxTokens } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const response = await aiOrchestrator.chat(messages, {
      model,
      temperature,
      maxTokens,
    });

    res.json({ response });
  } catch (error) {
    logger.error('Chat failed', { error });
    res.status(500).json({ error: 'Chat failed' });
  }
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', { error: err });
  res.status(500).json({
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
const PORT = config.port;

app.listen(PORT, () => {
  logger.info(`AI Service running on port ${PORT}`, {
    nodeEnv: config.nodeEnv,
    defaultModel: config.defaultAiModel,
  });
});

export default app;

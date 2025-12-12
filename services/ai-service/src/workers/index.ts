// Only import bull in runtime, not during build
let Queue: any;
let documentQueue: any;
let predictionQueue: any;
let reportQueue: any;
let logger: any;
let documentAnalysisEngine: any;
let predictiveAnalyticsEngine: any;
let nlQueryEngine: any;

// Initialize queues and register handlers only in runtime
if (typeof window === 'undefined' && !process.env.__NEXT_BUILDING) {
  try {
    Queue = require('bull');
    const { config } = require('../config');
    logger = require('../utils/logger');
    const DocumentAnalysis = require('../engines/document-analysis').default;
    const PredictiveAnalytics = require('../engines/predictive-analytics').default;
    const NLQuery = require('../engines/nl-query').default;

    // Initialize engines
    documentAnalysisEngine = new DocumentAnalysis();
    predictiveAnalyticsEngine = new PredictiveAnalytics();
    nlQueryEngine = new NLQuery();

    // Create queues
    documentQueue = new Queue('document-analysis', config.redisUrl);
    predictionQueue = new Queue('predictions', config.redisUrl);
    reportQueue = new Queue('reports', config.redisUrl);

    // ========================================
    // DOCUMENT ANALYSIS QUEUE WORKER
    // ========================================

    documentQueue.process('analyze', async (job: any) => {
      const { documentText, documentType, jobId } = job.data;

      logger.info('Processing document analysis job', { jobId, documentType });

      try {
        job.progress(10);

        const analysis = await documentAnalysisEngine.analyzeDocument(
          documentText,
          documentType
        );

        job.progress(100);

        logger.info('Document analysis completed', { jobId });

        return {
          success: true,
          analysis,
          completedAt: new Date().toISOString(),
        };
      } catch (error) {
        logger.error('Document analysis job failed', { jobId, error });
        throw error;
      }
    });

    documentQueue.process('analyze-contract', async (job: any) => {
      const { contractText, jobId } = job.data;

      logger.info('Processing contract analysis job', { jobId });

      try {
        job.progress(10);

        const analysis = await documentAnalysisEngine.analyzeContract(contractText);

        job.progress(100);

        logger.info('Contract analysis completed', { jobId });

        return {
          success: true,
          analysis,
          completedAt: new Date().toISOString(),
        };
      } catch (error) {
        logger.error('Contract analysis job failed', { jobId, error });
        throw error;
      }
    });

    documentQueue.process('compare', async (job: any) => {
      const { document1, document2, comparisonType, jobId } = job.data;

      logger.info('Processing document comparison job', { jobId });

      try {
        job.progress(10);

        const comparison = await documentAnalysisEngine.compareDocuments(
          document1,
          document2,
          comparisonType
        );

        job.progress(100);

        logger.info('Document comparison completed', { jobId });

        return {
          success: true,
          comparison,
          completedAt: new Date().toISOString(),
        };
      } catch (error) {
        logger.error('Document comparison job failed', { jobId, error });
        throw error;
      }
    });

    // ========================================
    // PREDICTION QUEUE WORKER
    // ========================================

    predictionQueue.process('outcome', async (job: any) => {
      const { claimData, jobId } = job.data;

      logger.info('Processing outcome prediction job', { jobId });

      try {
        job.progress(10);

        const prediction = await predictiveAnalyticsEngine.predictClaimOutcome(
          claimData
        );

        job.progress(100);

        logger.info('Outcome prediction completed', { jobId });

        return {
          success: true,
          prediction,
          completedAt: new Date().toISOString(),
        };
      } catch (error) {
        logger.error('Outcome prediction job failed', { jobId, error });
        throw error;
      }
    });

    predictionQueue.process('timeline', async (job: any) => {
      const { claimId, jobId } = job.data;

      logger.info('Processing timeline prediction job', { jobId });

      try {
        job.progress(10);

        const prediction = await predictiveAnalyticsEngine.predictTimeline(claimId);

        job.progress(100);

        logger.info('Timeline prediction completed', { jobId });

        return {
          success: true,
          prediction,
          completedAt: new Date().toISOString(),
        };
      } catch (error) {
        logger.error('Timeline prediction job failed', { jobId, error });
        throw error;
      }
    });

    predictionQueue.process('resources', async (job: any) => {
      const { claimData, jobId } = job.data;

      logger.info('Processing resource prediction job', { jobId });

      try {
        job.progress(10);

        const prediction = await predictiveAnalyticsEngine.predictResourceAllocation(
          claimData
        );

        job.progress(100);

        logger.info('Resource prediction completed', { jobId });

        return {
          success: true,
          prediction,
          completedAt: new Date().toISOString(),
        };
      } catch (error) {
        logger.error('Resource prediction job failed', { jobId, error });
        throw error;
      }
    });

    predictionQueue.process('settlement', async (job: any) => {
      const { claimData, jobId } = job.data;

      logger.info('Processing settlement prediction job', { jobId });

      try {
        job.progress(10);

        const prediction = await predictiveAnalyticsEngine.predictSettlementValue(
          claimData
        );

        job.progress(100);

        logger.info('Settlement prediction completed', { jobId });

        return {
          success: true,
          prediction,
          completedAt: new Date().toISOString(),
        };
      } catch (error) {
        logger.error('Settlement prediction job failed', { jobId, error });
        throw error;
      }
    });

    predictionQueue.process('anomalies', async (job: any) => {
      const { tenantId, timeRange, jobId } = job.data;

      logger.info('Processing anomaly detection job', { jobId });

      try {
        job.progress(10);

        const analysis = await predictiveAnalyticsEngine.detectAnomalies(
          tenantId,
          timeRange
        );

        job.progress(100);

        logger.info('Anomaly detection completed', { jobId });

        return {
          success: true,
          analysis,
          completedAt: new Date().toISOString(),
        };
      } catch (error) {
        logger.error('Anomaly detection job failed', { jobId, error });
        throw error;
      }
    });

    // ========================================
    // REPORT GENERATION QUEUE WORKER
    // ========================================

    reportQueue.process('generate', async (job: any) => {
      const { specification, tenantId, jobId } = job.data;

      logger.info('Processing report generation job', { jobId });

      try {
        job.progress(10);

        const report = await nlQueryEngine.generateReport(specification, tenantId);

        job.progress(100);

        logger.info('Report generation completed', { jobId });

        return {
          success: true,
          report,
          completedAt: new Date().toISOString(),
        };
      } catch (error) {
        logger.error('Report generation job failed', { jobId, error });
        throw error;
      }
    });

    // ========================================
    // QUEUE EVENT HANDLERS
    // ========================================

    const queues = [documentQueue, predictionQueue, reportQueue];

    queues.forEach((queue: any) => {
      queue.on('completed', (job: any, result: any) => {
        logger.info('Job completed', {
          queue: queue.name,
          jobId: job.id,
          result,
        });
      });

      queue.on('failed', (job: any, err: any) => {
        logger.error('Job failed', {
          queue: queue.name,
          jobId: job?.id,
          error: err,
        });
      });

      queue.on('stalled', (job: any) => {
        logger.warn('Job stalled', {
          queue: queue.name,
          jobId: job.id,
        });
      });

      queue.on('error', (error: any) => {
        logger.error('Queue error', {
          queue: queue.name,
          error,
        });
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, closing queues...');
      await Promise.all(queues.map((q: any) => q.close()));
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, closing queues...');
      await Promise.all(queues.map((q: any) => q.close()));
      process.exit(0);
    });

    logger.info('Queue workers initialized', {
      queues: [documentQueue, predictionQueue, reportQueue].map((q: any) => q.name),
    });
  } catch (e) {
    // Fail silently if bull not available
    logger = console;
    documentAnalysisEngine = { analyzeDocument: () => null, analyzeContract: () => null, compareDocuments: () => null };
    predictiveAnalyticsEngine = { predictClaimOutcome: () => null, predictTimeline: () => null, predictResourceAllocation: () => null, predictSettlementValue: () => null, detectAnomalies: () => null };
    nlQueryEngine = { generateReport: () => null };
  }
} else {
  // Provide no-op implementations during build
  logger = console;
  documentAnalysisEngine = { analyzeDocument: () => null, analyzeContract: () => null, compareDocuments: () => null };
  predictiveAnalyticsEngine = { predictClaimOutcome: () => null, predictTimeline: () => null, predictResourceAllocation: () => null, predictSettlementValue: () => null, detectAnomalies: () => null };
  nlQueryEngine = { generateReport: () => null };
}

// Helper functions to add jobs - only call when runtime is ready
export async function addDocumentAnalysisJob(data: {
  documentText: string;
  documentType?: string;
  tenantId: string;
  priority?: number;
}) {
  const job = await documentQueue.add(
    'analyze',
    {
      ...data,
      jobId: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    },
    {
      priority: data.priority || 5,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    }
  );

  return job;
}

export async function addContractAnalysisJob(data: {
  contractText: string;
  tenantId: string;
  priority?: number;
}) {
  const job = await documentQueue.add(
    'analyze-contract',
    {
      ...data,
      jobId: `contract-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    },
    {
      priority: data.priority || 5,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    }
  );

  return job;
}

export async function addOutcomePredictionJob(data: {
  claimData: any;
  tenantId: string;
  priority?: number;
}) {
  const job = await predictionQueue.add(
    'outcome',
    {
      ...data,
      jobId: `pred-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    },
    {
      priority: data.priority || 5,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    }
  );

  return job;
}

export async function addReportGenerationJob(data: {
  specification: string;
  tenantId: string;
  priority?: number;
}) {
  const job = await reportQueue.add(
    'generate',
    {
      ...data,
      jobId: `report-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    },
    {
      priority: data.priority || 5,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    }
  );

  return job;
}

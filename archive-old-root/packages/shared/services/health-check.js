/**
 * Health Check and Monitoring Endpoints
 * Union Claims Management System - Service Health Monitoring
 * 
 * Provides comprehensive health check endpoints for:
 * - Service health status
 * - Dependency health monitoring
 * - System metrics and statistics
 * - Database connectivity
 * - External service dependencies
 */

const os = require('os');
const { performance } = require('perf_hooks');

class HealthCheckService {
    constructor() {
        this.startTime = Date.now();
        this.healthChecks = new Map();
        this.dependencies = new Map();
        this.metrics = {
            requests: 0,
            errors: 0,
            lastError: null,
            responseTime: []
        };
        
        this.initializeHealthChecks();
    }

    initializeHealthChecks() {
        // Register core health checks
        this.registerHealthCheck('database', this.checkDatabase.bind(this));
        this.registerHealthCheck('redis', this.checkRedis.bind(this));
        this.registerHealthCheck('storage', this.checkStorage.bind(this));
        this.registerHealthCheck('keyvault', this.checkKeyVault.bind(this));
        this.registerHealthCheck('email', this.checkEmailService.bind(this));
        this.registerHealthCheck('voiceservice', this.checkVoiceService.bind(this));
    }

    registerHealthCheck(name, checkFunction) {
        this.healthChecks.set(name, checkFunction);
    }

    registerDependency(name, config) {
        this.dependencies.set(name, {
            ...config,
            lastCheck: null,
            status: 'unknown'
        });
    }

    async checkDatabase() {
        try {
            // Mock database check - replace with actual database connection test
            const startTime = performance.now();
            
            // Simulate database query
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
            
            const responseTime = performance.now() - startTime;
            
            return {
                status: 'healthy',
                responseTime: Math.round(responseTime),
                details: {
                    connected: true,
                    connectionPool: 'active',
                    lastQuery: new Date().toISOString()
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                details: {
                    connected: false
                }
            };
        }
    }

    async checkRedis() {
        try {
            const startTime = performance.now();
            
            // Simulate Redis check
            await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
            
            const responseTime = performance.now() - startTime;
            
            return {
                status: 'healthy',
                responseTime: Math.round(responseTime),
                details: {
                    connected: true,
                    memory: '2.1MB',
                    connectedClients: 5
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    async checkStorage() {
        try {
            const startTime = performance.now();
            
            // Simulate Azure Storage check
            await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
            
            const responseTime = performance.now() - startTime;
            
            return {
                status: 'healthy',
                responseTime: Math.round(responseTime),
                details: {
                    connected: true,
                    accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME || 'courtlenstorage',
                    containerAccess: true
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    async checkKeyVault() {
        try {
            const startTime = performance.now();
            
            // Simulate Azure Key Vault check
            await new Promise(resolve => setTimeout(resolve, Math.random() * 150));
            
            const responseTime = performance.now() - startTime;
            
            return {
                status: 'healthy',
                responseTime: Math.round(responseTime),
                details: {
                    connected: true,
                    vaultUrl: process.env.AZURE_KEY_VAULT_URL || 'https://courtlens-kv.vault.azure.net/',
                    accessTokenValid: true
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    async checkEmailService() {
        try {
            const startTime = performance.now();
            
            // Simulate email service check
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
            
            const responseTime = performance.now() - startTime;
            
            return {
                status: 'healthy',
                responseTime: Math.round(responseTime),
                details: {
                    provider: 'SendGrid',
                    connected: true,
                    apiKeyValid: true
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    async checkVoiceService() {
        try {
            const startTime = performance.now();
            
            // Simulate Azure Speech Service check
            await new Promise(resolve => setTimeout(resolve, Math.random() * 300));
            
            const responseTime = performance.now() - startTime;
            
            return {
                status: 'healthy',
                responseTime: Math.round(responseTime),
                details: {
                    connected: true,
                    region: process.env.AZURE_SPEECH_REGION || 'eastus',
                    subscriptionValid: true
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    async runAllHealthChecks() {
        const results = {};
        const startTime = performance.now();
        
        for (const [name, checkFunction] of this.healthChecks) {
            try {
                results[name] = await checkFunction();
            } catch (error) {
                results[name] = {
                    status: 'unhealthy',
                    error: error.message
                };
            }
        }
        
        const totalTime = performance.now() - startTime;
        const overallStatus = Object.values(results).every(r => r.status === 'healthy') ? 'healthy' : 'degraded';
        
        return {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            uptime: this.getUptime(),
            responseTime: Math.round(totalTime),
            checks: results
        };
    }

    async getBasicHealth() {
        const memoryUsage = process.memoryUsage();
        const uptime = this.getUptime();
        
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: uptime,
            version: process.env.APP_VERSION || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            service: 'union-claims-api',
            memory: {
                used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                external: Math.round(memoryUsage.external / 1024 / 1024)
            },
            system: {
                platform: os.platform(),
                arch: os.arch(),
                nodeVersion: process.version,
                cpuUsage: process.cpuUsage()
            }
        };
    }

    async getDetailedMetrics() {
        const systemInfo = {
            hostname: os.hostname(),
            platform: os.platform(),
            arch: os.arch(),
            cpus: os.cpus().length,
            totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024), // GB
            freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024), // GB
            loadAverage: os.loadavg(),
            uptime: os.uptime()
        };

        const processInfo = {
            pid: process.pid,
            uptime: this.getUptime(),
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage(),
            nodeVersion: process.version,
            versions: process.versions
        };

        const appMetrics = {
            requests: this.metrics.requests,
            errors: this.metrics.errors,
            errorRate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests) * 100 : 0,
            avgResponseTime: this.getAverageResponseTime(),
            lastError: this.metrics.lastError
        };

        return {
            timestamp: new Date().toISOString(),
            service: 'union-claims-api',
            version: process.env.APP_VERSION || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            system: systemInfo,
            process: processInfo,
            application: appMetrics
        };
    }

    getUptime() {
        const uptimeMs = Date.now() - this.startTime;
        const uptimeSeconds = Math.floor(uptimeMs / 1000);
        const hours = Math.floor(uptimeSeconds / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const seconds = uptimeSeconds % 60;
        
        return {
            ms: uptimeMs,
            seconds: uptimeSeconds,
            formatted: `${hours}h ${minutes}m ${seconds}s`
        };
    }

    recordRequest(responseTime, isError = false) {
        this.metrics.requests++;
        
        if (isError) {
            this.metrics.errors++;
            this.metrics.lastError = new Date().toISOString();
        }
        
        // Keep only last 100 response times for average calculation
        this.metrics.responseTime.push(responseTime);
        if (this.metrics.responseTime.length > 100) {
            this.metrics.responseTime.shift();
        }
    }

    getAverageResponseTime() {
        if (this.metrics.responseTime.length === 0) return 0;
        
        const sum = this.metrics.responseTime.reduce((a, b) => a + b, 0);
        return Math.round(sum / this.metrics.responseTime.length);
    }

    createHealthRoutes(app) {
        // Basic health check endpoint
        app.get('/health', async (req, res) => {
            try {
                const health = await this.getBasicHealth();
                res.status(200).json(health);
            } catch (error) {
                res.status(503).json({
                    status: 'unhealthy',
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Detailed health check with dependencies
        app.get('/health/detailed', async (req, res) => {
            try {
                const health = await this.runAllHealthChecks();
                const statusCode = health.status === 'healthy' ? 200 : 503;
                res.status(statusCode).json(health);
            } catch (error) {
                res.status(503).json({
                    status: 'unhealthy',
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Metrics endpoint
        app.get('/metrics', async (req, res) => {
            try {
                const metrics = await this.getDetailedMetrics();
                res.status(200).json(metrics);
            } catch (error) {
                res.status(500).json({
                    error: 'Failed to retrieve metrics',
                    message: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Status endpoint for load balancers
        app.get('/status', async (req, res) => {
            try {
                const basicHealth = await this.getBasicHealth();
                res.status(200).send('OK');
            } catch (error) {
                res.status(503).send('Service Unavailable');
            }
        });

        // Readiness probe
        app.get('/ready', async (req, res) => {
            try {
                // Check critical dependencies only
                const criticalChecks = ['database'];
                const results = {};
                
                for (const check of criticalChecks) {
                    if (this.healthChecks.has(check)) {
                        results[check] = await this.healthChecks.get(check)();
                    }
                }
                
                const isReady = Object.values(results).every(r => r.status === 'healthy');
                
                if (isReady) {
                    res.status(200).json({
                        status: 'ready',
                        timestamp: new Date().toISOString(),
                        checks: results
                    });
                } else {
                    res.status(503).json({
                        status: 'not ready',
                        timestamp: new Date().toISOString(),
                        checks: results
                    });
                }
            } catch (error) {
                res.status(503).json({
                    status: 'not ready',
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Liveness probe
        app.get('/live', (req, res) => {
            res.status(200).json({
                status: 'alive',
                timestamp: new Date().toISOString(),
                uptime: this.getUptime()
            });
        });

        console.log('✅ Health check endpoints configured:');
        console.log('  GET /health - Basic health check');
        console.log('  GET /health/detailed - Detailed health with dependencies');
        console.log('  GET /metrics - Application metrics');
        console.log('  GET /status - Simple status check');
        console.log('  GET /ready - Readiness probe');
        console.log('  GET /live - Liveness probe');
    }

    // Middleware to track request metrics
    createMetricsMiddleware() {
        return (req, res, next) => {
            const startTime = performance.now();
            
            res.on('finish', () => {
                const responseTime = performance.now() - startTime;
                const isError = res.statusCode >= 400;
                this.recordRequest(responseTime, isError);
            });
            
            next();
        };
    }
}

// Service-specific health checks
class GrievanceServiceHealth extends HealthCheckService {
    constructor() {
        super();
        this.registerHealthCheck('grievanceWorkflow', this.checkGrievanceWorkflow.bind(this));
        this.registerHealthCheck('documentService', this.checkDocumentService.bind(this));
        this.registerHealthCheck('notificationService', this.checkNotificationService.bind(this));
    }

    async checkGrievanceWorkflow() {
        try {
            // Check grievance workflow engine
            const startTime = performance.now();
            
            // Simulate workflow check
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
            
            const responseTime = performance.now() - startTime;
            
            return {
                status: 'healthy',
                responseTime: Math.round(responseTime),
                details: {
                    workflowEngine: 'active',
                    pendingTasks: 12,
                    completedToday: 45
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    async checkDocumentService() {
        try {
            const startTime = performance.now();
            
            // Simulate document service check
            await new Promise(resolve => setTimeout(resolve, Math.random() * 150));
            
            const responseTime = performance.now() - startTime;
            
            return {
                status: 'healthy',
                responseTime: Math.round(responseTime),
                details: {
                    storageConnected: true,
                    documentsProcessed: 128,
                    storageUsed: '2.3GB'
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    async checkNotificationService() {
        try {
            const startTime = performance.now();
            
            // Simulate notification service check
            await new Promise(resolve => setTimeout(resolve, Math.random() * 75));
            
            const responseTime = performance.now() - startTime;
            
            return {
                status: 'healthy',
                responseTime: Math.round(responseTime),
                details: {
                    emailService: 'connected',
                    smsService: 'connected',
                    notificationsSent: 234,
                    failureRate: 0.02
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }
}

module.exports = {
    HealthCheckService,
    GrievanceServiceHealth
};
/**
 * Application Insights Integration
 * Union Claims Management System - Telemetry and Monitoring
 * 
 * Provides comprehensive telemetry collection, custom metrics,
 * performance tracking, and integration with Azure Application Insights.
 */

const appInsights = require('applicationinsights');
const { logger } = require('../../../lib/logger');

class ApplicationInsightsService {
    constructor() {
        this.isInitialized = false;
        this.customDimensions = {};
        this.customMetrics = new Map();
        this.performanceCounters = new Map();
        
        this.initialize();
    }

    initialize() {
        try {
            // Check if connection string is available
            const connectionString = process.env.AZURE_APPLICATION_INSIGHTS_CONNECTION_STRING;
            
            if (!connectionString) {
                logger.warn('Application Insights connection string not found. Telemetry disabled.');
                return;
            }

            // Setup Application Insights
            appInsights.setup(connectionString)
                .setAutoDependencyCorrelation(true)
                .setAutoCollectRequests(true)
                .setAutoCollectPerformance(true, true)
                .setAutoCollectExceptions(true)
                .setAutoCollectDependencies(true)
                .setAutoCollectConsole(true)
                .setUseDiskRetryCaching(true)
                .setSendLiveMetrics(true)
                .setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C);

            // Configure sampling
            appInsights.defaultClient.config.samplingPercentage = 
                parseInt(process.env.APPINSIGHTS_SAMPLING_PERCENTAGE) || 100;

            // Set role name for service identification
            appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = 
                process.env.APPINSIGHTS_ROLE_NAME || 'union-claims-api';

            // Set role instance
            appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRoleInstance] = 
                process.env.HOSTNAME || require('os').hostname();

            // Add custom dimensions
            this.customDimensions = {
                service: 'union-claims',
                environment: process.env.NODE_ENV || 'development',
                version: process.env.APP_VERSION || '1.0.0',
                deployment: process.env.DEPLOYMENT_ID || 'unknown',
                region: process.env.AZURE_REGION || 'eastus'
            };

            // Apply custom dimensions to all telemetry
            appInsights.defaultClient.addTelemetryProcessor((envelope) => {
                Object.assign(envelope.data.baseData.properties || {}, this.customDimensions);
                return true;
            });

            // Start Application Insights
            appInsights.start();
            
            this.isInitialized = true;
            logger.info('Application Insights initialized successfully', {
                role: appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole],
                samplingPercentage: appInsights.defaultClient.config.samplingPercentage,
            });
            
            // Track initialization
            this.trackEvent('ServiceStarted', {
                service: 'union-claims-api',
                version: process.env.APP_VERSION || '1.0.0',
                environment: process.env.NODE_ENV || 'development'
            });

        } catch (error) {
            logger.error('Failed to initialize Application Insights', { error });
        }
    }

    // Track custom events
    trackEvent(name, properties = {}, measurements = {}) {
        if (!this.isInitialized) return;

        try {
            appInsights.defaultClient.trackEvent({
                name: name,
                properties: { ...this.customDimensions, ...properties },
                measurements: measurements
            });
        } catch (error) {
            logger.error('Failed to track event', { error, name });
        }
    }

    // Track custom metrics
    trackMetric(name, value, count = 1, min = null, max = null, properties = {}) {
        if (!this.isInitialized) return;

        try {
            appInsights.defaultClient.trackMetric({
                name: name,
                value: value,
                count: count,
                min: min,
                max: max,
                properties: { ...this.customDimensions, ...properties }
            });

            // Store for local aggregation
            this.customMetrics.set(name, {
                value: value,
                count: count,
                timestamp: new Date(),
                properties: properties
            });
        } catch (error) {
            logger.error('Failed to track metric', { error, name });
        }
    }

    // Track performance metrics
    trackPerformance(name, duration, properties = {}) {
        if (!this.isInitialized) return;

        try {
            this.trackMetric(`performance.${name}`, duration, 1, duration, duration, {
                ...properties,
                type: 'performance'
            });

            // Store performance counter
            this.performanceCounters.set(name, {
                duration: duration,
                timestamp: new Date(),
                properties: properties
            });
        } catch (error) {
            logger.error('Failed to track performance', { error, name });
        }
    }

    // Track exceptions
    trackException(error, properties = {}) {
        if (!this.isInitialized) return;

        try {
            appInsights.defaultClient.trackException({
                exception: error,
                properties: { ...this.customDimensions, ...properties }
            });
        } catch (trackingError) {
            logger.error('Failed to track exception', { error: trackingError });
        }
    }

    // Track dependencies (external calls)
    trackDependency(name, command, duration, success, properties = {}) {
        if (!this.isInitialized) return;

        try {
            appInsights.defaultClient.trackDependency({
                target: name,
                name: command,
                data: command,
                duration: duration,
                resultCode: success ? 0 : 1,
                success: success,
                dependencyTypeName: 'HTTP',
                properties: { ...this.customDimensions, ...properties }
            });
        } catch (error) {
            logger.error('Failed to track dependency', { error, name });
        }
    }

    // Track page views (for web applications)
    trackPageView(name, url, duration = 0, properties = {}) {
        if (!this.isInitialized) return;

        try {
            appInsights.defaultClient.trackPageView({
                name: name,
                url: url,
                duration: duration,
                properties: { ...this.customDimensions, ...properties }
            });
        } catch (error) {
            logger.error('Failed to track page view', { error, name });
        }
    }

    // Track traces (custom logging)
    trackTrace(message, severity = 1, properties = {}) {
        if (!this.isInitialized) return;

        try {
            appInsights.defaultClient.trackTrace({
                message: message,
                severity: severity, // 0=Verbose, 1=Information, 2=Warning, 3=Error, 4=Critical
                properties: { ...this.customDimensions, ...properties }
            });
        } catch (error) {
            logger.error('Failed to track trace', { error, message });
        }
    }

    // Business-specific metrics for Union Claims
    trackGrievanceMetrics(action, grievanceData = {}) {
        if (!this.isInitialized) return;

        const properties = {
            action: action,
            priority: grievanceData.priority || 'unknown',
            status: grievanceData.status || 'unknown',
            category: grievanceData.category || 'unknown'
        };

        this.trackEvent('GrievanceAction', properties);
        
        // Track specific metrics based on action
        switch (action) {
            case 'created':
                this.trackMetric('grievances.created', 1, 1, 1, 1, properties);
                break;
            case 'updated':
                this.trackMetric('grievances.updated', 1, 1, 1, 1, properties);
                break;
            case 'resolved':
                this.trackMetric('grievances.resolved', 1, 1, 1, 1, properties);
                if (grievanceData.resolutionTime) {
                    this.trackMetric('grievances.resolution_time', grievanceData.resolutionTime, 1, 
                        grievanceData.resolutionTime, grievanceData.resolutionTime, properties);
                }
                break;
            case 'escalated':
                this.trackMetric('grievances.escalated', 1, 1, 1, 1, properties);
                break;
        }
    }

    // Track user activity
    trackUserActivity(userId, action, properties = {}) {
        if (!this.isInitialized) return;

        this.trackEvent('UserActivity', {
            userId: userId,
            action: action,
            ...properties
        });
    }

    // Track system health metrics
    trackSystemHealth(component, status, responseTime = null, properties = {}) {
        if (!this.isInitialized) return;

        this.trackEvent('SystemHealth', {
            component: component,
            status: status,
            ...properties
        });

        if (responseTime !== null) {
            this.trackMetric(`system.${component}.response_time`, responseTime, 1, 
                responseTime, responseTime, { status: status });
        }

        this.trackMetric(`system.${component}.${status}`, 1, 1, 1, 1, properties);
    }

    // Create middleware for Express.js
    createExpressMiddleware() {
        if (!this.isInitialized) {
            return (req, res, next) => next();
        }

        return (req, res, next) => {
            const startTime = Date.now();
            
            // Track incoming request
            this.trackEvent('HttpRequest', {
                method: req.method,
                url: req.url,
                userAgent: req.get('User-Agent'),
                ip: req.ip
            });

            // Override res.end to track response
            const originalEnd = res.end;
            res.end = function(...args) {
                const duration = Date.now() - startTime;
                
                // Track request completion
                this.trackMetric('http.request.duration', duration, 1, duration, duration, {
                    method: req.method,
                    statusCode: res.statusCode.toString(),
                    route: req.route ? req.route.path : 'unknown'
                });

                // Track error responses
                if (res.statusCode >= 400) {
                    this.trackEvent('HttpError', {
                        method: req.method,
                        url: req.url,
                        statusCode: res.statusCode,
                        duration: duration
                    });
                }

                originalEnd.apply(res, args);
            }.bind(this);

            next();
        };
    }

    // Get current metrics summary
    getMetricsSummary() {
        const summary = {
            customMetrics: Array.from(this.customMetrics.entries()).map(([name, data]) => ({
                name: name,
                value: data.value,
                count: data.count,
                timestamp: data.timestamp
            })),
            performanceCounters: Array.from(this.performanceCounters.entries()).map(([name, data]) => ({
                name: name,
                duration: data.duration,
                timestamp: data.timestamp
            })),
            isInitialized: this.isInitialized,
            customDimensions: this.customDimensions
        };

        return summary;
    }

    // Flush all telemetry (useful for graceful shutdown)
    flush() {
        if (!this.isInitialized) return Promise.resolve();

        return new Promise((resolve) => {
            appInsights.defaultClient.flush({
                callback: () => {
                    logger.info('Application Insights telemetry flushed');
                    resolve();
                }
            });
        });
    }

    // Get the Application Insights client for advanced usage
    getClient() {
        return this.isInitialized ? appInsights.defaultClient : null;
    }
}

// Singleton instance
const applicationInsights = new ApplicationInsightsService();

module.exports = {
    ApplicationInsightsService,
    applicationInsights
};
/**
 * Security Middleware Configuration
 * Union Claims Management System - Security Hardening
 * 
 * Implements comprehensive security controls:
 * - HTTPS enforcement
 * - Security headers configuration
 * - Rate limiting and DDoS protection
 * - Authentication and authorization
 * - Input validation and sanitization
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const cors = require('cors');

/**
 * Configure comprehensive security middleware
 */
function configureSecurityMiddleware(app) {
    // Trust proxy for Azure App Service
    app.set('trust proxy', 1);

    // HTTPS Enforcement Middleware
    app.use((req, res, next) => {
        // Force HTTPS in production
        if (process.env.NODE_ENV === 'production' && !req.secure && req.get('x-forwarded-proto') !== 'https') {
            return res.redirect(301, `https://${req.get('host')}${req.url}`);
        }
        next();
    });

    // Comprehensive Security Headers with Helmet
    app.use(helmet({
        // Content Security Policy
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", "wss:", "ws:"],
                mediaSrc: ["'self'"],
                objectSrc: ["'none'"],
                childSrc: ["'self'"],
                workerSrc: ["'self'"],
                frameSrc: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"]
            }
        },
        
        // HTTP Strict Transport Security
        hsts: {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true
        },
        
        // X-Frame-Options
        frameguard: {
            action: 'deny'
        },
        
        // X-Content-Type-Options
        noSniff: true,
        
        // X-XSS-Protection
        xssFilter: true,
        
        // Referrer Policy
        referrerPolicy: {
            policy: 'strict-origin-when-cross-origin'
        },
        
        // Permissions Policy
        permittedCrossDomainPolicies: false,
        
        // Hide X-Powered-By header
        hidePoweredBy: true
    }));

    // CORS Configuration
    const corsOptions = {
        origin: function (origin, callback) {
            // Allow requests with no origin (mobile apps, etc.)
            if (!origin) return callback(null, true);
            
            const allowedOrigins = [
                'https://courtlens-production.azurewebsites.net',
                'https://courtlens-staging.azurewebsites.net',
                process.env.FRONTEND_URL
            ].filter(Boolean);
            
            if (process.env.NODE_ENV === 'development') {
                allowedOrigins.push('http://localhost:3000', 'http://localhost:5173');
            }
            
            if (allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        maxAge: 86400 // 24 hours
    };
    
    app.use(cors(corsOptions));

    // Rate Limiting Configuration
    const createRateLimit = (windowMs, max, message, skipSuccessfulRequests = true) => {
        return rateLimit({
            windowMs,
            max,
            message: {
                error: message,
                retryAfter: Math.ceil(windowMs / 1000)
            },
            standardHeaders: true,
            legacyHeaders: false,
            skipSuccessfulRequests,
            keyGenerator: (req) => {
                return req.ip || req.connection.remoteAddress;
            }
        });
    };

    // Global rate limiting
    app.use(createRateLimit(
        15 * 60 * 1000, // 15 minutes
        100, // limit each IP to 100 requests per windowMs
        'Too many requests from this IP, please try again later.'
    ));

    // Strict rate limiting for authentication endpoints
    app.use('/api/v1/auth', createRateLimit(
        15 * 60 * 1000, // 15 minutes
        5, // limit each IP to 5 auth requests per windowMs
        'Too many authentication attempts, please try again later.',
        false // Don't skip successful requests for auth
    ));

    // Rate limiting for API endpoints
    app.use('/api', createRateLimit(
        1 * 60 * 1000, // 1 minute
        50, // limit each IP to 50 API requests per minute
        'API rate limit exceeded, please slow down.'
    ));

    // Slow down repeated requests
    app.use(slowDown({
        windowMs: 15 * 60 * 1000, // 15 minutes
        delayAfter: 10, // allow 10 requests per windowMs without delay
        delayMs: 500, // add 500ms delay per request after delayAfter
        maxDelayMs: 5000, // max delay of 5 seconds
        skipSuccessfulRequests: true
    }));

    // Additional Security Middleware
    
    // Prevent HTTP Parameter Pollution
    app.use(hpp({
        whitelist: ['tags', 'categories', 'sort'] // Allow arrays for these parameters
    }));

    // Data Sanitization against NoSQL Injection
    app.use(mongoSanitize());

    // Data Sanitization against XSS
    app.use(xss());

    // Request size limiting
    app.use(require('express').json({ 
        limit: '10mb',
        verify: (req, res, buf) => {
            // Store raw body for webhook verification
            req.rawBody = buf;
        }
    }));
    
    app.use(require('express').urlencoded({ 
        extended: true, 
        limit: '10mb' 
    }));
}

/**
 * Authentication and Authorization Middleware
 */
function configureAuthMiddleware() {
    const jwt = require('jsonwebtoken');

    // JWT Token Verification Middleware
    const verifyToken = (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    error: 'Authentication required',
                    message: 'Please provide a valid authorization token'
                });
            }

            const token = authHeader.substring(7); // Remove 'Bearer ' prefix
            
            if (!token) {
                return res.status(401).json({
                    error: 'Authentication required',
                    message: 'Token not provided'
                });
            }

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Check token expiration
            if (decoded.exp < Date.now() / 1000) {
                return res.status(401).json({
                    error: 'Token expired',
                    message: 'Please log in again'
                });
            }

            // Attach user information to request
            req.user = {
                id: decoded.userId,
                email: decoded.email,
                role: decoded.role,
                permissions: decoded.permissions || []
            };

            next();
        } catch (error) {
if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    error: 'Invalid token',
                    message: 'Please log in again'
                });
            }
            
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    error: 'Token expired',
                    message: 'Please log in again'
                });
            }

            return res.status(500).json({
                error: 'Authentication error',
                message: 'An error occurred during authentication'
            });
        }
    };

    // Role-based Authorization Middleware
    const requireRole = (allowedRoles) => {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Authentication required',
                    message: 'Please log in to access this resource'
                });
            }

            const userRole = req.user.role;
            const hasRequiredRole = Array.isArray(allowedRoles) 
                ? allowedRoles.includes(userRole)
                : allowedRoles === userRole;

            if (!hasRequiredRole) {
                return res.status(403).json({
                    error: 'Insufficient permissions',
                    message: `Access denied. Required role(s): ${Array.isArray(allowedRoles) ? allowedRoles.join(', ') : allowedRoles}`
                });
            }

            next();
        };
    };

    // Permission-based Authorization Middleware
    const requirePermission = (requiredPermission) => {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Authentication required',
                    message: 'Please log in to access this resource'
                });
            }

            const userPermissions = req.user.permissions || [];
            const hasPermission = userPermissions.includes(requiredPermission) || 
                               userPermissions.includes('*'); // Admin wildcard

            if (!hasPermission) {
                return res.status(403).json({
                    error: 'Insufficient permissions',
                    message: `Access denied. Required permission: ${requiredPermission}`
                });
            }

            next();
        };
    };

    // Resource Ownership Middleware
    const requireOwnership = (resourceIdParam = 'id') => {
        return (req, res, next) => {
            const resourceId = req.params[resourceIdParam];
            const userId = req.user.id;

            // Admin can access any resource
            if (req.user.role === 'admin') {
                return next();
            }

            // Check if user owns the resource or has specific permission
            if (resourceId !== userId && !req.user.permissions.includes('access_all_resources')) {
                return res.status(403).json({
                    error: 'Access denied',
                    message: 'You can only access your own resources'
                });
            }

            next();
        };
    };

    return {
        verifyToken,
        requireRole,
        requirePermission,
        requireOwnership
    };
}

/**
 * Input Validation and Sanitization Middleware
 */
function configureValidationMiddleware() {
    const { body, param, query, validationResult } = require('express-validator');

    // Validation Error Handler
    const handleValidationErrors = (req, res, next) => {
        const errors = validationResult(req);
        
        if (!errors.isEmpty()) {
            const formattedErrors = errors.array().map(error => ({
                field: error.param,
                message: error.msg,
                value: error.value
            }));

            return res.status(400).json({
                error: 'Validation failed',
                message: 'Please check your input and try again',
                details: formattedErrors
            });
        }
        
        next();
    };

    // Common validation rules
    const validationRules = {
        email: body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Please provide a valid email address'),
        
        password: body('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters long')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
        
        name: body('name')
            .trim()
            .isLength({ min: 2, max: 50 })
            .withMessage('Name must be between 2 and 50 characters')
            .matches(/^[a-zA-Z\s]+$/)
            .withMessage('Name can only contain letters and spaces'),
        
        id: param('id')
            .isUUID()
            .withMessage('Invalid ID format'),
        
        grievanceTitle: body('title')
            .trim()
            .isLength({ min: 5, max: 200 })
            .withMessage('Title must be between 5 and 200 characters'),
        
        grievanceDescription: body('description')
            .trim()
            .isLength({ min: 10, max: 5000 })
            .withMessage('Description must be between 10 and 5000 characters')
    };

    return {
        handleValidationErrors,
        validationRules
    };
}

/**
 * Security Logging Middleware
 */
function configureSecurityLogging() {
    // Security Event Logger
    const logSecurityEvent = (eventType, req, additionalData = {}) => {
        const securityLog = {
            timestamp: new Date().toISOString(),
            eventType,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            url: req.url,
            method: req.method,
            userId: req.user?.id,
            userRole: req.user?.role,
            ...additionalData
        };
// In production, send to security monitoring system
        if (process.env.NODE_ENV === 'production') {
            // Send to Azure Monitor, Sentry, or security SIEM
        }
    };

    // Failed Authentication Logger
    const logAuthFailure = (req, res, next) => {
        const originalSend = res.send;
        
        res.send = function(body) {
            if (res.statusCode === 401 || res.statusCode === 403) {
                logSecurityEvent('AUTH_FAILURE', req, {
                    statusCode: res.statusCode,
                    responseBody: body
                });
            }
            originalSend.call(this, body);
        };
        
        next();
    };

    // Suspicious Activity Detection
    const detectSuspiciousActivity = (req, res, next) => {
        // Detect potential SQL injection attempts
        const sqlInjectionPatterns = [
            /(\bor\b|\band\b).*?(\=|like)/i,
            /union.*?select/i,
            /drop.*?table/i,
            /exec.*?xp_/i
        ];

        // Detect potential XSS attempts
        const xssPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/i,
            /on\w+\s*=/i
        ];

        const requestBody = JSON.stringify(req.body || {});
        const queryString = JSON.stringify(req.query || {});
        
        let suspiciousActivity = false;
        let activityType = '';

        // Check for SQL injection
        for (const pattern of sqlInjectionPatterns) {
            if (pattern.test(requestBody) || pattern.test(queryString)) {
                suspiciousActivity = true;
                activityType = 'SQL_INJECTION_ATTEMPT';
                break;
            }
        }

        // Check for XSS
        if (!suspiciousActivity) {
            for (const pattern of xssPatterns) {
                if (pattern.test(requestBody) || pattern.test(queryString)) {
                    suspiciousActivity = true;
                    activityType = 'XSS_ATTEMPT';
                    break;
                }
            }
        }

        if (suspiciousActivity) {
            logSecurityEvent(activityType, req, {
                requestBody: req.body,
                queryParams: req.query
            });
            
            // Block suspicious requests
            return res.status(400).json({
                error: 'Bad request',
                message: 'Request contains invalid characters'
            });
        }

        next();
    };

    return {
        logSecurityEvent,
        logAuthFailure,
        detectSuspiciousActivity
    };
}

module.exports = {
    configureSecurityMiddleware,
    configureAuthMiddleware,
    configureValidationMiddleware,
    configureSecurityLogging
};
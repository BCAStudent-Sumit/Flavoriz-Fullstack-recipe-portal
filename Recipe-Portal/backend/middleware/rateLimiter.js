const rateLimit = require('express-rate-limit');

// Rate limiter for sensitive authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // 60 attempts per 15 minutes window
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    error: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

// General rate limiter for standard API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP. Please try again later.',
  },
});

// Strict limiter for AI generation endpoints
const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // 20 requests per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'AI request limit reached. Please wait a few minutes before trying again.',
  },
});

module.exports = {
  authLimiter,
  apiLimiter,
  aiLimiter,
};

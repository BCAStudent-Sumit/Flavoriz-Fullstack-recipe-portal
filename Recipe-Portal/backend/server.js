// server.js / app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();
const connectDB = require('./config/db');
const { apiLimiter } = require('./middleware/rateLimiter');
const setupSwagger = require('./docs/swagger');

const app = express();
connectDB();

// 1. HTTP Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://res.cloudinary.com",
          "https://images.unsplash.com",
          "https://via.placeholder.com",
          "https://api.dicebear.com",
        ],
        connectSrc: [
          "'self'",
          "http://localhost:5000",
          "https://generativelanguage.googleapis.com",
          "https://api.openai.com",
        ],
        frameAncestors: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// 2. CORS & JSON Body Parsing
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3. API Rate Limiting
app.use('/api', apiLimiter);

// 4. Static file serving (Uploaded media & Frontend assets)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const frontendPath = path.join(__dirname, '..', 'Frontend');
app.use(express.static(frontendPath, { index: 'landing.html' }));

// 5. Interactive Swagger / OpenAPI Documentation
setupSwagger(app);

// 6. Application Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/recipes', require('./routes/recipeRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/assistant', require('./routes/assistantRoutes')); // Chef Flavo AI assistant
app.use('/api/ai', require('./routes/ai')); // Chef Flavo recipe auto-fill

// Root route fallback
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'landing.html'));
});

// Centralized error-handling middleware
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
});

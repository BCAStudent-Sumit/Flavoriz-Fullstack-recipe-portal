// server.js / app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const connectDB = require('./config/db');

const app = express();
connectDB();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serves uploaded images

// Serve frontend static files (default to landing.html for root)
const frontendPath = path.join(__dirname, '..', 'Frontend');
app.use(express.static(frontendPath, { index: 'landing.html' }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/recipes', require('./routes/recipeRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/assistant', require('./routes/assistantRoutes')); // Chef Flavo AI assistant
app.use('/api/ai', require('./routes/ai')); // Chef Flavo recipe auto-fill

// Root route serves landing.html
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'landing.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

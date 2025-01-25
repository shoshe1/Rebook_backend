const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const dotenv = require('dotenv');

// Route Imports
const bookRoutes = require('./routes/bookRoutes');
const userRoutes = require('./routes/userRoutes');
const studyRoomRoutes = require('./routes/studtRoomRoutes');

// Load environment variables
dotenv.config();

const app = express();
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://project-client-side-web.onrender.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Apply CORS middleware
app.use(
  cors({
    origin: [
      'http://localhost:3000', // Local React development
      'https://project-client-side-web.onrender.com', // Production React app
    ],
    credentials: true, // Allow credentials (cookies, auth headers)
  })
);

// Apply security headers with Helmet (CSP temporarily disabled for debugging)
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable CSP temporarily for debugging
  })
);

// Middleware for parsing JSON and serving static files
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((error) => console.log('MongoDB connection failed:', error));

// API Routes (ensure these come after the middleware)
app.use('/api/books', bookRoutes); 
app.use('/api/users', userRoutes); 
app.use('/api/studyrooms', studyRoomRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
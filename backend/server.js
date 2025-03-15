const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Route Imports
const bookRoutes = require('./routes/bookRoutes');
const userRoutes = require('./routes/userRoutes');
const studyRoomRoutes = require('./routes/studtRoomRoutes'); // Fixed typo
const notificationRoutes = require('./routes/notificationRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes'); 

const app = express();
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: [
          "'self'",
          'http://localhost:5000', // Local backend URL
          'http://localhost:3000', // Local frontend URL
          'https://project-client-side-rjgz.onrender.com', // New Render URL
          'https://rebook-backend-ldmy.onrender.com', // Backend URL
        ],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", 'https://rebook-backend-ldmy.onrender.com'], // Allow images from backend
      },
    },
  })
);

// CORS Configuration
app.use(
  cors({
    origin: [
      'http://localhost:3000', // Local React development
      'http://localhost:5000', // Local Electron app
      'https://project-client-side-rjgz.onrender.com', // New Render URL
      'https://rebook-backend-ldmy.onrender.com', // Backend URL
    ],
    credentials: true, // Allow cookies or authorization headers
  })
);

// Middleware for parsing JSON
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((error) => console.log('MongoDB connection failed:', error));

// API Routes
app.use('/api/books', bookRoutes); // Routes for books
app.use('/api/users', userRoutes); // Routes for users
app.use('/api/studyrooms', studyRoomRoutes); // Routes for study rooms
app.use('/api', notificationRoutes);
app.use('/', deliveryRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: err.message });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
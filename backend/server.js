const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const { initBucket } = require('./middleware/gridfs-setup');

// Load environment variables
dotenv.config();

// Route Imports
const bookRoutes = require('./routes/bookRoutes');
const userRoutes = require('./routes/userRoutes');
const studyRoomRoutes = require('./routes/studtRoomRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes'); 

const app = express();
// Middleware to add CORS headers for image files
app.use((req, res, next) => {
  // Check if the request is for an image or file
  if (req.path.includes('/photo/') || req.path.includes('/uploads/')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
  next();
});
// Create temp uploads directory if it doesn't exist
const tempUploadsDir = path.join(__dirname, 'temp-uploads');
if (!fs.existsSync(tempUploadsDir)) {
  fs.mkdirSync(tempUploadsDir, { recursive: true });
}

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Security Headers with Helmet
// Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: [
          "'self'",
          'http://localhost:5000',
          'http://localhost:3000',
          'https://project-client-side-rjgz.onrender.com',
          'https://rebook-backend-ldmy.onrender.com',
        ],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: [
          "'self'", 
          "data:", 
          'http://localhost:5000', 
          'https://rebook-backend-ldmy.onrender.com'
        ]
      }
    },
    // Add crossOriginResourcePolicy as a separate option, not inside directives
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

// CORS Configuration
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5000',
      'https://project-client-side-rjgz.onrender.com',
      'https://rebook-backend-ldmy.onrender.com',
    ],
    credentials: true,
    exposedHeaders: ['Content-Disposition', 'Content-Type'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS' ,'PATCH']
  })
);

// Middleware for parsing JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Add this for form data parsing

// Connect to MongoDB before setting up routes
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    
    // Initialize GridFS after MongoDB connection is established
    initBucket();
    
    // Setup routes AFTER MongoDB and GridFS are initialized
    setupRoutes();
  })
  .catch((error) => {
    console.log('MongoDB connection failed:', error);
    process.exit(1); // Exit the application if MongoDB connection fails
  });

function setupRoutes() {
  // API Routes
  app.use('/api/books', bookRoutes); // Routes for books
  app.use('/api/users', userRoutes); // Routes for users
  app.use('/api/studyrooms', studyRoomRoutes); // Routes for study rooms
  app.use('/api', notificationRoutes);
  app.use('/', deliveryRoutes);
  
  // Test route for GridFS
  app.get('/test-gridfs', (req, res) => {
    try {
      const bucket = initBucket();
      if (bucket) {
        res.json({ success: true, message: 'GridFS is working properly' });
      } else {
        res.status(500).json({ success: false, message: 'GridFS is not initialized' });
      }
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });
  
  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ error: err.message });
  });
  
  // Start the server after routes are set up
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

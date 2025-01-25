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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: [
          "'self'",
          'https://rebook-backend-ldmy.onrender.com', // Backend API URL
          'https://project-client-side.onrender.com', // Frontend URL
        ],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
      },
    },
  })
);

// Enable CORS for all origins
app.use(cors());

// Alternatively, allow specific origins only
app.use(cors({
  origin: 'https://project-client-side-web.onrender.com'
}));

app.get('/api/books', (req, res) => {
  res.json({ message: 'Books data' });
});


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
app.use('/api/studyrooms',studyRoomRoutes); // Uncomment if needed

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

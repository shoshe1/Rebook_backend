const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

const bookRoutes = require('./routes/bookRoutes');
const userRoutes = require('./routes/userRoutes');
// const studyRoomRoutes = require('./routes/studyRoomRoutes');

dotenv.config();

const app = express();

app.use(
  helmet({
      contentSecurityPolicy: {
          directives: {
              defaultSrc: ["'self'"],
              connectSrc: ["'self'", 'https://rebook-backend-ldmy.onrender.com'], // Allow API calls from your frontend
              scriptSrc: ["'self'", "'unsafe-inline'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", "data:"],
          },
      },
  })
);
app.use(cors({
  origin: 'https://project-client-side.onrender.com', // Replace with your frontend Render URL
}));
// app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((error) => console.log('MongoDB connection failed:', error));

app.use('/api/books', bookRoutes);
app.use('/api/users', userRoutes);
// app.use('/api/studyrooms', studyRoomRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// const bookRoutes = require('./routes/bookRoutes');
// const userRoutes = require('./routes/userRoutes');
// const studyRoomRoutes = require('./routes/studyRoomRoutes');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((error) => console.log('MongoDB connection failed:', error));

// app.use('/api/books', bookRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/studyrooms', studyRoomRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const mongoose = require('mongoose');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
require('dotenv').config();

// MongoDB Connection URI
const mongoURI = process.env.MONGODB_URI;

// Create MongoDB connection
const conn = mongoose.createConnection(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let gfs;
conn.once('open', () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads'); // Collection name in MongoDB
  console.log('GridFS initialized');
});

// Setup GridFS storage for multer
const storage = new GridFsStorage({
  url: mongoURI,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, file) => {
    return {
      filename: `${Date.now()}-${file.originalname}`,
      bucketName: 'uploads', // Matches GridFS collection name
    };
  },
});

const upload = multer({ storage });

// Create a model for attachments if needed
const AttachmentSchema = new mongoose.Schema({
  filename: String,
  fileId: mongoose.Schema.Types.ObjectId,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Attachment = mongoose.model('Attachment', AttachmentSchema);

module.exports = { gfs, upload, Attachment };

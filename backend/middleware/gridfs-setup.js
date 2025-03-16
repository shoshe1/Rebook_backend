const mongoose = require('mongoose');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
require('dotenv').config();

// MongoDB Connection URI
const mongoURI = process.env.MONGODB_URI;

// Use the existing mongoose connection instead of creating a new one
const conn = mongoose.connection;

let gfs;
// Initialize gfs after mongoose connection is ready
mongoose.connection.once('open', () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads'); // Collection name in MongoDB
  console.log('GridFS initialized');
});

// Setup GridFS storage for multer
const storage = new GridFsStorage({
  url: mongoURI,
  // Remove deprecated options
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      const filename = `${Date.now()}-${file.originalname}`;
      const fileInfo = {
        filename: filename,
        bucketName: 'uploads', // Matches GridFS collection name
        metadata: { originalname: file.originalname }
      };
      resolve(fileInfo);
    });
  }
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

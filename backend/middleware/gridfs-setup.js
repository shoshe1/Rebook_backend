const mongoose = require('mongoose');
const multer = require('multer');
const { GridFSBucket } = require('mongodb');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

// Set up GridFS
let bucket;

// Initialize connection once mongoose is connected
mongoose.connection.once('open', () => {
  console.log('MongoDB connected, initializing GridFS...');
  bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
  console.log('GridFS bucket initialized');
});

mongoose.connection.on('error', (err) => {
  console.error('Error connecting to MongoDB:', err);
});

// Set up multer storage engine for GridFS
const storage = multer.memoryStorage();

// Configure multer
const multerUpload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Custom upload middleware to handle GridFS storage
const upload = {
  single: (fieldName) => {
    return (req, res, next) => {
      multerUpload.single(fieldName)(req, res, async (err) => {
        if (err) {
          console.error('Error in multer upload:', err);
          return next(err);
        }

        if (!req.file) {
          console.log('No file uploaded');
          return next();
        }

        console.log('File received:', req.file);

        try {
          const filename = crypto.randomBytes(16).toString('hex') + path.extname(req.file.originalname);
          
          // Create a stream to upload to GridFS
          const writeStream = bucket.openUploadStream(filename, {
            contentType: req.file.mimetype,
            metadata: {
              originalname: req.file.originalname,
              uploadDate: new Date(),
              user: req.user ? req.user._id : 'anonymous'
            }
          });
          
          // Write the file buffer to the stream
          writeStream.write(req.file.buffer);
          writeStream.end();
          
          await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
          });
          
          req.file.id = writeStream.id;
          req.file.filename = filename;
          
          console.log(`File uploaded to GridFS with ID: ${writeStream.id}`);
          next();
        } catch (error) {
          console.error('Error uploading to GridFS:', error);
          next(error);
        }
      });
    };
  }
};

// Function to find a file by ID in GridFS
const findFileById = async (id) => {
  try {
    const _id = typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
    const files = await bucket.find({ _id }).toArray();
    return files[0] || null;
  } catch (err) {
    console.error('Error finding file by ID:', err);
    return null;
  }
};

// Function to create a read stream for a file in GridFS
const createReadStream = (id) => {
  try {
    const _id = typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
    return bucket.openDownloadStream(_id);
  } catch (err) {
    console.error('Error creating read stream:', err);
    return null;
  }
};

// Interface for accessing GridFS functions
const gfsInterface = {
  files: {
    findOne: findFileById
  },
  createReadStream
};

module.exports = { 
  upload, 
  gfs: gfsInterface, 
  Attachment: {
    findById: findFileById,
    read: ({ _id }) => createReadStream(_id)
  }
};

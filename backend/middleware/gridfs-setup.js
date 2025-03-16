const mongoose = require('mongoose');
const multer = require('multer');
const { GridFSBucket } = require('mongodb');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

// Set up GridFS
let gfs;
let bucket;

// Initialize connection once mongoose is connected
mongoose.connection.once('open', () => {
  // Initialize GridFS stream
  bucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: 'uploads'
  });
  console.log('GridFS bucket initialized');
});

// Set up multer storage engine for GridFS
const storage = multer.memoryStorage();

// Configure multer
const multerUpload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Accept images only
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

        try {
          // Create a unique filename
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
          
          // Wait for the upload to finish
          await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
          });
          
          // Add the file id to req.file for the controller to use
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

// Create functions to interact with GridFS
const findFileById = async (id) => {
  try {
    // Convert string ID to ObjectId if needed
    const _id = typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
    
    // Find the file in GridFS
    const files = await bucket.find({ _id }).toArray();
    return files[0] || null;
  } catch (err) {
    console.error('Error finding file by ID:', err);
    return null;
  }
};

const createReadStream = (id) => {
  try {
    // Convert string ID to ObjectId if needed
    const _id = typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
    return bucket.openDownloadStream(_id);
  } catch (err) {
    console.error('Error creating read stream:', err);
    return null;
  }
};

// Create a wrapper for compatibility with your existing code
const gfsInterface = {
  files: {
    findOne: findFileById
  },
  createReadStream
};

// Export the interfaces
module.exports = { 
  upload, 
  gfs: gfsInterface, 
  Attachment: {
    findById: findFileById,
    read: ({ _id }) => createReadStream(_id)
  }
};

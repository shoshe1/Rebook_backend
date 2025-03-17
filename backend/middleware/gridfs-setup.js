// middleware/gridfs-setup.js
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
require('dotenv').config();

// Create temporary disk storage for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = './temp-uploads';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    crypto.randomBytes(16, (err, buf) => {
      if (err) return cb(err);
      const filename = buf.toString('hex') + path.extname(file.originalname);
      cb(null, filename);
    });
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Initialize bucket as null, will be set once MongoDB is connected
let bucket = null;

// Function to initialize GridFS bucket
const initBucket = () => {
  if (mongoose.connection.readyState === 1) { // Check if connected
    try {
      bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'uploads'
      });
      console.log('GridFS bucket initialized');
      return bucket;
    } catch (error) {
      console.error('Error initializing GridFS bucket:', error);
      return null;
    }
  } else {
    console.warn('MongoDB not connected, cannot initialize GridFS bucket');
    return null;
  }
};

// Function to get or initialize the bucket
const getBucket = () => {
  if (!bucket && mongoose.connection.readyState === 1) {
    return initBucket();
  }
  return bucket;
};

// Function to upload file to GridFS
const uploadToGridFS = async (filePath, originalname, mimetype) => {
  return new Promise((resolve, reject) => {
    const currentBucket = getBucket();
    
    if (!currentBucket) {
      return reject(new Error('GridFS bucket not initialized'));
    }

    const uploadStream = currentBucket.openUploadStream(originalname, {
      metadata: {
        mimetype: mimetype
      }
    });

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(uploadStream);

    uploadStream.on('error', (error) => {
      reject(error);
    });

    uploadStream.on('finish', () => {
      // Clean up temporary file
      fs.unlink(filePath, (err) => {
        if (err) console.error('Failed to delete temp file:', err);
      });
      resolve(uploadStream.id);
    });
  });
};

// Function to get a file stream from GridFS
const getFileStream = async (fileId) => {
  try {
    const currentBucket = getBucket();
    
    if (!currentBucket) {
      throw new Error('GridFS bucket not initialized');
    }
    
    // Convert to ObjectId if it's a string
    const id = typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId;
    
    // Check if file exists
    const file = await mongoose.connection.db.collection('uploads.files').findOne({ _id: id });
    if (!file) {
      throw new Error(`File with ID ${fileId} not found`);
    }
    
    // Open a download stream
    return currentBucket.openDownloadStream(id);
  } catch (error) {
    console.error('Error getting file stream:', error);
    throw error;
  }
};

module.exports = { 
  upload, 
  uploadToGridFS, 
  getFileStream,
  getBucket,  // Make sure this is here
  initBucket
};


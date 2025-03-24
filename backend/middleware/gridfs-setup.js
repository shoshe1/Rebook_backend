// middleware/gridfs-setup.js
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
require('dotenv').config();

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
  limits: { fileSize: 5 * 1024 * 1024 } 
});

let bucket = null;

const initBucket = () => {
  if (mongoose.connection.readyState === 1) { 
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

const getBucket = () => {
  if (!bucket && mongoose.connection.readyState === 1) {
    return initBucket();
  }
  return bucket;
};

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
      fs.unlink(filePath, (err) => {
        if (err) console.error('Failed to delete temp file:', err);
      });
      resolve(uploadStream.id);
    });
  });
};

const getFileStream = async (fileId) => {
  try {
    const currentBucket = getBucket();
    
    if (!currentBucket) {
      throw new Error('GridFS bucket not initialized');
    }
    
    const id = typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId;
    
    const file = await mongoose.connection.db.collection('uploads.files').findOne({ _id: id });
    if (!file) {
      throw new Error(`File with ID ${fileId} not found`);
    }
    
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
  getBucket,  
  initBucket
};


// middleware/upload.js
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const crypto = require('crypto');

// Use memory storage to process files as Buffer objects
const storage = multer.memoryStorage();

// Check file type
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const filetypes = /jpeg|jpg|png|gif/;
  // Check extension
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime type
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only images are allowed!'));
  }
};

// Initialize basic Multer instance
const multerUpload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Set up GridFS bucket
let bucket;
mongoose.connection.once('open', () => {
  bucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: 'uploads'
  });
  console.log('GridFS bucket initialized in upload middleware');
});

// Enhanced upload middleware for GridFS
const upload = {
  single: (fieldName) => {
    return (req, res, next) => {
      multerUpload.single(fieldName)(req, res, async (err) => {
        if (err) {
          console.error('Error in multer upload:', err);
          return next(err);
        }

        // If no file, just continue
        if (!req.file) {
          return next();
        }

        try {
          // Create a unique filename
          const filename = crypto.randomBytes(16).toString('hex') + path.extname(req.file.originalname);
          
          // Make sure bucket is initialized
          if (!bucket) {
            throw new Error('GridFS bucket not initialized');
          }
          
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
          
          // Wait for the upload to complete
          await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
          });
          
          // Store the file ID for the controller to use
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
  },
  
  // Add other multer methods as needed (array, fields, etc.)
  array: (fieldName, maxCount) => {
    return (req, res, next) => {
      multerUpload.array(fieldName, maxCount)(req, res, async (err) => {
        if (err) {
          console.error('Error in multer upload array:', err);
          return next(err);
        }

        // If no files, just continue
        if (!req.files || req.files.length === 0) {
          return next();
        }

        try {
          // Process each file
          for (const file of req.files) {
            // Create a unique filename
            const filename = crypto.randomBytes(16).toString('hex') + path.extname(file.originalname);
            
            // Create a stream to upload to GridFS
            const writeStream = bucket.openUploadStream(filename, {
              contentType: file.mimetype,
              metadata: {
                originalname: file.originalname,
                uploadDate: new Date(),
                user: req.user ? req.user._id : 'anonymous'
              }
            });
            
            // Write the file buffer to the stream
            writeStream.write(file.buffer);
            writeStream.end();
            
            // Wait for the upload to complete
            await new Promise((resolve, reject) => {
              writeStream.on('finish', resolve);
              writeStream.on('error', reject);
            });
            
            // Store the file ID for the controller to use
            file.id = writeStream.id;
            file.filename = filename;
            
            console.log(`File uploaded to GridFS with ID: ${writeStream.id}`);
          }
          next();
        } catch (error) {
          console.error('Error uploading multiple files to GridFS:', error);
          next(error);
        }
      });
    };
  }
};

// Create functions to interact with GridFS for other parts of your application
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

// Export the complete module
module.exports = upload;

// Also export GridFS functions for other parts of your application
module.exports.gfs = {
  files: {
    findOne: findFileById
  },
  createReadStream
};

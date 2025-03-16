// middleware/upload.js
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const crypto = require('crypto');

// Initialize MongoDB connection for GridFS
const conn = mongoose.createConnection('mongodb://localhost:27017/your-db-name'); // Adjust the connection string

let gfs;

conn.once('open', () => {
  gfs = new GridFSBucket(conn.db, {
    bucketName: 'uploads'
  });
  console.log('GridFS bucket initialized in upload middleware');
});

// Use memory storage to process files as Buffer objects
const storage = multer.memoryStorage();

// Check file type
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|gif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
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

          if (!gfs) {
            throw new Error('GridFS not initialized');
          }

          // Create a stream to upload to GridFS
          const writeStream = gfs.openUploadStream(filename, {
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

        if (!req.files || req.files.length === 0) {
          return next();
        }

        try {
          for (const file of req.files) {
            const filename = crypto.randomBytes(16).toString('hex') + path.extname(file.originalname);

            const writeStream = gfs.openUploadStream(filename, {
              contentType: file.mimetype,
              metadata: {
                originalname: file.originalname,
                uploadDate: new Date(),
                user: req.user ? req.user._id : 'anonymous'
              }
            });

            writeStream.write(file.buffer);
            writeStream.end();

            await new Promise((resolve, reject) => {
              writeStream.on('finish', resolve);
              writeStream.on('error', reject);
            });

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

// Export the complete module
module.exports = upload;

// Also export GridFS functions for other parts of your application
module.exports.gfs = {
  // Example function to find file by ID
  findOne: async (id) => {
    try {
      const file = await gfs.find({ _id: mongoose.Types.ObjectId(id) }).toArray();
      return file[0] || null;
    } catch (err) {
      console.error('Error finding file by ID:', err);
      return null;
    }
  },
  
  createReadStream: (id) => {
    try {
      return gfs.openDownloadStream(mongoose.Types.ObjectId(id));
    } catch (err) {
      console.error('Error creating read stream:', err);
      return null;
    }
  }
};

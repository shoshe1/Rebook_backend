const mongoose = require('mongoose');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure disk storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Create unique filename
    crypto.randomBytes(16, (err, buf) => {
      if (err) {
        return cb(err);
      }
      const filename = buf.toString('hex') + path.extname(file.originalname);
      cb(null, filename);
    });
  }
});

// Setup multer for file uploads
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

// Create a file model to track uploads
const fileSchema = new mongoose.Schema({
  filename: String,
  originalname: String,
  path: String,
  size: Number,
  mimetype: String,
  uploadDate: { type: Date, default: Date.now },
  metadata: Object
});

const File = mongoose.model('File', fileSchema);

// Custom upload middleware
const upload = {
  single: (fieldName) => {
    return (req, res, next) => {
      multerUpload.single(fieldName)(req, res, async (err) => {
        if (err) {
          console.error('Error in multer upload:', err);
          return next(err);
        }

        if (!req.file) {
          return next();
        }

        try {
          // Create a database entry for the file
          const fileData = new File({
            filename: req.file.filename,
            originalname: req.file.originalname,
            path: req.file.path,
            size: req.file.size,
            mimetype: req.file.mimetype,
            metadata: {
              user: req.user ? req.user._id : 'anonymous'
            }
          });

          const savedFile = await fileData.save();
          
          // Add MongoDB ID to req.file for the controller to use
          req.file.id = savedFile._id;
          
          next();
        } catch (error) {
          console.error('Error saving file metadata:', error);
          next(error);
        }
      });
    };
  }
};

// Create a gfs-compatible interface
const gfs = {
  files: {
    findOne: async (query) => {
      try {
        if (query._id) {
          return await File.findById(query._id);
        } else if (query.filename) {
          return await File.findOne({ filename: query.filename });
        }
        return null;
      } catch (err) {
        console.error('Error in gfs.files.findOne:', err);
        return null;
      }
    }
  },
  createReadStream: (filename) => {
    const filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) {
      return fs.createReadStream(filePath);
    }
    return null;
  }
};

// Create Attachment-compatible interface
const Attachment = {
  findById: async (id) => {
    return await File.findById(id);
  },
  read: ({ _id }) => {
    return File.findById(_id).then(file => {
      if (file) {
        const filePath = path.join(uploadDir, file.filename);
        if (fs.existsSync(filePath)) {
          return fs.createReadStream(filePath);
        }
      }
      return null;
    });
  }
};

module.exports = { upload, gfs, Attachment };
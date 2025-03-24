const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { GridFsStorage } = require('multer-gridfs-storage');
const mongoose = require('mongoose');

const useGridFS = process.env.USE_GRIDFS === 'true'; 

const allowedTypes = /jpeg|jpg|png|gif/;

const fileFilter = (req, file, cb) => {
  const isExtValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const isMimeValid = allowedTypes.test(file.mimetype);

  if (isExtValid && isMimeValid) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, JPG, PNG, and GIF are allowed.'));
  }
};

let storage;

if (useGridFS) {
  const conn = mongoose.connection;
  storage = new GridFsStorage({
    db: conn,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) return reject(err);
          const filename = buf.toString('hex') + path.extname(file.originalname);
          resolve({ filename, bucketName: 'uploads' });
        });
      });
    }
  });
} else {
  storage = multer.memoryStorage();
}

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter
});

const handleFileUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Multer error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    } else if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded or invalid file type' });
    }
    next();
  });
};

module.exports = { upload, handleFileUpload };

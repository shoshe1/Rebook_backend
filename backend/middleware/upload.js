// middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('Uploading file to uploads/ directory');
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueFilename = `${Date.now()}${path.extname(file.originalname)}`;
    console.log('Generated unique filename:', uniqueFilename);
    cb(null, uniqueFilename);
  }
});

// File filter to allow only image files
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg']; // Add more as needed
  if (allowedMimeTypes.includes(file.mimetype)) {
    console.log('File accepted:', file.originalname);
    cb(null, true);
  } else {
    console.log('File rejected (not an image):', file.originalname);
    cb(new Error('Only image files (jpeg, jpg, png, gif) are allowed!'), false);
  }
};

// Initialize Multer
const upload = multer({ 
  storage, 
  fileFilter,
  limits: { 
    fileSize: 10 * 1024 * 1024 // Limit file size to 10MB
  }
});

// Error handling middleware
upload.single('book_photo', (err, req, res, next) => {
  if (err) {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred during file upload
      return res.status(400).json({ error: err.message });
    } else {
      // An unknown error occurred
      return res.status(400).json({ error: err.message });
    }
  }
  next();
});

module.exports = upload;

const express = require('express');
const router = express.Router();
const User = require('../models/User'); 
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const verifyRole = require('../middleware/verifyRole');
const { upload } = require('../middleware/gridfs-setup');
const cors = require('cors');

// Get user photo by photo ID
router.get('/photo/:id', userController.getUserPhoto);
router.get('/:user_id2/details', auth, userController.getUserDetails);
router.put('/update-photo', auth, upload.single('user_photo'), userController.updateUserPhoto);
// Get user photo by user ID
router.get('/photo-by-user-id/:user_id', userController.getUserPhotoByUserId);

router.get('/photo-url/:user_id', async (req, res) => {
  const { user_id } = req.params;
  try {
    const userId = parseInt(user_id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
    const user = await User.findOne({ user_id: userId }).select('user_photo');
    if (!user || !user.user_photo) {
      return res.status(404).json({ message: 'User photo not found' });
    }

    // Assuming GridFS stores the photo as a file with the user_photo ObjectId
    const photo = user.user_photo;

    // Return URLs to access the photo in different ways
    const baseUrl = process.env.BASE_URL || 'https://rebook-backend-ldmy.onrender.com';
    res.status(200).json({ 
      photo_id: photo,
      direct_photo_url: `${baseUrl}/api/users/photo/${photo}`,
      proxied_photo_url: `${baseUrl}/api/users/photo-by-user-id/${user_id}`,
      static_photo_url: `${baseUrl}/uploads/${photo}`
    });
  } catch (error) {
    console.error('Error fetching user photo:', error);
    res.status(500).json({ message: 'Error fetching user photo' });
  }
});

// Public test endpoint to check user photo system
router.get('/test-photos', async (req, res) => {
  try {
    // Get the first few users
    const users = await User.find().limit(5);
    
    // Format results with photo URLs
    const results = users.map(user => ({
      user_id: user.user_id,
      username: user.username,
      photo_id: user.user_photo,
      direct_photo_url: `/api/users/photo/${user.user_photo}`,
      user_id_photo_url: `/api/users/photo-by-user-id/${user.user_id}`
    }));
    
    res.json({
      message: 'User photo test',
      users: results,
      instructions: 'Add these URLs to your browser to test photo display'
    });
  } catch (error) {
    console.error('Error testing photos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create account with file upload using GridFS
router.post('/create-account', upload.single('user_photo'), (req, res, next) => {
  console.log('File upload debug:');
  console.log('File received:', req.file ? 'Yes' : 'No');
  if (req.file) {
    console.log('File details:', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });
  }
  console.log('Body:', req.body);
  next();
}, userController.addUser);

router.get('/', auth, verifyRole('librarian'), userController.getUsers);
router.get('/:user_id', auth, userController.getUserById);
router.get('/:user_id2', auth, userController.getUserById2);
router.post('/login', userController.log_in);
router.post('/logout', auth, userController.log_out);
router.delete('/:user_id', auth, verifyRole('librarian'), userController.deleteUser);
router.get('/:user_id/borrowings', auth, userController.user_borrowing_history);

// Get user donations by user_id
router.get('/:user_id/donations', auth, userController.user_donations_history);

router.get('/me/id', auth, userController.getCurrentUserId);
router.get('/test-gridfs-status', async (req, res) => {
  try {
    const bucket = getBucket();
    if (!bucket) {
      return res.status(500).json({ success: false, message: 'GridFS bucket not initialized' });
    }
    return res.status(200).json({ 
      success: true, 
      message: 'GridFS is initialized',
      connectionState: mongoose.connection.readyState
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});
module.exports = router;

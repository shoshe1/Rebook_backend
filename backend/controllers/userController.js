// controllers/userController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const BookDonation = require('../models/BookDonation');
const BookBorrowing = require('../models/BookBorrowing');
const mongoose = require('mongoose');
const { uploadToGridFS, getFileStream } = require('../middleware/gridfs-setup');
const path = require('path');

const sendResponse = (res, status, success, message, data = null) => {
  const response = { success, message };
  if (data) response.data = data;
  return res.status(status).json(response);
};

exports.getUserDetails = async (req, res) => {
  try {
    const userId = parseInt(req.params.user_id2, 10); 
    console.log('Fetching user details by ID:', userId);

    const user = await User.findOne({ user_id: userId });
    if (!user) {
      console.log('User not found');
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userObjectId = user._id; 

    const borrowings = await BookBorrowing.find({ user_id: userObjectId });
    const donations = await BookDonation.find({ user_id: userObjectId });

    res.status(200).json({
      success: true,
      data: {
        user,
        borrowings,
        donations
      }
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateUserPhoto = async (req, res) => {
  try {
    const userId = req.user._id; 

    if (!req.file) {
      return sendResponse(res, 400, false, 'No file uploaded');
    }

    const fileId = await uploadToGridFS(
      req.file.path,
      req.file.originalname,
      req.file.mimetype
    );

    const user = await User.findByIdAndUpdate(userId, { user_photo: fileId }, { new: true });

    if (!user) {
      return sendResponse(res, 404, false, 'User not found');
    }

    sendResponse(res, 200, true, 'Photo updated successfully', { user });
  } catch (error) {
    console.error('Error updating user photo:', error);
    sendResponse(res, 500, false, error.message);
  }
};

exports.addUser = async (req, res) => {
  try {
    const { username, password, user_type } = req.body;
    if (!username || !password || !user_type) {
      return sendResponse(res, 400, false, 'Missing required fields');
    }

    if (await User.findOne({ username })) {
      return sendResponse(res, 400, false, 'Username already taken');
    }
    
    const hashedPassword = await bcrypt.hash(password, 8);
    
    const userData = {
      user_id: await User.countDocuments() + 1,
      username,
      user_number: Math.floor(Math.random() * 100000),
      password: hashedPassword,
      user_type
    };
    
    if (req.file) {
      try {
        const fileId = await uploadToGridFS(
          req.file.path,
          req.file.originalname,
          req.file.mimetype
        );
        userData.user_photo = fileId.toString();
      } catch (uploadError) {
        console.error('Error uploading file to GridFS:', uploadError);
      }
    } else {
      const defaultPhotoPath = path.join(__dirname, '..', 'uploads', 'no_img.jpeg');
      const defaultPhotoId = await uploadToGridFS(defaultPhotoPath, 'no_img.jpeg', 'image/jpeg');
      userData.user_photo = defaultPhotoId.toString();
    }
    
    const user = new User(userData);
    await user.save();
    
    const token = jwt.sign(
      { _id: user._id, user_type: user.user_type }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
    const userResponse = user.toObject();
    delete userResponse.password;
    
    sendResponse(res, 201, true, 'User created successfully', { user: userResponse, token });
  } catch (error) {
    console.error('Error creating user:', error);
    sendResponse(res, 500, false, error.message);
  }
};
exports.getUserPhoto = async (req, res) => {
  try {
    const fileId = req.params.id;
    console.log('Attempting to get file with ID:', fileId);
    
    let objectId;
    try {
      objectId = new mongoose.Types.ObjectId(fileId);
    } catch (err) {
      console.error('Invalid ObjectId format:', fileId);
      return sendResponse(res, 400, false, 'Invalid file ID format');
    }
    
    try {
      const fileStream = await getFileStream(objectId);
      
      const bucket = await mongoose.connection.db.collection('uploads.files').findOne({ _id: objectId });
      
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
      
      if (bucket && bucket.metadata && bucket.metadata.mimetype) {
        res.set('Content-Type', bucket.metadata.mimetype);
      } else {
        res.set('Content-Type', 'image/jpeg');
      }
      
      res.set('Content-Disposition', 'inline');
      
      fileStream.pipe(res);
    } catch (streamError) {
      console.error('Error with file stream:', streamError);
      return sendResponse(res, 404, false, 'File not found in GridFS');
    }
  } catch (error) {
    console.error('Error getting user photo:', error);
    sendResponse(res, 500, false, error.message);
  }
};

exports.getUserPhotoByUserId = async (req, res) => {
  try {
    const userId = parseInt(req.params.user_id, 10);
    console.log('Looking for photo for user ID:', userId);
    
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    
    const user = await User.findOne({ user_id: userId });
    console.log('User found:', user ? 'Yes' : 'No');
    console.log('User photo field:', user ? user.user_photo : 'N/A');
    
    if (!user || !user.user_photo) {
      return sendResponse(res, 404, false, 'User photo not found');
    }
    
    const userPhotoId = user.user_photo.toString();
    
    console.log('Redirecting to photo endpoint with ID:', userPhotoId);
    res.redirect(`/api/users/photo/${userPhotoId}`);
  } catch (error) {
    console.error('Error getting user photo by ID:', error);
    sendResponse(res, 500, false, error.message);
  }
};

exports.getUsers = async (req, res) => {
  try {
    if (!req.user) return sendResponse(res, 401, false, 'Unauthorized access');

    const users = await User.find({ user_type: 'customer' });

    res.setHeader('Content-Type', 'application/json');
    
    sendResponse(res, 200, true, 'Users retrieved successfully', users);
  } catch (error) {
    res.setHeader('Content-Type', 'application/json');
    sendResponse(res, 500, false, error.message);
  }
};

exports.getUserById = async (req, res) => {
  try {
    console.log('Fetching user by ID:', req.params.user_id);
    const user = await User.findOne({ user_id: req.params.user_id });
    if (!user) {
      console.log('User not found');
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    console.log('User found:', user);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.getUserById2 = async (req, res) => {
  try {
    const userId = parseInt(req.params.user_id, 10); 
    console.log('Fetching user by ID:', userId);
    const user = await User.findOne({ user_id: userId });
    if (!user) {
      console.log('User not found');
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    console.log('User found:', user);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.log_in = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    const token = jwt.sign({ _id: user._id, user_type: user.user_type }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(200).json({
      message: 'Login successful',
      userType: user.user_type,
      username: user.username,
      userId: user.user_id,
      userPhotoId: user.user_photo, 
      userPhotoUrl: `/api/users/photo/${user.user_photo}`, 
      token,
      tokenExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.log_out = async (req, res) => {
  try {
    sendResponse(res, 200, true, 'Logout successful');
  } catch (error) {
    sendResponse(res, 500, false, error.message);
  }
};
exports.deleteUser = async (req, res) => {
  try {
    const deletedUser = await User.findOneAndDelete({ user_id: req.params.user_id });
    if (!deletedUser) return sendResponse(res, 404, false, 'User not found');
    sendResponse(res, 200, true, 'User deleted successfully');
  } catch (error) {
    sendResponse(res, 500, false, error.message);
  }
};

exports.user_borrowing_history = async (req, res) => {
  try {
    const userId = mongoose.Types.ObjectId(req.params.user_id); 
    console.log('Fetching borrowings for user ID:', userId);
    const borrowings = await BookBorrowing.find({ user_id: userId });
    sendResponse(res, 200, true, 'Borrowing history retrieved successfully', borrowings);
  } catch (error) {
    console.error('Error fetching borrowings:', error);
    sendResponse(res, 500, false, error.message);
  }
};

exports.user_donations_history = async (req, res) => {
  try {
    const donations = await BookDonation.find({ user_id: req.params.user_id });
    sendResponse(res, 200, true, 'Donations history retrieved successfully', donations);
  } catch (error) {
    sendResponse(res, 500, false, error.message);
  }
};

exports.getCurrentUserId = async (req, res) => {
  try {
    if (!req.user) return sendResponse(res, 401, false, 'Unauthorized access');
    sendResponse(res, 200, true, 'Current user ID retrieved successfully', { user_id: req.user.user_id });
  } catch (error) {
    sendResponse(res, 500, false, error.message);
  }
};

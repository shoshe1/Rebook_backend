const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const BookDonation = require('../models/BookDonation');
const BookBorrowing = require('../models/BookBorrowing');
const fs = require('fs');
const path = require('path');
const { gfs, Attachment } = require('../middleware/gridfs-setup');
const mongoose = require('mongoose');

// Convert Buffer to base64 string
const bufferToBase64 = (buffer, mimetype) => {
  return `data:${mimetype};base64,${buffer.toString('base64')}`;
};

// Convert file on disk to base64 string
const fileToBase64 = (filePath, mimetype) => {
  try {
    const fileData = fs.readFileSync(filePath);
    return `data:${mimetype};base64,${fileData.toString('base64')}`;
  } catch (error) {
    console.error('Error converting file to base64:', error);
    return null;
  }
};

const sendResponse = (res, status, success, message, data = null) => {
    const response = { success, message };
    if (data) response.data = data;
    return res.status(status).json(response);
};

exports.getUsers = async (req, res) => {
    try {
        const users = await User.find({ user_type: 'customer' });
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized access' });
        }
        res.status(200).json(users);
    } catch (error) {
        console.log('error in get_users', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const userId = req.params.user_id;
        const user = await User.findOne({ user_id: userId });
        if (!user) {
            res.status(404).json({ error: 'User not found', userId });
            return;
        }
        res.status(200).json(user);
    } catch (error) {
        console.log('error in get_user_by_id', error);
        res.status(500).json({ error: error.message });
    }
};


// Updated addUser function to work with GridFS
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
    
    // Create user data object
    const userData = {
      user_id: await User.countDocuments() + 1,
      username,
      user_number: Math.floor(Math.random() * 100000),
      password: hashedPassword,
      user_type
    };
    
    // Process photo if uploaded
    if (req.file) {
      try {
        // Upload file to GridFS
        const fileId = await uploadToGridFS(
          req.file.path,
          req.file.originalname,
          req.file.mimetype
        );
        userData.user_photo = fileId.toString();
      } catch (uploadError) {
        console.error('Error uploading file to GridFS:', uploadError);
        // Continue without photo if upload fails
      }
    }
    
    const user = new User(userData);
    await user.save();
    
    const token = jwt.sign(
      { _id: user._id, user_type: user.user_type }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
    // Don't include password in response
    const userResponse = user.toObject();
    delete userResponse.password;
    
    sendResponse(res, 201, true, 'User created successfully', { user: userResponse, token });
  } catch (error) {
    console.error('Error creating user:', error);
    sendResponse(res, 500, false, error.message);
  }
};

// Add a method to get user photos
exports.getUserPhoto = async (req, res) => {
  try {
    const fileId = req.params.id;
    console.log('Attempting to get file with ID:', fileId);
    
    // Convert string to ObjectId
    let objectId;
    try {
      objectId = new mongoose.Types.ObjectId(fileId);
    } catch (err) {
      console.error('Invalid ObjectId format:', fileId);
      return sendResponse(res, 400, false, 'Invalid file ID format');
    }
    
    // Get file stream from GridFS
    try {
      const fileStream = await getFileStream(objectId);
      
      // Get file info to set proper content type
      const bucket = await mongoose.connection.db.collection('uploads.files').findOne({ _id: objectId });
      
      // Set CORS headers here
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
      
      // Set appropriate content type
      if (bucket && bucket.metadata && bucket.metadata.mimetype) {
        res.set('Content-Type', bucket.metadata.mimetype);
      } else {
        // Default to jpeg if mimetype not found
        res.set('Content-Type', 'image/jpeg');
      }
      
      // Important: don't send JSON response
      res.set('Content-Disposition', 'inline');
      
      // Pipe the file stream directly to the response
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


// Updated getUserPhotoByUserId function
exports.getUserPhotoByUserId = async (req, res) => {
  try {
    const userId = parseInt(req.params.user_id, 10);
    console.log('Looking for photo for user ID:', userId);
    
    // Set CORS headers here too
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    
    const user = await User.findOne({ user_id: userId });
    console.log('User found:', user ? 'Yes' : 'No');
    console.log('User photo field:', user ? user.user_photo : 'N/A');
    
    if (!user || !user.user_photo) {
      return sendResponse(res, 404, false, 'User photo not found');
    }
    
    console.log('Redirecting to photo endpoint with ID:', user.user_photo);
    res.redirect(`/api/users/photo/${user.user_photo}`);
  } catch (error) {
    console.error('Error getting user photo by ID:', error);
    sendResponse(res, 500, false, error.message);
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
      userId: user.user_id, // Add user ID
      userPhotoId: user.user_photo, // Add user photo ID
      userPhotoUrl: `/api/users/photo/${user.user_photo}`, // Add direct URL
      token,
      tokenExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.log_out = async (req, res) => {
    try {
        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        console.log('error in log_out', error);
        res.status(500).json({ error: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const userId = req.params.user_id;

        const deletedUser = await User.findOneAndDelete({ user_id: userId });

        if (!deletedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        console.log('error in delete_user', error);
        res.status(500).json({ error: error.message });
    }
};

exports.user_donations_history = async (req, res) => {
    try {
        const userId = req.params.user_id;
        const user = await User.findOne({ user_id: userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const donations = await Donation.find({ user_id: userId });
        res.status(200).json(donations);
    } catch (error) {
        console.log('error in user_donations_history', error);
        res.status(500).json({ error: error.message });
    }
};

exports.user_borrowing_history = async (req, res) => {
    try {
        const userId = req.params.user_id;
        const user = await User.findOne({ user_id: userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const borrowings = await BookBorrowing.find({ user_id: userId });
        res.status(200).json(borrowings);
    } catch (error) {
        console.log('error in user_borrowing_history', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getUserProfile = async (req, res) => {
    try {
        const userId = req.params.user_id;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const user = await User.findOne({ user_id: userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({
            user_id: user.user_id,
            username: user.username,
            user_type: user.user_type,
            user_number: user.user_number,
            user_photo: user.user_photo,
            // Add any other user details you want to return
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Internal Server Error' });
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

const upload = require('../middleware/upload');

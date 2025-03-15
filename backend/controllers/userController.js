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


exports.addUser = async (req, res) => {
  try {
    console.log('Request body:', req.body); // Debugging statement
    console.log('Request file:', req.file); // Debugging statement

    const { username, password, user_type } = req.body;

    // Validate required fields
    if (!username || !password || !user_type || !req.file) {
      return res.status(400).json({ error: 'Username, password, user type, and user photo are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 8);

    // Store the GridFS file ID
    const user_photo = req.file.id;

    // Create new user
    const user = new User({
      user_id: await User.countDocuments() + 1,
      username,
      user_number: Math.floor(Math.random() * 100000),
      password: hashedPassword,
      user_type,
      user_photo
    });

    await user.save();
    const token = jwt.sign({ _id: user._id, user_type: user.user_type }, process.env.JWT_SECRET, { expiresIn: '24h' }); // Token expires in 24 hours
    res.status(201).json({
      message: 'User created successfully',
      user: {
        user_id: user.user_id,
        username: user.username,
        user_type: user.user_type,
        user_number: user.user_number,
        user_photo: user.user_photo // Include user_photo ID in the response
      },
      token,
      imageUrl: `/api/users/photo/${user.user_photo}`
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: error.message });
  }
};

// Add a method to get user photos
exports.getUserPhoto = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Find the file by ID
    const file = await gfs.files.findOne({ _id: new mongoose.Types.ObjectId(id) });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (file.contentType === 'image/jpeg' || file.contentType === 'image/png' || file.contentType === 'image/gif') {
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({ error: 'Not an image' });
    }
  } catch (error) {
    console.error('Error fetching user image:', error);
    res.status(500).json({ error: error.message });
  }
};

// Add this new controller method
exports.getUserPhotoByUserId = async (req, res) => {
  try {
      const userId = parseInt(req.params.user_id, 10);
      console.log(`Getting photo for user ID: ${userId}`);

      if (isNaN(userId)) {
          console.log('Invalid user ID format');
          return res.status(400).json({ error: 'Invalid user ID' });
      }

      // Find the user
      const user = await User.findOne({ user_id: userId });

      if (!user) {
          console.log(`User not found for ID: ${userId}`);
          return res.status(404).json({ error: 'User not found' });
      }

      if (!user.user_photo) {
          console.log(`No photo ID found for user: ${userId}`);
          return res.status(404).json({ error: 'User photo not found' });
      }

      console.log(`Found user photo ID: ${user.user_photo} for user: ${userId}`);

      // Use gfs to fetch the file by ID
      const photoId = user.user_photo;
      const file = await gfs.files.findOne({ _id: new mongoose.Types.ObjectId(photoId) });

      if (!file) {
          console.log(`Photo file not found in database for ID: ${photoId}`);
          return res.status(404).json({ error: 'Photo file not found' });
      }

      console.log(`Found file record: ${file.filename} (${file.mimetype})`);

      // Set CORS headers
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Cross-Origin-Resource-Policy', 'cross-origin');

      // Set the content type header
      res.set('Content-Type', file.mimetype || 'application/octet-stream');

      // Create a read stream from the GridFS bucket
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
  } catch (error) {
      console.error('Error fetching user image by user ID:', error);
      res.status(500).json({ error: error.message });
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
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized access' });
    }
    
    // If req.user already has user_id, return it directly
    if (req.user.user_id) {
      return res.status(200).json({ user_id: req.user.user_id });
    }
    
    // Otherwise, fetch the user from the database
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Return the user_id
    res.status(200).json({ user_id: user.user_id });
  } catch (error) {
    console.error('Error getting current user ID:', error);
    res.status(500).json({ error: error.message });
  }
};

const upload = require('../middleware/upload');

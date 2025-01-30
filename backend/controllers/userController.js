const User = require('../models/User');
const bcrypt = require('bcryptjs');


const BookDonation = require('../models/BookDonation');
const BookBorrowing = require('../models/BookBorrowing');
const jwt = require('jsonwebtoken');

    const sendResponse = (res, status, success, message, data = null) => {
        const response = { success, message };
        if (data) response.data = data;
        return res.status(status).json(response);
      };
      

exports.getUsers = async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json(users);
    } catch (error) {
        console.log('error in get_users',error);
        res.status(500).json({ error: error.message });
    }
    };
    exports.getUserById = async (req, res) => {
        try {
          const userId = req.params.user_id; 
          const user = await User.findOne({ user_id : userId}); 
          if (!user) {
            res.status(404).json({ error: 'User not found', userId });
            return;
          }
          res.status(200).json(user);
        } catch (error) {
          console.log('error in get_user_by_id',error);
          res.status(500).json({ error: error.message });
        }
      };

      exports.addUser = async (req, res) => {
        try {
            const { username, password, user_type } = req.body;
        
            // Validate required fields
            if (!username || !password || !user_type) {
              return sendResponse(res, 400, false, 'Username, password, and user type are required');
            }
        
            // Check if user already exists
            const existingUser = await User.findOne({ username });
            if (existingUser) {
              return sendResponse(res, 400, false, 'Username already taken');
            }
        
            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 8);
        
            // Create new user
            const user = new User({
              user_id: await User.countDocuments() + 1,
              username,
              password: hashedPassword,
              user_type,
            });
    
            await user.save();
            const token = jwt.sign({ _id: user._id, user_type: user.user_type }, process.env.JWT_SECRET);
            return sendResponse(res, 201, true, 'User created successfully', { user,token });

        } catch (error) {
            console.log('error in add_user',error);
            return sendResponse(res, 500, false, 'Failed to create user');
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
            const token = jwt.sign({ _id: user._id, user_type: user.user_type }, process.env.JWT_SECRET);// this will be used to verify the token later
            res.status(200).json({
                message: 'Login successful',
                userType: user.user_type,
                username: user.username, 
                token,
            });        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };


    exports.log_out = async (req, res) => {
        try {
            res.status(200).json({ message: 'Logout successful' });
        } catch (error) {
            console.log('error in log_out',error);
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
            console.log('error in delete_user',error);
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
        }
        catch (error) {
            console.log('error in user_donations_history',error);
            res.status(500).json({ error: error.message });
        }
    };

exports.user_borrowing_history = async (req, res) => {
        try {
            const userId = req.params.user_id;
            const user      = await User.findOne({ user_id: userId });
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            const borrowings = await BookBorrowing.find({ user_id: userId });
            res.status(200).json(borrowings);
        }
        catch (error) {
            console.log('error in user_borrowing_history',error);
            res.status(500).json({ error: error.message });
        }
    };
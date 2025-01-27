const User = require('../models/User');
const bcrypt = require('bcryptjs');



exports.getUsers = async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json(users);
    } catch (error) {
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
          res.status(500).json({ error: error.message });
        }
      };

      exports.addUser = async (req, res) => {
        try {
            const { user_id, username, password, user_type, user_number } = req.body;
    
            if (!user_id || !username || !password || !user_type) {
                return res.status(400).json({ error: 'Missing required fields' });
            }
    
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                return res.status(400).json({ error: 'Username already taken' });
            }
    
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
    
            const user = new User({
                user_id,
                username,
                password: hashedPassword, 
                user_type,
                user_number,
            });
    
            await user.save();
            res.status(201).json(user);
        } catch (error) {
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
    
            res.status(200).json({
                message: 'Login successful',
                userType: user.user_type, // Assuming user_type is a field in your User model
            });        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };


    exports.log_out = async (req, res) => {
        try {
            res.status(200).json({ message: 'Logout successful' });
        } catch (error) {
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
            res.status(500).json({ error: error.message });
        }
    };
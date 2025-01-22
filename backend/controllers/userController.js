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


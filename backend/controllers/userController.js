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

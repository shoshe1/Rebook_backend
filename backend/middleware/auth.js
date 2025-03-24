const jwt = require('jsonwebtoken');
const User = require('../models/User');


const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded._id });


    if (!user) {
      throw new Error();
    }


     req.token = token;
    req.user = {
      _id: user._id,          
      user_id: user.user_id,  
      username: user.username,
      user_type: user.user_type,
    };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate.' });
  }
};


module.exports = auth;

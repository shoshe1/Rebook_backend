const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const verifyRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user || !req.user.user_type) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (req.user.user_type !== requiredRole) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    
    next();
  };
};

module.exports = verifyRole;



const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = (role) => {
  return (req, res, next) => {
    if (req.user && req.user.user_type === role) {
      next();
    } else {
      res.status(403).json({ error: 'Access denied' });
    }
  };
};



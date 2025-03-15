const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  user_id: { type: Number, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  user_type: { type: String, enum: ['librarian', 'customer'], required: true },
  user_number: { type: String },
  user_photo: { type: mongoose.Schema.Types.ObjectId } // Changed to ObjectId for GridFS
});

module.exports = mongoose.model('User', userSchema);
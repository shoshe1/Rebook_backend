const mongoose = require('mongoose');
const Book = require('./Book'); // Ensure capitalization is consistent
const User = require('./User');

const bookDonationSchema = new mongoose.Schema({
  donation_id: { type: Number, required: true, unique: true }, // Ensure it's a number
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  user_name: { type: String, required: true },
  book_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  book_title: { type: String, required: true },
  book_author: { type: String, required: true },
  donation_date: { type: Date, default: Date.now },
  book_condition: { type: String, enum: ['new', 'good', 'worn'], required: true },
  book_photo: { type: String, required: true },
  donation_status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending', required: true }
});

module.exports = mongoose.model('BookDonation', bookDonationSchema);

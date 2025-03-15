const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  book_id: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  author: { type: String, required: true },
  category: { type: String, required: true },
  publication_year: { type: Number },
  total_copies: { type: Number, required: true },
  available_copies: { type: Number, required: true },
  book_photo: { type: mongoose.Schema.Types.ObjectId }, // Store GridFS file ID
  book_status: { type: String, enum: ['available', 'borrowed'], default: 'available' }
});

module.exports = mongoose.model('Book', bookSchema);
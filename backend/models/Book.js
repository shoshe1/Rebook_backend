const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    book_id: { type: Number, unique: true , required: true },
    book_photo: { type: String }, 
    title: { type: String, required: true },
    author: { type: String, required: true },
    category: { type: String, required: true },
    publication_year: { type: Number  , },
    book_status: { type: String, enum: ['available', 'borrowed'], default: 'available' },
    total_copies: { type: Number},
    available_copies: { type: Number },
  });
  
  module.exports = mongoose.model('Book', bookSchema);
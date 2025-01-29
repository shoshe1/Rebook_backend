const mongoose = require('mongoose');

const bookBorrowingSchema = new mongoose.Schema({
  borrowing_id: { type: Number, required: true, unique: true },
  book_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  borrow_date: { type: Date, default: Date.now },
  due_date: { type: Date, required: true },
  return_date: { type: Date },
  borrowing_status: { type: String, enum: ['borrowed', 'returned', 'overdue', 'pending'], default: 'pending' }
});

module.exports = mongoose.model('BookBorrowing', bookBorrowingSchema);
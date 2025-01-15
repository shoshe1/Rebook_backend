const bookBorrowingSchema = new mongoose.Schema({
    borrowing_id: { type: Number, required: true, unique: true },
    book_id: { type: Number, required: true, ref: 'Book' },
    user_id: { type: Number, required: true, ref: 'User' },
    borrow_date: { type: Date, default: Date.now },
    due_date: { type: Date, required: true },
    return_date: { type: Date },
    borrowing_status: { type: String, enum: ['borrowed', 'returned'], default: 'borrowed' },
  });
  
  module.exports = mongoose.model('BookBorrowing', bookBorrowingSchema);
  
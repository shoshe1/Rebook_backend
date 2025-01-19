const Book = require('../models/Book');

const BookBorrowing = require('../models/BookBorrowing'); 
const user = require ('../models/User')
const BookDonation = require('../models/BookDonation');


exports.getBooks = async (req, res) => {
  try {
    const books = await Book.find();
    res.status(200).json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.getBookById = async (req, res) => {
  try {
    const bookId = req.params.book_id; // Use book_id from the route
    const book = await Book.findOne({ book_id: bookId }); // Find by book_id field
    if (!book) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }
    res.status(200).json(book);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


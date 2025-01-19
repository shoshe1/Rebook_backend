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

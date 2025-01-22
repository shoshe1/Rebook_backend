const Book = require('../models/Book');

const BookBorrowing = require('../models/BookBorrowing'); 
const user = require ('../models/User')
const BookDonation = require('../models/BookDonation');
const { json } = require('express');
const { get } = require('mongoose');


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


exports.createBook = async (req, res) => {
  try {
    const book = new Book(req.body);
    await book.save();
    res.status(201).json(book);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.deleteBook = async (req, res) => {
  try {
    
    const bookId = req.params.book_id; 
    const deletedBook = await Book.findByIdAndDelete(bookId);
    if (!deletedBook) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.status(204).json({ message: 'Book deleted successfully' });
  }catch (error) {
    res.status(500).json({ error: error.message });
  }}
;


exports.updateBook = async (req, res) => {
  try {
    const bookId = req.params.id;
    const book = await Book.findById(bookId);
    if (!book) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }
    Object.assign(book, req.body);
    await book.save();
    res.status(200).json(book);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.borrowBook = async (req, res) => {
  try {
    const { book_id, user_id, due_date } = req.body;
    if (!book_id || !user_id || !due_date) {
      res.status(400).json({ error: 'book_id, user_id and due_date are required fields' });
      return;
    }
    const book = await Book.findOne({ book_id });
    if (!book) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }
    if (book.status === 'borrowed') {
      res.status(400).json({ error: 'Book is already borrowed' });
      return;
    }
    if(book.available_copies<=0){
      res.status(400).json({ error: 'Book is not available' });
      return;
    }

    const borrowing = new BookBorrowing({ book_id, user_id, due_date, borrowing_id: Math.floor(Math.random() * 100000) });
    await borrowing.save();
    book.available_copies--;
    await book.save();
    res.status(200).json
    ({ message: 'Book borrowed successfully', borrowing });
  }
  catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.returnBook = async (req, res) => {
  try {
    const{borrowing_id}=req.params;
    const return_date = new Date();
    const borrowing = await BookBorrowing.findOne({ borrowing_id });
    if (!borrowing) {
      res.status(404).json({ error: 'Borrowing not found' });
      return;
    }
    if (borrowing.borrowing_status === 'returned') {
      res.status(400).json({ error: 'Book is already returned' });
      return;
    }
    borrowing.return_date = return_date;
    borrowing.borrowing_status = 'returned';
    await borrowing.save();
    const book = await Book.findOne({ book_id: borrowing.book_id });
    if (!book) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }

    book.available_copies++;
    await book.save();
    res.status(200).json({ message: 'Book returned successfully', borrowing });
  }

    catch (error) {
      res.status(500).json({ error: error.message });
    }
  
};


exports.getAllBorrowings = async (req, res) => {
  try {
    const borrowings = await BookBorrowing.find();
    res.status(200).json(borrowings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.createDonation = async (req, res) => {
  try{
    const { user_id, book_title, book_author, donation_date, book_condition, book_photo } = req.body;
    if (!user_id || !book_title || !book_author || !donation_date || !book_condition || !book_photo) {
      res.status(400).json({ error: 'user_id, book_title, book_author, donation_date, book_condition and book_photo are required fields' });
      return;
    }
    const donation = new BookDonation({ user_id, book_title, book_author, donation_date : donation_date || new Date(), book_condition, book_photo, donation_id: Math.floor(Math.random() * 100000) , donation_status:'pending' });

    await donation.save();

    res.status(201).json({ message: 'Book donation created successfully', donation });


  }
  catch (error) {
    res.status(500).json({ error: error.message });
  }
};
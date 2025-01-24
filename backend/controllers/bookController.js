const Book = require('../models/Book');
const multer = require('multer');
const path = require('path');

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
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // File uploads will be stored in the 'uploads' directory
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

exports.createBook = [
  upload.single('book_photo'),
  async (req, res) => {
    try {
      const { title, author, publication_date, category } = req.body;
      const book_photo = req.file ? req.file.filename : null;

      // Check for required fields
      if (!title || !author || !publication_date || !category) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Find a book with the same title and author
      let book = await Book.findOne({ title, author });

      if (book) {
        // Update total_copies and available_copies
        book.total_copies += 1;
        book.available_copies += 1;
        await book.save();
        return res.status(200).json({ message: 'Book already exists. Updated available copies.', book });
      } else {
        // Generate new book_id based on the total number of books in the database
        const totalBooks = await Book.countDocuments();
        const book_id = totalBooks + 1;

        // Create a new book entry
        book = new Book({
          book_id,
          title,
          author,
          publication_date,
          category,
          total_copies: 1, // New book, so set initial total copies to 1
          available_copies: 1, // New book, so set initial available copies to 1
          book_photo: book_photo ? `/uploads/${book_photo}` : null, // Corrected syntax
        });

        await book.save();
        return res.status(201).json({ message: 'New book added successfully.', book });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  },
];
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


exports.getAllDonations = async (req, res) => {
  try {
    const donations = await BookDonation.find();
    res.status(200).json(donations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteDonation = async (req, res) => {
  try {
    const donationId = req.params.donation_id;
    const deletedDonation = await BookDonation.findOneAndDelete({ donation_id: donationId }); 
    if (!deletedDonation) {
      return res.status(404).json({ error: 'Donation not found' });
    }
    res.status(200).json({ message: 'Donation deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

////////////////////////////////////////////////////////////////////////////


// // Get all books including approved donated books
// exports.getAllBooksIncludingDonations = async (req, res) => {
//   try {
//     const books = await Book.find();
//     const approvedDonations = await BookDonation.find({ donation_status: 'approved' });
//     res.status(200).json({ books, approvedDonations });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// // Get all books that a user has
// exports.getUserBooks = async (req, res) => {
//   try {
//     const userId = req.params.user_id;
//     const userBooks = await Book.find({ user_id: userId });
//     res.status(200).json(userBooks);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// // Get all donated books for a user
// exports.getUserDonations = async (req, res) => {
//   try {
//     const userId = req.params.user_id;
//     const userDonations = await BookDonation.find({ user_id: userId });
//     res.status(200).json(userDonations);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// // Get all borrowed books for a user
// exports.getUserBorrowings = async (req, res) => {
//   try {
//     const userId = req.params.user_id;
//     const userBorrowings = await BookBorrowing.find({ user_id: userId });
//     res.status(200).json(userBorrowings);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// // Existing methods...

// exports.deleteDonation = async (req, res) => {
//   try {
//     const donationId = req.params.donation_id;
//     const deletedDonation = await BookDonation.findOneAndDelete({ donation_id: donationId });
//     if (!deletedDonation) {
//       return res.status(404).json({ error: 'Donation not found' });
//     }
//     res.status(200).json({ message: 'Donation deleted successfully' });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };
// /////

// // New routes
// router.get('/all-books-including-donations', bookController.getAllBooksIncludingDonations);
// router.get('/user-books/:user_id', bookController.getUserBooks);
// router.get('/user-donations/:user_id', bookController.getUserDonations);
// router.get('/user-borrowings/:user_id', bookController.getUserBorrowings);
exports.getimagebyid = async (req, res) => {
  try {
    const bookId = req.params.book_id;
    const book = await Book.findOne({ book_id: bookId });
    if (!book) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }
    res.status(200).json({ imageUrl: `http://localhost:5000${book.book_photo}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
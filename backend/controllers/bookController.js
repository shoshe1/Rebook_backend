const Book = require('../models/Book');
const multer = require('multer');
const path = require('path');
const BookBorrowing = require('../models/BookBorrowing');
const User = require('../models/User');
const BookDonation = require('../models/BookDonation');
const mongoose = require('mongoose');
const router = require('../routes/bookRoutes');

exports.getBooks = async (req, res) => {
  try {
    const books = await Book.find( {book_status : 'available' } );
    res.status(200).json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getBookById = async (req, res) => {
  try {
    console.log('Received params:', req.params);
    console.log('book_id type:', typeof req.params.book_id);
    
    const bookId = parseInt(req.params.book_id, 10);
    
    console.log('Parsed bookId:', bookId);
    console.log('Parsed bookId type:', typeof bookId);

    if (isNaN(bookId)) {
      return res.status(400).json({ 
        error: 'Invalid book ID', 
        receivedId: req.params.book_id 
      });
    }

    const book = await Book.findOne({ book_id: bookId }); 
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    res.status(200).json(book);
  } catch (error) {
    console.error('Book fetch error:', error);
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
const upload = multer({storage: storage});

exports.createBook = [
  upload.single('book_photo'), // Middleware to handle file upload
  async (req, res) => {
    try {
      const { title, author, publication_year, category } = req.body;

      // Set default photo if no photo uploaded
      const book_photo = req.file 
        ? `/uploads/${req.file.filename}` 
        : '/uploads/no_img.jpeg'; // Default book cover path

      // Find existing book with matching details
      let book = await Book.findOne({ 
        title, 
        author, 
        publication_year, 
        category 
      });

      if (book) {
        // If book exists, update copies and photo
        book.total_copies += 1;
        book.available_copies += 1;
        book.book_photo = book_photo;
        await book.save();
        return res.status(200).json({ 
          message: 'Book already exists. Updated available copies.', 
          book 
        });
      } else {
        // If book doesn't exist, create new book
        const totalBooks = await Book.countDocuments();
        const newBookId = totalBooks + 1;

        book = new Book({
          book_id: newBookId,
          title,
          author,
          publication_year,
          category,
          total_copies: 1,
          available_copies: 1,
          book_photo: book_photo
        });

        await book.save();
        return res.status(201).json({ 
          message: 'New book added successfully!', 
          book 
        });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
];

exports.deleteBook = async (req, res) => {
  try {
    const bookId = req.params.book_id;

    // Check if bookId is a valid number
    if (isNaN(bookId)) {
      return res.status(400).json({ error: 'Invalid book ID' });
    }

    const deletedBook = await Book.findOneAndDelete({ book_id: bookId });
    if (!deletedBook) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.status(200).json({ message: 'Book deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateBook = async (req, res) => {
  try {
    const bookId = req.params.book_id;

    // Check if bookId is a valid number
    if (isNaN(bookId)) {
      return res.status(400).json({ error: 'Invalid book ID' });
    }

    const updatedBook = await Book.findOneAndUpdate({ book_id: bookId }, req.body, { new: true });

    if (!updatedBook) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.status(200).json(updatedBook);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.borrowBook = async (req, res) => {
  try {
    const { book_id, due_date } = req.body;
    const user_id = req.user._id; // Get the logged-in user's ID from the auth middleware

    if (!book_id || !due_date) {
      return res.status(400).json({ error: 'book_id and due_date are required fields' });
    }

    const book = await Book.findOne({ book_id: parseInt(book_id, 10) });
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    if (book.available_copies <= 0) {
      return res.status(400).json({ error: 'Book is not available' });
    }

    book.available_copies--;
    await book.save();

    const borrowing = new BookBorrowing({
      book_id: book._id, // Use the ObjectId of the book
      user_id: new mongoose.Types.ObjectId(user_id), // Ensure user_id is an ObjectId
      due_date: new Date(due_date),
      borrowing_status: 'pending',
      borrow_date: new Date(),
      borrowing_id: Math.floor(Math.random() * 100000) // Generate a random borrowing_id
    });

    await borrowing.save();
    res.status(200).json({ message: 'Borrow request sent successfully', borrowing });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.acceptBorrowRequest = async (req, res) => {
  try {
    const { borrowing_id } = req.params;

    // Find the borrowing request
    const borrowing = await BookBorrowing.findOne({ borrowing_id: parseInt(borrowing_id, 10) });
    if (!borrowing) {
      return res.status(404).json({ error: 'Borrowing request not found' });
    }

    // Check if the borrowing request is already accepted
    if (borrowing.borrowing_status !== 'pending') {
      return res.status(400).json({ error: 'Borrowing request is not pending' });
    }

    // Update the borrowing status to 'borrowed'
    borrowing.borrowing_status = 'borrowed';
    await borrowing.save();

    res.status(200).json({ message: 'Borrowing request accepted successfully', borrowing });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.rejectBorrowRequest = async (req, res) => {
  try {
    const { borrowing_id } = req.params;

    // Find the borrowing request
    const borrowing = await BookBorrowing.findOne({ borrowing_id: parseInt(borrowing_id, 10) });
    if (!borrowing) {
      return res.status(404).json({ error: 'Borrowing request not found' });
    }

    // Check if the borrowing request is already accepted
    if (borrowing.borrowing_status !== 'pending') {
      
      return res.status(400).json({ error: 'Borrowing request is not pending' });
    }

    // Update the borrowing status to 'rejected'
    borrowing.borrowing_status = 'rejected';
    await borrowing.save();

    res.status(200).json({ message: 'Borrowing request rejected successfully', borrowing });
  } catch (error) {
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
    const book = await Book.findOne({ _id: borrowing.book_id });
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

exports.getBorrowRequestDetails = async (req, res) => {
  try {
      const { borrowing_id } = req.params;
      
      const borrowing = await BookBorrowing.findOne({ borrowing_id: parseInt(borrowing_id, 10) })
      .populate('user_id', 'username user_type user_number')
          .populate('book_id', 'title author');

      if (!borrowing) {
          return res.status(404).json({ error: 'Borrowing request not found' });
      }

      res.status(200).json(borrowing);
  } catch (error) {
      res.status(500).json({ error: error.message });
    }
};

exports.getAllBorrowings = async (req, res) => {
  try {
    const borrowings = await BookBorrowing.find({ borrowing_status: 'borrowed' })
      .populate('user_id', 'user_id username user_type user_number')
      .populate('book_id', 'book_id title author');
    res.status(200).json(borrowings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllreturnedBorrowingsByuserId = async (req, res) => {
 
    try{
      if(!req.uesr){
        return res.status(401).json({error:"unauthoeized.Log in please"});
      }  
      
      const borrowings=await bookborrowings.find({borrowing_status:"borrowed"}).populate('book_id','title auther').populate('user_id','username');
      res.status(200).json(borrowings);
    }catch(error){
      res.status(500).json({error:error.message});
    }
  
}
exports.getDonationById = async (req, res) => {
  try {
    const { donation_id } = req.params;
    const donation = await BookDonation.findOne({ donation_id });

    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    res.status(200).json(donation);
  } catch (error) {
    console.error('Error fetching donation details:', error);
    res.status(500).json({ error: 'Failed to fetch donation details' });
  }
};

exports.createDonation = async (req, res) => {
  try {
    const user_id = req.user._id; // Get user ID from authenticated user
    const { book_title, book_author, book_condition, book_photo, category, publication_year } = req.body;
    
    // Validate required fields
    if (!book_title || !book_author || !book_condition || !book_photo || !category || !publication_year) {
      return res.status(400).json({ 
        error: 'Book title, author, condition, photo, and category are required fields' 
      });
    }

    // Find or create the book
    let book = await Book.findOne({ title: book_title, author: book_author });
    if (!book) {
      const totalBooks = await Book.countDocuments();
      const newBookId = totalBooks + 1;

      book = new Book({
        book_id: newBookId,
        title: book_title,
        author: book_author,
        publication_year: publication_year || new Date().getFullYear(),
        category,
        total_copies: 1,
        available_copies: 1,
        book_photo
      });
      await book.save();
    }

    // Create donation with sanitized inputs
    const donation = new BookDonation({
      user_id: new mongoose.Types.ObjectId(user_id),
      user_name: req.user.username,
      book_id: book._id,
      book_title: book_title.trim(),
      book_author: book_author.trim(),
      donation_date: new Date(),
      book_condition: book_condition.toLowerCase(),
      book_photo,
      donation_id: Math.floor(Math.random() * 100000),
      donation_status: 'pending'
    });

    await donation.save();

    return res.status(201).json({
      success: true,
      message: 'Book donation created successfully',
      donation
    });

  } catch (error) {
    console.error('Error creating donation:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to create donation',
      details: error.message
    });
  }
};

exports.getAllDonations = async (req, res) => {
  try {
    const donations = await BookDonation.find( {borrowing_status : 'donated' } );
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
    res.status  (500).json({ error: error.message });
  }
};

exports.getTotalBooks = async (req, res) => {
  try {
    const totalBooks = await Book.countDocuments();
    res.status(200).json({ totalBooks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

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

exports.getAllReturnedBooksByUserId = async (req, res) => {
  try {
    const userId = parseInt(req.params.user_id, 10); // Ensure user_id is a number
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await User.findOne({ user_id: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const borrowings = await BookBorrowing.find({ user_id: user._id, borrowing_status: 'returned' }).populate('book_id');
    res.status(200).json(borrowings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUserBorrowedBooks = async (req, res) => {
  try {
    const user_id = req.user._id; // Get the logged-in user's ID from the auth middleware
    const borrowings = await BookBorrowing.find({ user_id })
      .populate('book_id', 'book_id title author publication_year category book_photo')
      .populate('user_id', 'user_id username');
    res.status(200).json(borrowings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.getuserborrowingbookbyborrowingid = async (req, res) => {
  try {
    const user_id = new mongoose.Types.ObjectId(req.user._id); // Correctly use the ObjectId constructor
    const { borrowing_id } = req.params;

    const borrowing = await BookBorrowing.findOne({ borrowing_id: borrowing_id, user_id })
      .populate('book_id', 'book_id title author publication_year category book_photo')
      .populate('user_id', 'user_id username');

    if (!borrowing) {
      return res.status(404).json({ error: 'Borrowed book not found' });
    }

    res.status(200).json(borrowing);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.getUsersBorrowingRequests = async (req, res) => {
  try {
    const borrowRequests = await BookBorrowing.find({ borrowing_status: 'pending' })
      .populate('book_id', 'title author')
      .populate('user_id', 'username');
    res.status(200).json(borrowRequests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getpendingdonationrequests = async (req, res) => {
  try {
    const donations = await BookDonation.find({ donation_status: 'pending' })
      .populate('book_id', 'title author')
      .populate('user_id', 'username' );
    res.status(200).json(donations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.acceptDonationRequest = async (req, res) => {
  try {
    const { donation_id } = req.params;
    const donation = await BookDonation.findOne({ donation_id: parseInt(donation_id, 10) });
    if (!donation) {
      return res.status(404).json({ error: 'Donation request not found' });
    }
    if (donation.donation_status !== 'pending') {
      return res.status(400).json({ error: 'Donation request is not pending' });
    }
    donation.donation_status = 'accepted';
    await donation.save();
    res.status(200).json({ message: 'Donation request accepted successfully', donation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.rejectdonationrequest = async (req, res) => {
  try {
    const { donation_id } = req.params;
    const user = await User.findOne({ user_id: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const borrowings = await BookBorrowing.find({ user_id: user._id, borrowing_status: 'returned' }).populate('book_id');
    res.status(200).json(borrowings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.getUserBorrowedBooks = async (req, res) => {
  try {
    const user_id = req.user._id; // Get the logged-in user's ID from the auth middleware
    const borrowings = await BookBorrowing.find({ user_id })
      .populate('book_id', 'book_id title author publication_year category book_photo')
      .populate('user_id', 'user_id username');
    res.status(200).json(borrowings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.getUsersBorrowingRequests = async (req, res) => {
  try {
    const borrowRequests = await BookBorrowing.find({ borrowing_status: 'pending' })
      .populate('book_id', 'title author')
      .populate('user_id', 'username');
    res.status(200).json(borrowRequests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getpendingdonationrequests = async (req, res) => {
  try {
    const donations = await BookDonation.find({ donation_status: 'pending' })
      .populate('book_id', 'title author book_id')
      .populate('user_id', 'username user_id user_number' );
    res.status(200).json(donations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.acceptDonationRequest = async (req, res) => {
  try {
    const { donation_id } = req.params;
    const donation = await BookDonation.findOne({ donation_id: parseInt(donation_id, 10) });
    if (!donation) {
      return res.status(404).json({ error: 'Donation request not found' });
    }
    if (donation.donation_status !== 'pending') {
      return res.status(400).json({ error: 'Donation request is not pending' });
    }
    donation.donation_status = 'accepted';
    await donation.save();
    res.status(200).json({ message: 'Donation request accepted successfully', donation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.rejectdonationrequest = async (req, res) => {
  try {
    const { donation_id } = req.params;

    // Find the donation request
    const donation = await BookDonation.findOne({ donation_id: parseInt(donation_id, 10) });
    if (!donation) {
      return res.status(404).json({ error: 'Donation request not found' });
    }

    // Check if the donation request is already accepted
    if (donation.donation_status !== 'pending') {
      return res.status(400).json({ error: 'Donation request is not pending' });
    }

    // Update the donation status to 'rejected'
    donation.donation_status = 'rejected';
    await donation.save();

    res.status(200).json({ message: 'Donation request rejected successfully', donation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

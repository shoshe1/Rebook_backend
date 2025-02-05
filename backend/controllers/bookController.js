const Book = require('../models/Book');
const multer = require('multer');
const path = require('path');
const BookBorrowing = require('../models/BookBorrowing');
const User = require('../models/User');
const BookDonation = require('../models/BookDonation');
const mongoose = require('mongoose');
const router = require('../routes/bookRoutes');
const upload = require('../middleware/upload'); // Ensure this is correctly imported
const fs = require('fs');

exports.uploadBookPhoto = (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  res.send({ image_url: `/uploads/${req.file.filename}` });
};



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



exports.createBook = async (req, res) => {
  try {
    // Check if all required fields are provided
    const { title, author, publication_year, category } = req.body;

    if (!title || !author || !publication_year || !category || !req.file) {
      return res.status(400).json({ error: 'All fields and file are required' });
    }

    // Check if the book already exists
    let book = await Book.findOne({ title, author, category, publication_year });

    if (!book) {
      const totalBooks = await Book.countDocuments();
      const book_id = totalBooks + 1;

      // Create the books directory if it doesn't exist
      const booksDir = path.join(__dirname, '../uploads/books');
      if (!fs.existsSync(booksDir)) {
        fs.mkdirSync(booksDir, { recursive: true });
      }

      // Extract the file extension
      const fileExtension = path.extname(req.file.originalname);
      // Rename the uploaded file to include the book_id and move it to the books directory
      const newFilename = `${book_id}${fileExtension}`;
      const newFilePath = path.join(booksDir, newFilename);

      fs.renameSync(req.file.path, newFilePath);

      const book_photo = `/uploads/books/${newFilename}`;

      book = new Book({
        book_id,
        title,
        author,
        publication_year: Number(publication_year),
        category,
        total_copies: 1,
        available_copies: 1,
        book_photo
      });

      await book.save(); // Save the new book
    } else {
      // If book exists, update copies and photo
      book.total_copies += 1;
      book.available_copies += 1;

      // Create the books directory if it doesn't exist
      const booksDir = path.join(__dirname, '../uploads/books');
      if (!fs.existsSync(booksDir)) {
        fs.mkdirSync(booksDir, { recursive: true });
      }

      // Extract the file extension
      const fileExtension = path.extname(req.file.originalname);
      // Rename the uploaded file to include the book_id and move it to the books directory
      const newFilename = `${book.book_id}${fileExtension}`;
      const newFilePath = path.join(booksDir, newFilename);

      fs.renameSync(req.file.path, newFilePath);

      book.book_photo = `/uploads/books/${newFilename}`;
      await book.save();
    }

    // Ensure you return the full URL for the book photo
    const imageUrl = `${req.protocol}://${req.get('host')}${book.book_photo}`;

    return res.status(201).json({ 
      success: true, 
      message: 'Book created successfully!', 
      book,
      imageUrl // Return full image URL
    });
  } catch (error) {
    console.error('Error creating book:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to create book', 
      details: error.message 
    });
  }
};

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



exports.addDonation = async (req, res) => {
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
    const donations = await BookDonation.find(  );
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


exports.createDonation = async (req, res) => {
  try {
    // Check if all required fields are provided
    const { book_title, book_author, book_condition, category, publication_year } = req.body;

    if (!book_title || !book_author || !book_condition || !category || !publication_year || !req.file) {
      return res.status(400).json({ error: 'All fields and file are required' });
    }

    // Check if the book already exists
    let book = await Book.findOne({ title: book_title, author: book_author, category, publication_year });
    let book_photo;

    if (!book) {
      const totalBooks = await Book.countDocuments();
      const book_id = totalBooks + 1;

      book = new Book({
        book_id,
        title: book_title,
        author: book_author,
        publication_year: Number(publication_year),
        category,
        total_copies: 1,
        available_copies: 1,
        book_photo: '' // Temporary placeholder
      });

      await book.save(); // Save the new book
      book_photo = ''; // Initialize book_photo for the new book
    } else {
      // If the book already exists, use the existing book_id and book_photo
      var book_id = book.book_id;
      book_photo = book.book_photo;
    }

    // Find the user making the donation
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create a new donation
    const totalDonations = await BookDonation.countDocuments();
    const donation_id = totalDonations + 1;

    // Create the donations directory if it doesn't exist
    const donationsDir = path.join(__dirname, '../uploads/donations');
    if (!fs.existsSync(donationsDir)) {
      fs.mkdirSync(donationsDir, { recursive: true });
    }

    // Rename the uploaded file to include the donation_id and move it to the donations directory
    const originalFilename = req.file.filename;
    const newFilename = `${donation_id}_${originalFilename}`;
    const newFilePath = path.join(donationsDir, newFilename);

    fs.renameSync(req.file.path, newFilePath);

    book_photo = `/uploads/donations/${newFilename}`;

    // Update the book with the correct book_photo
    if (!book.book_photo) {
      book.book_photo = book_photo;
      await book.save();
    }

    const newDonation = new BookDonation({
      donation_id,
      user_id: req.user._id,
      user_name: req.user.username,
      book_id: book._id,
      book_title,
      book_author,
      book_condition,
      category,
      publication_year: Number(publication_year),
      book_photo,
      donation_status: 'pending',
      donation_date: new Date()
    });

    await newDonation.save();

    return res.status(201).json({ 
      success: true, 
      message: 'Donation created successfully!', 
      donation: newDonation 
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
exports.createDonation = async (req, res) => {
  try {
    // Check if all required fields are provided
    const { book_title, book_author, book_condition, category, publication_year } = req.body;

    if (!book_title || !book_author || !book_condition || !category || !publication_year || !req.file) {
      return res.status(400).json({ error: 'All fields and file are required' });
    }

    // Check if the book already exists
    let book = await Book.findOne({ title: book_title, author: book_author, category, publication_year });
    let book_photo;

    if (!book) {
      const totalBooks = await Book.countDocuments();
      const book_id = totalBooks + 1;

      book = new Book({
        book_id,
        title: book_title,
        author: book_author,
        publication_year: Number(publication_year),
        category,
        total_copies: 1,
        available_copies: 1,
        book_photo: '' // Temporary placeholder
      });

      await book.save(); // Save the new book
      book_photo = ''; // Initialize book_photo for the new book
    } else {
      // If the book already exists, use the existing book_id and book_photo
      var book_id = book.book_id;
      book_photo = book.book_photo;
    }

    // Find the user making the donation
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create a new donation
    const totalDonations = await BookDonation.countDocuments();
    const donation_id = totalDonations + 1;

    // Create the donations directory if it doesn't exist
    const donationsDir = path.join(__dirname, '../uploads/donations');
    if (!fs.existsSync(donationsDir)) {
      fs.mkdirSync(donationsDir, { recursive: true });
    }

    // Extract the file extension
    const fileExtension = path.extname(req.file.originalname);
    // Rename the uploaded file to include the donation_id and move it to the donations directory
    const newFilename = `${donation_id}${fileExtension}`;
    const newFilePath = path.join(donationsDir, newFilename);

    fs.renameSync(req.file.path, newFilePath);

    book_photo = `/uploads/donations/${newFilename}`;

    // Update the book with the correct book_photo
    if (!book.book_photo) {
      book.book_photo = book_photo;
      await book.save();
    }

    const newDonation = new BookDonation({
      donation_id,
      user_id: req.user._id,
      user_name: req.user.username,
      book_id: book._id,
      book_title,
      book_author,
      book_condition,
      category,
      publication_year: Number(publication_year),
      book_photo,
      donation_status: 'pending',
      donation_date: new Date()
    });

    await newDonation.save();

    return res.status(201).json({ 
      success: true, 
      message: 'Donation created successfully!', 
      donation: newDonation 
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
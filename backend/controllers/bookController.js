const Book = require('../models/Book');
const mongoose = require('mongoose');
const BookBorrowing = require('../models/BookBorrowing');
const User = require('../models/User');  // Fixed import
const BookDonation = require('../models/BookDonation');
const { gfs, Attachment } = require('../middleware/gridfs-setup');
const { ObjectId } = mongoose.Types;
const fs = require('fs');
const path = require('path');

// Convert Buffer to base64 string
const bufferToBase64 = (buffer, mimetype) => {
  return `data:${mimetype};base64,${buffer.toString('base64')}`;
};

// Convert file on disk to base64 string
const fileToBase64 = (filePath, mimetype) => {
  try {
    const fileData = fs.readFileSync(filePath);
    return `data:${mimetype};base64,${fileData.toString('base64')}`;
  } catch (error) {
    console.error('Error converting file to base64:', error);
    return null;
  }
};
// bookController.js

// Function to handle searching books by title or author
exports.searchBooks = async (req, res) => {
    const query = req.query.query; // Get search query from the query string
    if (!query) {
        return res.status(400).json({ message: "Query parameter is required" });
    }

    try {
        // Search books by title or author (you can add more fields)
        const books = await Book.find({
            $or: [
                { title: { $regex: query, $options: 'i' } },  // Case-insensitive search
                { author: { $regex: query, $options: 'i' } }  // Case-insensitive search
            ]
        });

        res.json(books);  // Return the matching books
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to search books' });
    }
};

exports.uploadBookPhoto = (req, res) => {
  if (!req.file) {
    return res.status(400).send({ error: 'No file uploaded.' });
  }

  // Convert the buffer to base64
  const base64Image = bufferToBase64(req.file.buffer, req.file.mimetype);
  res.send({ image_url: base64Image });
};

exports.getBooks = async (req, res) => {
  try {
    const books = await Book.find({ book_status: 'available' });
    res.status(200).json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getBookById = async (req, res) => {
  try {
    const bookId = parseInt(req.params.book_id, 10);
    if (isNaN(bookId)) {
      return res.status(400).json({ error: 'Invalid book ID', receivedId: req.params.book_id });
    }

    const book = await Book.findOne({ book_id: bookId });
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.status(200).json(book);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a book with GridFS for image storage
exports.createBook = async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);

    const { title, author, publication_year, category } = req.body;

    if (!title || !author || !publication_year || !category) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Book photo is required' });
    }

    // Store the GridFS file ID
    const book_photo = req.file.id;

    let book = await Book.findOne({ title, author, category, publication_year });

    if (!book) {
      const totalBooks = await Book.countDocuments();
      book = new Book({
        book_id: totalBooks + 1,
        title,
        author,
        publication_year: Number(publication_year),
        category,
        total_copies: 1,
        available_copies: 1,
        book_photo
      });

      await book.save();
    } else {
      book.total_copies += 1;
      book.available_copies += 1;
      // Only update photo if a new one is provided
      if (book_photo) {
        book.book_photo = book_photo;
      }
      await book.save();
    }

    return res.status(201).json({
      success: true,
      message: 'Book created successfully!',
      book,
      imageUrl: `/api/books/photo/id/${book.book_photo}`
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

// Get book photo by filename
exports.getBookPhoto = async (req, res) => {
  try {
    const filename = req.params.filename;
    const file = await gfs.files.findOne({ filename });

    if (!file || file.length === 0) {
      return res.status(404).json({ error: 'No file exists' });
    }

    if (file.contentType === 'image/jpeg' || file.contentType === 'image/png' || file.contentType === 'image/gif') {
      // Set the content type header
      res.set('Content-Type', file.contentType);
      
      // Create a read stream and pipe it to the response
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({ error: 'Not an image' });
    }
  } catch (error) {
    console.error('Error fetching image by filename:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getBookPhotoById = async (req, res) => {
  try {
    const id = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const file = await gfs.files.findOne({ _id: new mongoose.Types.ObjectId(id) });

    if (!file) {
      return res.status(404).json({ error: 'File not found in database' });
    }

    res.set('Content-Type', file.contentType);
    const readstream = gfs.createReadStream(file._id);
    readstream.pipe(res);
  } catch (error) {
    console.error('Error in getBookPhotoById:', error);
    res.status(500).json({ error: error.message });
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
    const user_id = req.user._id; // Get logged-in user's ID

    if (!book_id || !due_date) {
      return res.status(400).json({ error: 'book_id and due_date are required fields' });
    }

    const bookIdNumber = Number(book_id); // Convert book_id to Number

    if (isNaN(bookIdNumber)) {
      return res.status(400).json({ error: 'Invalid book_id. It must be a number.' });
    }

    // Find book by book_id (the number, not MongoDB _id)
    const book = await Book.findOne({ book_id: bookIdNumber });

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    if (book.available_copies <= 0) {
      return res.status(400).json({ error: 'Book is not available' });
    }

    // Decrement available copies
    book.available_copies--;
    await book.save();

    // Create borrowing record with book's MongoDB _id
    const borrowing = new BookBorrowing({
      book_id: book._id, // Use the MongoDB _id from the book document
      user_id: new mongoose.Types.ObjectId(user_id),
      due_date: new Date(due_date),
      borrowing_status: 'pending',
      borrow_date: new Date(),
      borrowing_id: Math.floor(Math.random() * 100000)
    });

    await borrowing.save();
    res.status(200).json({
      message: 'Borrow request sent successfully',
      borrowing
    });
  } catch (error) {
    console.error('Error in borrowBook:', error);
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
          .populate('book_id', 'title author book_photo available_copies total_copies'); // Include book_photo

      if (!borrowing) {
          return res.status(404).json({ error: 'Borrowing request not found' });
      }

      res.status(200).json(borrowing);
  } catch (error) {
      res.status(500).json({ error: error.message });
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
  
};

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

// Create donation with GridFS
exports.createDonation = async (req, res) => {
  try {
    const { book_title, book_author, book_condition, category, publication_year } = req.body;

    if (!book_title || !book_author || !book_condition || !category || !publication_year) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Book photo is required' });
    }

    // Store the GridFS file ID instead of base64
    const book_photo = req.file.id;

    let book = await Book.findOne({ title: book_title, author: book_author, category, publication_year });

    if (!book) {
      const totalBooks = await Book.countDocuments();
      book = new Book({
        book_id: totalBooks + 1,
        title: book_title,
        author: book_author,
        publication_year: Number(publication_year),
        category,
        total_copies: 1,
        available_copies: 1,
        book_photo
      });

      await book.save();
    } else {
      book.total_copies += 1;
      book.available_copies += 1;
      if (book_photo) {
        book.book_photo = book_photo;
      }
      await book.save();
    }

    const totalDonations = await BookDonation.countDocuments();
    const newDonation = new BookDonation({
      donation_id: totalDonations + 1,
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
      donation: newDonation,
      imageUrl: `/api/books/photo/id/${book_photo}`
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
    res.status  (500).json({ error: error.message });
  }
};

exports.getTotalBooks = async (req, res) => {
  try {
    const totalBooks = await Book.countDocuments();
    res.status(200).json({ totalBooks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getimagebyid = async (req, res) => {
  try {
    const bookId = parseInt(req.params.book_id, 10);
    if (isNaN(bookId)) {
      return res.status(400).json({ error: 'Invalid book ID' });
    }

    const book = await Book.findOne({ book_id: bookId });

    if (!book || !book.book_photo) {
      return res.status(404).json({ error: 'Book or image not found' });
    }

    res.status(200).json({
      imageUrl: `/api/books/photo/id/${book.book_photo}`
    });
  } catch (error) {
    console.error('Error getting image by book ID:', error);
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

exports.addBook = async (req, res) => {
  try {
    const { book_id, title, author, category, publication_year, total_copies, available_copies } = req.body;

    if (!book_id || !title || !author || !category || !total_copies || !available_copies || !req.file) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingBook = await Book.findOne({ book_id });
    if (existingBook) {
      return res.status(400).json({ error: 'Book ID already exists' });
    }

    // Store the GridFS file ID instead of base64
    const book_photo = req.file.id;

    const book = new Book({
      book_id,
      title,
      author,
      category,
      publication_year,
      total_copies,
      available_copies,
      book_photo
    });

    await book.save();
    res.status(201).json({
      message: 'Book created successfully',
      book,
      imageUrl: `/api/books/photo/id/${book.book_photo}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.uploadFile = (req, res) => {
// DEBUG: List all files in the File collection
  const { upload } = require('../middleware/gridfs-setup');
  
  upload.single('file')(req, res, async (err) => {
    if (err) return res.status(500).json({ error: 'File upload failed', details: err.message });

    console.log(req.file); // Debugging - check if req.file exists

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    res.json({ 
      fileId: req.file.id,
      success: true,
      message: 'File uploaded successfully' 
    });
  });
};


exports.listAllFiles = async (req, res) => {
  try {
    const files = await mongoose.model('File').find().sort({uploadDate: -1}).limit(10);
    
    const fileInfo = files.map(file => ({
      id: file._id,
      filename: file.filename,
      originalname: file.originalname,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
      uploadDate: file.uploadDate
    }));
    
    res.status(200).json({
      count: fileInfo.length,
      files: fileInfo
    });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: error.message });
  }
};

// Improved proxy image function with better error handling
exports.proxyImage = async (req, res) => {
  try {
    const id = req.query.id;
    
    console.log(`proxyImage called for ID: ${id}`);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log(`Invalid ObjectId format: ${id}`);
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    // Set CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    
    // Find the file by ID directly in GridFS
    const file = await gfs.files.findOne({ _id: new mongoose.Types.ObjectId(id) });

    if (!file) {
      console.log(`File not found in GridFS for ID: ${id}`);
      return res.status(404).json({ error: 'File not found in database' });
    }

    console.log(`File found in GridFS: ${file.filename} (${file.contentType})`);
    
    // Set the content type header
    res.set('Content-Type', file.contentType || 'application/octet-stream');
    
    // Stream directly from GridFS
    const readstream = gfs.createReadStream({ _id: file._id });
    readstream.on('error', (error) => {
      console.error('Error streaming file from GridFS:', error);
      return res.status(500).json({ error: 'Error streaming file' });
    });
    
    // Pipe the GridFS stream to the response
    readstream.pipe(res);
    
  } catch (error) {
    console.error('Error in proxyImage:', error);
    res.status(500).json({ error: error.message });
  }
};

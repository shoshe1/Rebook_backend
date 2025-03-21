const Book = require('../models/Book');
const mongoose = require('mongoose');
const BookBorrowing = require('../models/BookBorrowing');
const User = require('../models/User');  // Fixed import
const BookDonation = require('../models/BookDonation');
const { uploadToGridFS, getBucket } = require('../middleware/gridfs-setup'); // Correctly import uploadToGridFS
const { ObjectId } = mongoose.Types;
const fs = require('fs');
const path = require('path');
const Notification = require('../models/notification'); // Ensure Notification model is imported
const { error } = require('console');

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
  const { query } = req.query;
  console.log('Search query:', query);


  try {
    // Convert `query` to a number if possible
    const queryNumber = !isNaN(query) ? Number(query) : null;


    // Build the search conditions
    const searchConditions = [];


    if (query) {
      searchConditions.push({ title: { $regex: query, $options: 'i' } });
      searchConditions.push({ author: { $regex: query, $options: 'i' } });
    }


    if (queryNumber !== null) {
      searchConditions.push({ book_id: queryNumber }); // Exact match for book_id
    }


    // Perform search
    const books = await Book.find({ $or: searchConditions });


    console.log('Search results:', books);
    res.json(books);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ message: err.message });
  }
};
exports.searchBorrowRequests = async (req, res) => {
  const { query } = req.query;
  console.log('Search borrow requests query:', query);


  try {
      const queryNumber = !isNaN(query) ? Number(query) : null;


      const borrowRequests = await BookBorrowing.find({ borrowing_status: "pending" })
          .populate({
              path: 'book_id',
              select: 'title author'
          })
          .populate({
              path: 'user_id',
              select: 'username'
          });


      const queryLower = query.toLowerCase();


      const filteredResults = borrowRequests.filter(request => {
          const bookTitle = request.book_id?.title?.toLowerCase() || '';
          const bookAuthor = request.book_id?.author?.toLowerCase() || '';
          const username = request.user_id?.username?.toLowerCase() || '';
          const borrowingId = request.borrowing_id ? String(request.borrowing_id) : '';


          return (
              bookTitle.includes(queryLower) ||
              bookAuthor.includes(queryLower) ||  
              username.includes(queryLower) ||
              borrowingId.includes(query)
          );
      });


      console.log('Filtered pending borrow requests:', filteredResults);
      res.json(filteredResults);
  } catch (err) {
      console.error('Search error:', err);
      res.status(500).json({ message: err.message });
  }
};
exports.searchDonations = async (req, res) => {
  const { query } = req.query;
  console.log('Search donations query:', query);


  try {
    const queryNumber = !isNaN(query) ? Number(query) : null;


    const donations = await BookDonation.find({ donation_status: 'pending' })
      .populate({
        path: 'user_id',
        select: 'username',
      });


    const queryLower = query.toLowerCase();


    const filteredResults = donations.filter(donation => {
      const bookTitle = donation.book_title?.toLowerCase() || '';
      const bookAuthor = donation.book_author?.toLowerCase() || '';
      const username = donation.user_id?.username?.toLowerCase() || '';
      const donationId = donation.donation_id ? String(donation.donation_id) : '';


      return (
        bookTitle.includes(queryLower) ||
        bookAuthor.includes(queryLower) ||
        username.includes(queryLower) ||
        donationId.includes(query)
      );
    });


    console.log('Filtered pending donations:', filteredResults);
    res.json(filteredResults);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ message: err.message });
  }
};
exports.searchManageRequests = async (req, res) => {
  const { query } = req.query;
  console.log('Search borrow requests query:', query);


  try {
      const queryNumber = !isNaN(query) ? Number(query) : null;


      // Find borrow requests with status 'borrowed'
      const borrowRequests = await BookBorrowing.find({ borrowing_status: "borrowed" })
          .populate({
              path: 'book_id',
              select: 'title author'
          })
          .populate({
              path: 'user_id',
              select: 'username'
          });


      const queryLower = query.toLowerCase();


      const filteredResults = borrowRequests.filter(request => {
          const bookTitle = request.book_id?.title?.toLowerCase() || '';
          const bookAuthor = request.book_id?.author?.toLowerCase() || '';
          const username = request.user_id?.username?.toLowerCase() || '';
          const borrowingId = request.borrowing_id ? String(request.borrowing_id) : '';
          const dueDate = request.due_date ? request.due_date.toISOString().slice(0, 10) : ''; // Format the due_date as "YYYY-MM-DD"


          return (
              bookTitle.includes(queryLower) ||
              bookAuthor.includes(queryLower) ||  
              username.includes(queryLower) ||
              borrowingId.includes(query) ||
              dueDate.includes(query) // Adding due date search logic
          );
      });


      console.log('Filtered borrowed requests:', filteredResults);
      res.json(filteredResults);
  } catch (err) {
      console.error('Search error:', err);
      res.status(500).json({ message: err.message });
  }
};


exports.uploadBookPhoto = (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
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

    // Upload file to GridFS
    const fileId = await uploadToGridFS(
      req.file.path,
      req.file.originalname,
      req.file.mimetype
    );

    let book = await Book.findOne({ title, author, category, publication_year });
    const maxBookId = await Book.findOne().sort({ book_id: -1 }).select('book_id');
    const nextBookId = maxBookId ? maxBookId.book_id + 1 : 1;
  
    if (!book) {
      const totalBooks = await Book.countDocuments();
      book = new Book({
        book_id: nextBookId,
        title,
        author,
        publication_year: Number(publication_year),
        category,
        total_copies: 1,
        available_copies: 1,
        book_photo: fileId.toString()
      });

      await book.save();
    } else {
      book.total_copies += 1;
      book.available_copies += 1;
      // Only update photo if a new one is provided
      if (fileId) {
        book.book_photo = fileId.toString();
      }
      await book.save();
    }

    return res.status(201).json({
      success: true,
      message: 'Book created successfully!',
      book,
      imageUrl: `/api/books/photo/${book.book_photo}`
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
    const fileId = req.params.id;
    console.log('Attempting to get book image with ID:', fileId);
    
    // Convert string to ObjectId
    let objectId;
    try {
      objectId = new mongoose.Types.ObjectId(fileId);
    } catch (err) {
      console.error('Invalid ObjectId format:', fileId);
      return res.status(400).json({ error: 'Invalid file ID format' });
    }
    
    // Get bucket
    const bucket = getBucket();
    if (!bucket) {
      throw new Error('GridFS bucket not initialized');
    }
    
    // First, get the file metadata to determine content type
    const db = mongoose.connection.db;
    const filesCollection = db.collection('uploads.files');
    const fileInfo = await filesCollection.findOne({ _id: objectId });
    
    if (!fileInfo) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Set proper Content-Type header
    if (fileInfo.metadata && fileInfo.metadata.mimetype) {
      res.set('Content-Type', fileInfo.metadata.mimetype);
    } else {
      // Fallback to a generic image type
      res.set('Content-Type', 'image/jpeg');
    }
    
    // Set other important headers
    res.set('Content-Disposition', 'inline');
    res.set('Cache-Control', 'public, max-age=31557600'); // Cache for a year
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    
    // Create a download stream
    const downloadStream = bucket.openDownloadStream(objectId);
    
    // Handle errors
    downloadStream.on('error', (error) => {
      console.error('Error in download stream:', error);
      // The response has already started, can't send an error response now
    });
    
    // Pipe the file data to the response
    downloadStream.pipe(res);
    
  } catch (error) {
    console.error('Error getting book photo:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
};

// Get book photo by ID - with improved error handling and CORS
exports.getBookPhotoByBookId = async (req, res) => {
  try {
    const bookId = parseInt(req.params.book_id, 10);
    console.log('Looking for photo for book ID:', bookId);
    
    const book = await Book.findOne({ book_id: bookId });
    console.log('Book found:', book ? 'Yes' : 'No');
    console.log('Book photo field:', book ? book.book_photo : 'N/A');
    
    if (!book || !book.book_photo) {
      return res.status(404).json({ error: 'Book photo not found' });
    }
    
    console.log('Redirecting to photo endpoint with ID:', book.book_photo);
    res.redirect(`/api/books/photo/${book.book_photo}`);
  } catch (error) {
    console.error('Error getting book photo by ID:', error);
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
    const borrowing = await BookBorrowing.findOne({ borrowing_id: parseInt(borrowing_id, 10) }).populate('book_id').populate('user_id'); // Populate user_id to get user details
    if (!borrowing) {
      return res.status(404).json({ error: 'Borrowing request not found' });
    }

    // Check if the borrowing request is already accepted
    if (borrowing.borrowing_status !== 'pending') {
      return res.status(400).json({ error: 'Borrowing request is not pending' });
    }

    // Get user_id (Number) from the User model
    const user = await User.findById(borrowing.user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update the borrowing status to 'borrowed'
    borrowing.borrowing_status = 'borrowed';
    await borrowing.save();

    const notificationMessage = `Your borrow request for "${borrowing.book_id?.title}" has been accepted.`;
    const newNotification = new Notification({
      userId: user.user_id, // Use the numeric user_id instead of ObjectId
      message: notificationMessage,
      status: "waiting",
      type:'borrow',
      bookName:borrowing.book_id.title,
      author:borrowing.book_id.author,
      category:borrowing.book_id.category,
      publishYear:borrowing.book_id.publication_year,
      bookPhoto:borrowing.book_id.book_photo
    });
    await newNotification.save();

    res.status(200).json({ message: 'Borrowing request accepted successfully', borrowing });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.rejectBorrowRequest = async (req, res) => {
  try {
    const { borrowing_id } = req.params;

    // Find the borrowing request and populate book_id and user_id
    const borrowing = await BookBorrowing.findOne({ borrowing_id: parseInt(borrowing_id, 10) })
      .populate('user_id')
      .populate('book_id'); // Populating book_id and user_id to get full details of the book and user

    if (!borrowing) {
      return res.status(404).json({ error: 'Borrowing request not found' });
    }

    // Check if the borrowing request is already processed
    if (borrowing.borrowing_status !== 'pending') {
      return res.status(400).json({ error: 'Borrowing request is not pending' });
    }

    // Get the user_id (Number) from the User model
    const user = await User.findById(borrowing.user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update the borrowing status to 'rejected'
    borrowing.borrowing_status = 'rejected';
    await borrowing.save();

    // Find the book using the book_id from the borrowing request
    const book = await Book.findById(borrowing.book_id); // Using the ObjectId reference
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Increment the available copies by 1 since the request is rejected
    book.available_copies += 1;
    await book.save();

    // Create a notification
    const notificationMessage = `Your borrow request for "${borrowing.book_id.title}" has been rejected.`;
    const newNotification = new Notification({
      userId: user.user_id, 
      message: notificationMessage,
      status: "rejected",
      type: 'borrow',
      bookName: borrowing.book_id.title,
      author: borrowing.book_id.author,
      category: borrowing.book_id.category,
      publishYear: borrowing.book_id.publication_year,
      bookPhoto: borrowing.book_id.book_photo
    });
    await newNotification.save();

    res.status(200).json({ message: 'Borrowing request rejected successfully', borrowing });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



exports.returnBook = async (req, res) => {
  try {
    const { borrowing_id } = req.params;
    const return_date = new Date();

    // Find the borrowing record
    const borrowing = await BookBorrowing.findOne({ borrowing_id }).populate('user_id').populate('book_id');

    if (!borrowing) {
      return res.status(404).json({ error: 'Borrowing record not found' });
    }

    if (borrowing.borrowing_status === 'returned') {
      return res.status(400).json({ error: 'Book is already returned' });
    }

    // Extract user_id
    const user_id = borrowing.user_id.user_id;  

    console.log("Processing return for borrowing_id:", borrowing_id);
    console.log("User ID extracted:", user_id);

    // Find the user using `user_id` (not `_id`)
    const user = await User.findOne({ user_id: user_id });

    if (!user) {
      console.error("User not found for ID:", borrowing.user_id);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log("User found:", user);

    // Find the book
    const book = await Book.findById(borrowing.book_id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Update borrowing record
    borrowing.return_date = return_date;
    borrowing.borrowing_status = 'returned';
    await borrowing.save();

    // Create notification
    const notificationMessage = `You have returned the book "${book.title}". Please fill in the delivery information.`;

    const newNotification = new Notification({
      userId: user.user_id,  // ✅ Use `user_id` (not `_id`)
      message: notificationMessage,
      type: 'return',
      bookName: book.title,
      author: book.author,
      category: book.category,
      publishYear: book.publication_year,
      bookPhoto: book.book_photo,
      status: 'waiting',
    });

    await newNotification.save();

    res.status(200).json({
      message: 'Book returned successfully and notification created',
      borrowing,
      notification: newNotification,
    });
  } catch (error) {
    console.error("Error in returnBook:", error);
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
    console.log('Request body:', req.body);
    console.log('Uploaded file:', req.file); // Log the uploaded file

    if (!req.file) {
      return res.status(400).json({ success: false, error: "Book photo is required" });
    }

    const { book_title, book_author, book_condition, category, publication_year } = req.body;

    // Validate required fields
    if (!book_title || !book_author || !book_condition || !category || !publication_year) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Upload file to GridFS
    const fileId = await uploadToGridFS(req.file.path, req.file.originalname, req.file.mimetype);
    console.log('GridFS file ID:', fileId); // Debugging check

    if (!fileId) {
      return res.status(500).json({ success: false, error: 'File upload failed' });
    }

    const totalDonations = await BookDonation.countDocuments();
    const newDonation = new BookDonation({
      donation_id: totalDonations + 1,
      user_id: req.user._id, // Ensure correct user ID
      user_name: req.user.username, // Ensure correct username
      book_title,
      book_author,
      book_condition,
      category,
      publication_year: Number(publication_year),
      book_photo: fileId.toString(),
      donation_status: 'pending',
      donation_date: new Date()
    });

    // Save the donation to the database
    await newDonation.save();

    return res.status(201).json({
      success: true,
      message: 'Donation created successfully!',
      donation: newDonation,
      imageUrl: `/api/books/photo/id/${fileId}` // Fixed incorrect reference
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

// Get image by book ID
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
    
    // Return a URL to the image endpoint
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
    console.log('Fetching pending donation requests...');

    const pendingDonations = await BookDonation.find({ donation_status: 'pending' })
      .populate({ path: 'user_id', select: 'username', strictPopulate: false });

    console.log('Pending Donations Data:', JSON.stringify(pendingDonations, null, 2)); 

    res.setHeader('Content-Type', 'application/json'); // ✅ Explicitly set JSON response type
    res.status(200).json({ success: true, data: pendingDonations });
  } catch (error) {
    console.error('Error fetching pending donation requests:', error);
    res.setHeader('Content-Type', 'application/json'); // ✅ Ensure error response is also JSON
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch pending donation requests' });
  }
};



exports.acceptDonationRequest = async (req, res) => {
  try {
    const { donation_id } = req.params;

    // Find the donation request
    const donation = await BookDonation.findOne({ donation_id: parseInt(donation_id, 10) })
      .populate('user_id'); 

    if (!donation) {
      return res.status(404).json({ error: 'Donation request not found' });
    }

    if (donation.donation_status !== 'pending') {
      return res.status(400).json({ error: 'Donation request is not pending' });
    }

    const user = await User.findById(donation.user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    console.log("user:",user);
    // Update donation status to 'accepted'
    donation.donation_status = 'accepted';
    await donation.save();

    // Create a notification with the book details
    const notificationMessage = `Your donation request for "${donation.book_title}" has been accepted.`;
    const newNotification = new Notification({
      userId: user.user_id, 
      message: notificationMessage,
      status: "waiting",
      type: "donation",
      bookName: donation.book_title, // Pass book details
      author: donation.book_author,
      category: donation.category,
      publishYear: donation.publication_year,
      bookPhoto: donation.book_photo
    });
    await newNotification.save();
    console.log("Notification saved successfully");

    res.status(200).json({ 
      message: 'Donation request accepted and notification created successfully', 
      donation,
      notification: newNotification 
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



exports.rejectdonationrequest = async (req, res) => {
  try {
    const { donation_id } = req.params;

    // Find the donation request and populate user_id
    const donation = await BookDonation.findOne({ donation_id: parseInt(donation_id, 10) })
      .populate('user_id'); 

    if (!donation) {
      return res.status(404).json({ error: 'Donation request not found' });
    }

    // Ensure the request is still pending
    if (donation.donation_status !== 'pending') {
      return res.status(400).json({ error: 'Donation request is not pending' });
    }

    // Get the user_id (Number) from the User model
    const user = await User.findById(donation.user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update status to 'rejected'
    donation.donation_status = 'rejected';
    await donation.save();

    // Send a notification to the customer
    const notificationMessage = `Your donation request for "${donation.book_title}" has been rejected.`;
    const newNotification = new Notification({
      userId: user.user_id, // Use the numeric user_id instead of ObjectId
      message: notificationMessage,
      status: "rejected",
      type:"donation",
    });
    await newNotification.save();

    res.status(200).json({ 
      message: 'Donation request rejected successfully', 
      donation,
      notification: newNotification 
    });

  } catch (error) {
    console.error('Error rejecting donation request:', error.message);
    res.status(500).json({ error: error.message });
  }
};



exports.addBook = async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);

    const { book_id, title, author, category, publication_year, total_copies, available_copies } = req.body;

    // Validate required fields
    if (!book_id || !title || !author || !category || !total_copies || !available_copies || !req.file) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if book already exists
    const existingBook = await Book.findOne({ book_id });
    if (existingBook) {
      return res.status(400).json({ error: 'Book ID already exists' });
    }

    // Store the MongoDB ID of the uploaded file
    const book_photo = req.file.id;

    // Create new book
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
      book: {
        book_id: book.book_id,
        title: book.title,
        author: book.author,
        category: book.category,
        publication_year: book.publication_year,
        total_copies: book.total_copies,
        available_copies: book.available_copies,
        book_photo: book.book_photo
      },
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
    
    // Find the file by ID
    const File = mongoose.model('File');
    const file = await File.findById(id);

    if (!file) {
      console.log(`File not found in database for ID: ${id}`);
      
      // Try to serve a default image
      const defaultPath = path.join(__dirname, '..', 'uploads', 'no_img.jpeg');
      if (fs.existsSync(defaultPath)) {
        console.log('Serving default image instead');
        res.set('Content-Type', 'image/jpeg');
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        return fs.createReadStream(defaultPath).pipe(res);
      }
      
      return res.status(404).json({ error: 'File not found in database' });
    }

    console.log(`File found: ${file.filename} (${file.mimetype})`);
    
    // Set CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    
    // Set the content type header
    res.set('Content-Type', file.mimetype || 'application/octet-stream');
    
    // Create a read stream from the file path
    const filePath = path.join(__dirname, '..', 'uploads', file.filename);
    console.log(`Looking for file at: ${filePath}`);
    
    if (fs.existsSync(filePath)) {
      console.log('File exists on disk, streaming...');
      return fs.createReadStream(filePath).pipe(res);
    } else {
      console.log(`File missing from disk: ${filePath}`);
      
      // Try to serve a default image
      const defaultPath = path.join(__dirname, '..', 'uploads', 'no_img.jpeg');
      if (fs.existsSync(defaultPath)) {
        console.log('Serving default image instead');
        res.set('Content-Type', 'image/jpeg');
        return fs.createReadStream(defaultPath).pipe(res);
      }
      
      res.status(404).json({ error: 'File not found on disk' });
    }
  } catch (error) {
    console.error('Error in proxyImage:', error);
    res.status(500).json({ error: error.message });
  }
};

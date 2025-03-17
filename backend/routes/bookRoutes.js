const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const auth = require('../middleware/auth');
const verifyRole = require('../middleware/verifyRole');
const { upload, uploadToGridFS, getFileStream, getBucket } = require('../middleware/gridfs-setup');

// Static and photo routes should come first
router.get('/photo/:id', bookController.getBookPhoto);
router.get('/photo-by-book-id/:book_id', bookController.getBookPhotoByBookId);
router.get('/image/:book_id', auth, bookController.getimagebyid);
router.get('/get_total_books', auth, bookController.getTotalBooks);
router.get('/get_returned_books', auth, bookController.getAllreturnedBorrowingsByuserId);

// Donations
router.get('/donations', auth, verifyRole('librarian'), bookController.getAllDonations);
router.delete('/donate/:donation_id', auth, verifyRole('librarian'), bookController.deleteDonation);
router.post('/donate',
  auth, 
  verifyRole('customer'), 
  upload.single('book_photo'),
  bookController.createDonation
);
router.get('/pending-donation-requests', auth, verifyRole('librarian'), bookController.getpendingdonationrequests);
router.put('/accept-donation/:donation_id', auth, verifyRole('librarian'), bookController.acceptDonationRequest);
router.put('/reject-donation/:donation_id', auth, verifyRole('librarian'), bookController.rejectdonationrequest);
router.get('/pending-donation-requests/:donation_id', auth, verifyRole('librarian'), bookController.getDonationById);

// Borrowing
router.post('/borrow', auth, verifyRole('customer'), bookController.borrowBook);
router.put('/return/:borrowing_id', auth, verifyRole('customer'), bookController.returnBook);
router.get('/borrowings', auth, verifyRole('librarian'), bookController.getAllBorrowings);
router.get('/my-borrowings', auth, verifyRole('customer'), bookController.getUserBorrowedBooks);
router.get('/my-borrowings/:borrowing_id', auth, verifyRole('customer'), bookController.getuserborrowingbookbyborrowingid);
router.get('/borrow-requests', auth, verifyRole('librarian'), bookController.getUsersBorrowingRequests);
router.put('/accept-borrow/:borrowing_id', auth, verifyRole('librarian'), bookController.acceptBorrowRequest);
router.put('/reject-borrow/:borrowing_id', auth, verifyRole('librarian'), bookController.rejectBorrowRequest);
router.get('/borrow-requests/:borrowing_id', auth, verifyRole('librarian'), bookController.getBorrowRequestDetails);
router.get('/user-borrowings/:borrowing_id', auth, verifyRole('customer'), bookController.getuserborrowingbookbyborrowingid);

// Book listing routes
router.get('/customer', auth, verifyRole('customer'), bookController.getBooks);
router.get('/customer/:book_id', auth, verifyRole('customer'), bookController.getBookById);
router.get('/returned_books/:user_id', auth, bookController.getAllReturnedBooksByUserId);

// Upload route
router.post('/upload', auth, upload.single('image'), bookController.uploadBookPhoto);

// General book routes - keep these after more specific routes
router.get('/', auth, verifyRole('librarian'), bookController.getBooks);
router.post('/', 
  auth, 
  verifyRole('librarian'), 
  upload.single('book_photo'),
  bookController.createBook
);
router.put('/:book_id', auth, verifyRole('librarian'), bookController.updateBook);
router.delete('/:book_id', auth, verifyRole('librarian'), bookController.deleteBook);

// This should be the LAST route with :book_id parameter
router.get('/:book_id', auth, bookController.getBookById);


module.exports = router;

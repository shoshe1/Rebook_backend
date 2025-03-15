const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const auth = require('../middleware/auth');
const verifyRole = require('../middleware/verifyRole');
const { upload } = require('../middleware/gridfs-setup');
const cors = require('cors');

// DEBUG route - putting this first to ensure it's not blocked by other routes
router.get('/debug/files', bookController.listAllFiles);

// Public image routes with custom CORS handling
router.get('/photo/filename/:filename', cors(), bookController.getBookPhoto);
router.get('/photo/id/:id', cors(), bookController.getBookPhotoById);
// bookRoutes.js

// Add a route for searching books
router.get('/search', auth,  bookController.searchBooks);

// Add a proxy image route that doesn't require authentication
router.get('/proxy-image', cors(), bookController.proxyImage);

// Add a test endpoint to debug image loading
router.get('/test-image/:id', (req, res) => {
    const id = req.params.id;
    res.json({
        message: 'Test image endpoint',
        id: id,
        proxyUrl: `/api/books/proxy-image?id=${id}`,
        directUrl: `/api/books/photo/id/${id}`
    });
});

// Donations
router.get('/donations', auth, verifyRole('librarian'), bookController.getAllDonations);
router.delete('/donate/:donation_id', auth, verifyRole('librarian'), bookController.deleteDonation);
router.post('/donate',
  auth, 
  verifyRole('customer'), 
  upload.single('book_photo'), // Ensure this matches the frontend field name
  bookController.createDonation
);
router.get('/pending-donation-requests', auth, verifyRole('librarian'), bookController.getpendingdonationrequests);
router.put('/accept-donation/:donation_id', auth, verifyRole('librarian'), bookController.acceptDonationRequest);
router.put('/reject-donation/:donation_id', auth, verifyRole('librarian'), bookController.rejectdonationrequest);
router.get('/pending-donation-requests/:donation_id', auth, verifyRole('librarian'), bookController.getDonationById);

// Borrowing
router.get('/borrowings', auth, verifyRole('librarian'), bookController.getAllBorrowings);
router.get('/my-borrowings', auth, verifyRole('customer'), bookController.getUserBorrowedBooks);
router.get('/my-borrowings/:borrowing_id', auth, verifyRole('customer'), bookController.getuserborrowingbookbyborrowingid);
router.get('/borrow-requests', auth, verifyRole('librarian'), bookController.getUsersBorrowingRequests);
router.get('/borrow-requests/:borrowing_id', auth, verifyRole('librarian'), bookController.getBorrowRequestDetails);
router.get('/user-borrowings/:borrowing_id', auth, verifyRole('customer'), bookController.getuserborrowingbookbyborrowingid);
router.post('/borrow', auth, verifyRole('customer'), bookController.borrowBook);
router.put('/return/:borrowing_id', auth, verifyRole('customer'), bookController.returnBook);
router.put('/accept-borrow/:borrowing_id', auth, verifyRole('librarian'), bookController.acceptBorrowRequest);
router.put('/reject-borrow/:borrowing_id', auth, verifyRole('librarian'), bookController.rejectBorrowRequest);

// Book data routes
router.get('/customer', auth, verifyRole('customer'), bookController.getBooks);
router.get('/get_total_books', auth, bookController.getTotalBooks);
router.get('/get_returned_books', auth, bookController.getAllreturnedBorrowingsByuserId);
router.get('/returned_books/:user_id', auth, bookController.getAllReturnedBooksByUserId);
router.get('/image/:book_id', auth, bookController.getimagebyid);

// Add route for uploading book photos
router.post('/upload', auth, upload.single('image'), bookController.uploadBookPhoto);

// Generic file upload route - no authentication required for testing
router.post('/upload-file', bookController.uploadFile);

// Book CRUD operations
router.post('/', auth, verifyRole('librarian'), upload.single('book_photo'), bookController.createBook);
router.put('/:book_id', auth, verifyRole('librarian'), bookController.updateBook);
router.delete('/:book_id', auth, verifyRole('librarian'), bookController.deleteBook);
router.get('/customer/:book_id', auth, verifyRole('customer'), bookController.getBookById);
router.get('/:book_id', auth, bookController.getBookById);

// IMPORTANT: This should be last - general endpoint
router.get('/', auth, verifyRole('librarian'), bookController.getBooks);

// Enable CORS specifically for this route
router.use(
  cors({
    origin: 'https://project-client-side-rjgz.onrender.com',
    credentials: true,
  })
);

module.exports = router;
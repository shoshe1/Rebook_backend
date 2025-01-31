const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const auth = require('../middleware/auth');
const verifyRole = require('../middleware/verifyRole');

// Donations
router.get('/donations', auth, verifyRole('librarian'), bookController.getAllDonations);
router.delete('/donate/:donation_id', auth, verifyRole('librarian'), bookController.deleteDonation);
router.post('/donate', auth, verifyRole('customer'), bookController.createDonation);

// Borrowing
router.post('/borrow', auth, verifyRole('customer'), bookController.borrowBook);
router.put('/return/:borrowing_id', auth, verifyRole('customer'), bookController.returnBook);
router.get('/borrowings', auth, verifyRole('librarian'), bookController.getAllBorrowings);
router.get('/my-borrowings', auth, verifyRole('customer'), bookController.getUserBorrowedBooks);
router.get('/borrow-requests', auth, verifyRole('librarian'), bookController.getUsersBorrowingRequests);
// Book
router.get('/', auth, bookController.getBooks);
router.get('/:book_id', auth, bookController.getBookById);
router.post('/', auth, verifyRole('librarian'), bookController.createBook);
router.put('/:book_id', auth, verifyRole('librarian'), bookController.updateBook);
router.delete('/:book_id', auth, verifyRole('librarian'), bookController.deleteBook);
router.get('/image/:book_id', auth, bookController.getimagebyid);
router.get('/get_total_books', auth, bookController.getTotalBooks);
router.get('/get_returned_books', auth, bookController.getAllreturnedBorrowingsByuserId);
router.get('/returned_books/:user_id', auth, bookController.getAllReturnedBooksByUserId);

// Enable CORS specifically for this route
const cors = require('cors');
router.use(
  cors({
    origin: 'https://project-client-side-rjgz.onrender.com',
    credentials: true,
  })
);

router.get('/', (req, res) => {
  res.json({ message: 'Books data' });
});

module.exports = router;
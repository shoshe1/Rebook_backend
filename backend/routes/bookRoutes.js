const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const {deleteBook} = require('../controllers/bookController');
//donations
router.get('/donations', bookController.getAllDonations);
router.delete('/donate/:donation_id', bookController.deleteDonation);
router.post('/donate', bookController.createDonation);


//borrowing
router.post('/borrow', bookController.borrowBook);
router.put('/return/:borrowing_id', bookController.returnBook);
router.get('/borrowings', bookController.getAllBorrowings);

//book
router.get('/', bookController.getBooks);
router.get('/:book_id', bookController.getBookById); // Use book_id for fetching
router.post('/', bookController.createBook);
router.put('/:book_id', bookController.updateBook);
router.delete('/:book_id', bookController.deleteBook);
router.get('/image/:book_id', bookController.getimagebyid);
router.get('/get_total_books', bookController.getTotalBooks);
const cors = require('cors');
// Enable CORS specifically for this route
router.use(
  cors({
    origin: 'https://project-client-side-web.onrender.com',
    credentials: true,
  })
);

router.get('/', (req, res) => {
  res.json({ message: 'Books data' });
});
//user
module.exports = router;
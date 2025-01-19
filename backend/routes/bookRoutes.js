// const express = require('express');
// const { getbooks, getBookById, createBook, updateBook, deleteBook } = require('../controllers/bookController');
// const router = express.Router();


// router.get('/', getbooks);   
// router.get('/:id', getBookById);
// router.post('/', createBook);
// router.put('/:id', updateBook);
// router.delete('/:id', deleteBook);


// module.exports = router;
const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');

//book
router.get('/', bookController.getBooks);
router.get('/:book_id', bookController.getBookById); // Use book_id for fetching
router.post('/', bookController.createBook);
router.put('/:book_id', bookController.updateBook);
router.delete('/:book_id', bookController.deleteBook);
//borrowing
router.post('/borrow', bookController.borrowBook);
router.put('/return', bookController.returnBook);
router.get('/donations', bookController.getalldonations);
router.get('/borrowings', bookController.getallBorrowings);
//donations
router.post('/donate', bookController.createDonation);
router.put('/updateDonationStatus', bookController.updateDonationStatus);
router.delete('/donate/:donation_id', bookController.deleteDonation);

//user
module.exports = router;

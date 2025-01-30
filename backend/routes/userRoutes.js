const {getUsers , addUser, getUserById, updateUser, deleteUser, deleteUserById , log_in, log_out } = require('../controllers/userController');

const express = require('express');
const router = express.Router();
const user_controller = require('../controllers/userController');
const auth = require('../middleware/auth');
const verifyRole = require('../middleware/verifyRole');

router.get('/', auth, verifyRole('librarian'), user_controller.getUsers);
router.post('/create-account', auth, verifyRole('librarian'), user_controller.addUser);
router.get('/:user_id', auth, user_controller.getUserById);
// router.put('/:id', updateUser);
router.post('/login', user_controller.log_in);
router.post('/logout', auth, user_controller.log_out);
router.delete('/:user_id', auth, verifyRole('librarian'), user_controller.deleteUser);
router.get('/:user_id/donations', auth, user_controller.user_donations_history);
router.get('/:user_id/borrowings', auth, user_controller.user_borrowing_history);

module.exports = router;
const {getUsers , addUser, getUserById, updateUser, deleteUser, deleteUserById} = require('../controllers/userController');
const express = require('express');
const router = express.Router();
const user_controller = require('../controllers/userController');
router.get('/', user_controller.getUsers);   
router.get('/:user_id', user_controller.getUserById);
router.post('/', user_controller.addUser);
// router.put('/:id', updateUser);
router.post('/login', user_controller.log_in);
router.post('/logout', user_controller.log_out);
router.delete('/:user_id', user_controller.deleteUser);
router.get('/:user_id/donations',user_controller.user_donations_history);
router.get('/:user_id/borrowings',user_borrowing_history);

module.exports = router
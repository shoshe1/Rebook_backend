const {getUsers , addUser, getUserById, updateUser, deleteUser} = require('../controllers/userController');
const express = require('express');
const router = express.Router();

router.get('/', getUsers);   
router.get('/:id', getUserById);
router.post('/', addUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
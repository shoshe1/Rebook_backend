const { getStudyRooms, getStudyRoomById, createStudyRoom, updateStudyRoom, deleteStudyRoom } = require('../controllers/studyRoomController');
const express = require('express');
const router = express.Router();

router.get('/', getStudyRooms);   
router.get('/:id', getStudyRoomById);
router.post('/', createStudyRoom);
router.put('/:id', updateStudyRoom);
router.delete('/:id', deleteStudyRoom);

module.exports = router;
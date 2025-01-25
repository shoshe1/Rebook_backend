const express = require('express');
const router = express.Router();
const studyRoomController = require('../controllers/studyRoomController');

// Study Room routes
router.get('/', studyRoomController.getAllStudyRooms);
router.get('/emptyRooms', studyRoomController.getEmptyRooms);
router.get('/occupiedRooms', studyRoomController.getOccupiedRooms);
router.get('/:room_id', studyRoomController.getStudyRoomById);
router.post('/', studyRoomController.createStudyRoom);
router.put('/:room_id', studyRoomController.updateStudyRoomStatus);
router.delete('/:room_id', studyRoomController.deleteStudyRoom);
router.post('/book', studyRoomController.bookRoom);
router.get('/room_requests', studyRoomController.getStudyRoomsRequests);

module.exports = router;
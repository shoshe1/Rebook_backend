const studyRoom = require('../models/studyRoom');
const { json } = require('express');

exports.getAllStudyRooms = async (req, res) => {
    try {

        const studyRooms = await studyRoom.find();
        res.status(200).json(studyRooms);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }


};
exports.getempytRooms = async (req, res) => {
    try {

        const emptyRooms = await studyRoom.find({ status: 'available' });
        res.status(200).json(emptyRooms);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getoccupiedRooms = async (req, res) => {
    try {

        const occupiedRooms = await studyRoom.find({ status: 'booked' });
        res.status(200).json(occupiedRooms);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.bookRoom = async (req, res) => {
    try {
        const { room_id, user_id, booking_date, booking_id } = req.body;
        const room = await studyRoom.findOne({ room_id });
        if (!room) {
            res.status(404).json({ error: 'Room not found' });
            return;
        }
        if (room.status === 'booked') {
            res.status(400).json({ error: 'Room is not available' });
            return;
        }
        const booking = new RoomBooking({ room_id, user_id, booking_date, booking_id: Math.floor(Math.random() * 100000) });
        await booking.save();
        room.status = 'booked';
        await room.save();
        res.status(200).json({ message: 'Room booked successfully', booking });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};

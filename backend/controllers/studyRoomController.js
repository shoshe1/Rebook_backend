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
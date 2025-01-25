const StudyRoom = require('../models/StudyRoom');
const RoomBooking = require('../models/RoomBooking');

exports.getAllStudyRooms = async (req, res) => {
  try {
    const studyRooms = await StudyRoom.find();
    res.status(200).json(studyRooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getEmptyRooms = async (req, res) => {
  try {
    const emptyRooms = await StudyRoom.find({ room_status: 'available' });
    res.status(200).json(emptyRooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getOccupiedRooms = async (req, res) => {
  try {
    const occupiedRooms = await StudyRoom.find({ room_status: 'booked' });
    res.status(200).json(occupiedRooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getStudyRoomById = async (req, res) => {
  try {
    const roomId = req.params.id;
    const room = await StudyRoom.findById(roomId);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    res.status(200).json(room);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createStudyRoom = async (req, res) => {
  try {
    const { room_id, capacity, room_status } = req.body;
    const newRoom = new StudyRoom({ room_id, capacity, room_status });
    await newRoom.save();
    res.status(201).json(newRoom);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateStudyRoomStatus = async (req, res) => {
  try {
    const roomId = req.params.id;
    const room = await StudyRoom.findById(roomId);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    Object.assign(room, req.body);
    await room.save();
    res.status(200).json(room);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteStudyRoom = async (req, res) => {
  try {
    const roomId = req.params.id;
    const deletedRoom = await StudyRoom.findByIdAndDelete(roomId);
    if (!deletedRoom) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.status(200).json({ message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.bookRoom = async (req, res) => {
  try {
    const { room_id, user_id, booking_date } = req.body;
    const room = await StudyRoom.findOne({ room_id });
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    if (room.room_status === 'booked') {
      res.status(400).json({ error: 'Room is not available' });
      return;
    }
    const booking = new RoomBooking({ room_id, user_id, booking_date, booking_id: Math.floor(Math.random() * 100000) });
    await booking.save();
    room.room_status = 'booked';
    await room.save();
    res.status(200).json({ message: 'Room booked successfully', booking });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getStudyRoomsRequests = async (req, res) => {
    try {
      // Fetch all room bookings
      const roomBookings = await RoomBooking.find();
  
      // Fetch user details for each booking
      const detailedRequests = await Promise.all(roomBookings.map(async (booking) => {
        const user = await User.findOne({ user_id: booking.user_id });
        return {
          user_id: user.user_id,
          username: user.username,
          booking_date: booking.booking_date,
          room_id: booking.room_id,
          booking_id: booking.booking_id
        };
      }));
  
      res.status(200).json(detailedRequests);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

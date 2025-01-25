const mongoose = require('mongoose');

const roomBookingSchema = new mongoose.Schema({
  room_id: { type: Number, required: true },
  user_id: { type: Number, required: true },
  booking_date: { type: Date, required: true },
  booking_id: { type: Number, required: true, unique: true }
});

module.exports = mongoose.model('RoomBooking', roomBookingSchema);
const roomBookingSchema = new mongoose.Schema({
    booking_id: { type: Number, required: true, unique: true },
    room_id: { type: Number, required: true, ref: 'StudyRoom' },
    user_id: { type: Number, required: true, ref: 'User' },
    booking_date: { type: Date, default: Date.now },
    start_time: { type: Date, required: true },
    end_time: { type: Date, required: true },
    booking_status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' },
  });
  
  module.exports = mongoose.model('RoomBooking', roomBookingSchema);
  
const studyRoomSchema = new mongoose.Schema({
    room_id: { type: Number, required: true, unique: true },
    capacity: { type: Number, required: true },
    room_status: { type: String, enum: ['available', 'booked'], default: 'available' },
  });
  
  module.exports = mongoose.model('StudyRoom', studyRoomSchema);
  
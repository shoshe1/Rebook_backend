const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  notification_id: { 
    type: mongoose.Schema.Types.ObjectId,  
    unique: true, 
    default: function () {
      return new mongoose.Types.ObjectId(); 
    }
  },
  userId: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['waiting', 'filledin', 'rejected'], default: 'waiting' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false },
  type: { type: String, enum: ['donation', 'return', 'borrow'], required: true },
  bookName: { type: String }, // Book details
  author: { type: String },
  category: { type: String },
  publishYear: { type: Number },
  bookPhoto: { type: mongoose.Schema.Types.ObjectId } // Optional
});

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;

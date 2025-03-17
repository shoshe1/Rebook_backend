const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  customer_id: { type: Number, required: true }, // ID of the customer who receives the notification
  message: { type: String, required: true }, // The notification message
  isRead: { type: Boolean, default: false }, // Whether the notification has been read
  createdAt: { type: Date, default: Date.now }, // Timestamp when the notification was created
  updatedAt: { type: Date, default: Date.now }  // Timestamp when the notification was last updated
});

module.exports = mongoose.model('Notification', notificationSchema);

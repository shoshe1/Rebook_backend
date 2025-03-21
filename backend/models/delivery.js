const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  name: { type: String, required: true },
  userId: { type: String, required: true },
  address: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  preferredDate: { type: Date, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  notificationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Notification', required: true },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['on the way', 'delivered'], default: 'on the way' },
  type: { type: String, enum: ['donation', 'return', 'borrow'], required: true },
  bookName: { type: String }, // Book details
  author: { type: String },
  category: { type: String },
  publishYear: { type: Number },
  bookPhoto: { type: mongoose.Schema.Types.ObjectId } 
});

module.exports = mongoose.model('Delivery', deliverySchema);

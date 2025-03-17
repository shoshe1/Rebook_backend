const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  name: { type: String, required: true }, // User's name
  userId: { type: String, required: true }, // User's ID
  address: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  preferredDate: { type: Date, required: true },
  latitude: { type: Number, required: true }, // Latitude from the map
  longitude: { type: Number, required: true }, // Longitude from the map
  createdAt: { type: Date, default: Date.now },
  status:{type:String,enum:['on the way','delivered'],default:'on the way'},
});

module.exports = mongoose.model('Delivery', deliverySchema);

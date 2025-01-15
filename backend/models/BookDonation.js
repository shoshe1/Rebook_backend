const bookDonationSchema = new mongoose.Schema({
    donation_id: { type: Number, required: true, unique: true },
    user_id: { type: Number, required: true, ref: 'User' },
    book_title: { type: String, required: true },
    book_author: { type: String, required: true },
    donation_date: { type: Date, default: Date.now },
    book_condition: { type: String, enum: ['new', 'good', 'worn'], required: true },
    book_photo: { type: image, required: true },    
    donation_status: { type: String, required: true },
  });
  
  module.exports = mongoose.model('BookDonation', bookDonationSchema);
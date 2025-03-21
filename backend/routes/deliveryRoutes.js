const express = require('express');
const router = express.Router();
const Delivery = require('../models/delivery'); // Import the Delivery model
const Notification = require('../models/notification');  // Add this line
const Book = require('../models/Book');  

// Save delivery information
router.post('/api/delivery', async (req, res) => {
// Save delivery information
  try {
    const { name, userId, address, phoneNumber, preferredDate, latitude, longitude, notificationId } = req.body;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(400).json({ success: false, message: 'Notification not found' });
    }

    const { bookName, author, category, publishYear, bookPhoto, type } = notification;

    const newDelivery = new Delivery({
        name: name,
        userId: userId,
        address: address,
        phoneNumber: phoneNumber,
        preferredDate: preferredDate,
        latitude: latitude,
        longitude: longitude,
        notificationId,  
        bookName: bookName,  
        author: author,       
        category: category,  
        publishYear: publishYear,  
        bookPhoto: bookPhoto,  
        type: type,  
    });

    // Save the new delivery
    const savedDelivery = await newDelivery.save();

    res.status(201).json({ success: true, delivery: savedDelivery });
  } catch (error) {
    console.error('Error creating delivery:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});






// Fetch all deliveries for a user
router.get('/api/delivery/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Fetch deliveries for the user
    const deliveries = await Delivery.find({ userId });
    res.status(200).json({ success: true, deliveries });
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch deliveries' });
  }
});

// Fetch details of a specific delivery
router.get('/api/delivery/:deliveryId', async (req, res) => {
  try {
    const { deliveryId } = req.params;

    // Fetch the delivery details
    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      return res.status(404).json({ success: false, error: 'Delivery not found' });
    }

    res.status(200).json({ success: true, delivery });
  } catch (error) {
    console.error('Error fetching delivery details:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch delivery details' });
  }
});

// Confirm a delivery
router.patch('/api/delivery/:deliveryId/confirm', async (req, res) => {
  try {
      const { deliveryId } = req.params;  // ✅ Extract deliveryId correctly

      // Confirm the delivery
      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) {
          return res.status(404).json({ success: false, message: 'Delivery not found' });
      }

     if(delivery.type === 'donation'){ 
      // Fetch book information
      const { bookName, author, category, publishYear, bookPhoto } = delivery;
      console.log("bookname",bookName);

      // Check if the book exists in the library
      let book = await Book.findOne({ title: bookName, author });
      console.log("book",book);
      if (!book) {
          // Create a new book entry if it doesn't exist
          const totalBooks = await Book.countDocuments();
          book = new Book({
              book_id: totalBooks + 1,
              title: bookName,
              author: author,
              publication_year: publishYear,
              category: category,
              total_copies: 1,
              available_copies: 1,
              book_photo: bookPhoto
          });
          await book.save();
      } else {
          // Update existing book entry
          book.total_copies += 1;
          book.available_copies += 1;
          await book.save();
      }
    } else if (delivery.type === 'return') {
      // Return: Find book and increment available copies
      const book = await Book.findOne({ title: delivery.bookName, author: delivery.author });

      if (!book) {
        return res.status(404).json({ success: false, message: 'Book not found in library' });
      }

      // Increment the available copies
      book.available_copies += 1;
      await book.save();
    }else if (delivery.type === 'borrow') {
      // Return: Find book and increment available copies
      const book = await Book.findOne({ title: delivery.bookName, author: delivery.author });

      if (!book) {
        return res.status(404).json({ success: false, message: 'Book not found in library' });
      }

      // Increment the available copies
      // book.available_copies -= 1;
      //await book.save();
    }
    // Update the delivery status to 'delivered'
    delivery.status = 'delivered';
    const updatedDelivery = await delivery.save();

      res.status(200).json({ success: true, message: 'Delivery confirmed successfully and book inventory updated!' });
  } catch (error) {
      console.error('Error confirming delivery:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
  }
});


module.exports = router;

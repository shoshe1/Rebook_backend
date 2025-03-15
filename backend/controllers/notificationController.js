const Notification = require('../models/notification');
const BookBorrowing = require('../models/BookBorrowing');
const BookDonation = require('../models/BookDonation');

const createNotification = async (req, res) => {
    const { customer_id, message } = req.body;
  
    try {
      const newNotification = new Notification({
        customer_id: Number(customer_id),
        message,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
  
      await newNotification.save();
      res.status(201).json({ success: true, notification: newNotification });
    } catch (error) {
      console.error("Error creating notification:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  };
  



/*Fetch all notifications for a customer*/
const fetchNotifications = async () => {
    try {
      console.log('Fetching notifications for customer ID:', customerId); // Debugging
      const response = await API.get(`/api/notifications/${customerId}`);
      console.log('Backend response:', response.data); // Debugging
  
      // Ensure response.data is an array
      if (Array.isArray(response.data.notifications)) {
        setNotifications(response.data.notifications);
      } else {
        setError('Invalid notifications data');
        console.error('Expected an array but got:', response.data);
      }
    } catch (error) {
      setError('Failed to fetch notifications');
      console.error('Error fetching notifications:', error);
    }
  };



const getNotifications = async (req, res) => {
    try {
      const customerId = req.params.customer_id; // Ensure this matches the route parameter
      console.log('Customer ID from request:', customerId); // Debugging: Check the value of customerId
  
      if (!customerId) {
        return res.status(400).json({ success: false, error: "Customer ID is required" });
      }
  
      // Convert customerId to a number
      const customerIdNumber = Number(customerId);
      if (isNaN(customerIdNumber)) {
        return res.status(400).json({ success: false, error: "Customer ID must be a valid number" });
      }
  
      const notifications = await Notification.find({ customer_id: customerIdNumber }).sort({ createdAt: -1 });
      console.log('Fetched notifications:', notifications); // Debugging: Check the fetched notifications
      res.status(200).json({ success: true, notifications });
    } catch (error) {
      console.error("Error fetching notifications:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  };


/*Mark notification as read*/
const markNotificationAsRead = async (req, res) => {
    const { notification_id } = req.params; 

    try {
        const updatedNotification = await Notification.findByIdAndUpdate(
            notification_id, 
            { isRead: true, updatedAt: new Date() },
            { new: true } 
        );

        if (!updatedNotification) {
            return res.status(404).json({ success: false, error: "Notification not found" });
        }

        res.status(200).json({ success: true, notification: updatedNotification });
    } catch (error) {
        console.error("Error marking notification as read:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};



// Function to send overdue notifications
const sendOverdueNotification = async (req, res) => {
    const { borrowing_id, customer_id } = req.body;

    try {
        // Find the borrowing record and populate the book_id field
        const borrowing = await BookBorrowing.findOne({ borrowing_id: parseInt(borrowing_id, 10) })
            .populate('book_id'); // Populate the book_id field

        if (!borrowing) {
            return res.status(404).json({ error: 'Borrowing record not found' });
        }

        // Check if the book is overdue
        const today = new Date();
        const dueDate = new Date(borrowing.due_date);
        if (today <= dueDate || borrowing.borrowing_status === 'returned') {
            return res.status(400).json({ error: 'This book is not overdue or has already been returned' });
        }

        // Check if book_id is populated and has a title
        if (!borrowing.book_id || !borrowing.book_id.title) {
            return res.status(400).json({ error: 'Book details not found' });
        }

        // Create a notification for the customer
        const message = `You have an overdue book: "${borrowing.book_id.title}". Please return it as soon as possible.`;
        const newNotification = new Notification({
            customer_id: Number(customer_id),
            message,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        await newNotification.save();
        res.status(200).json({ message: 'Overdue notification sent successfully', notification: newNotification });
    } catch (error) {
        console.error('Error sending overdue notification:', error);
        res.status(500).json({ error: error.message });
    }
};



module.exports = {
    createNotification,
    getNotifications,
    markNotificationAsRead,
    sendOverdueNotification,
};
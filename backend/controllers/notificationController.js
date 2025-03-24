const Notification = require('../models/notification');
const BookBorrowing = require('../models/BookBorrowing');
const BookDonation = require('../models/BookDonation');


const createNotification = async (req, res) => {
  try {
    const { userId, message } = req.body;


    const newNotification = new Notification({
        userId: userId,
        message: message,
    });


    const savedNotification = await newNotification.save();
   
    res.status(201).json({
        success: true,
        notification: savedNotification
    });
  } catch (error) {
    console.error('Error creating notification:', error);  
    res.status(500).json({
        success: false,
        message: error.message || 'Server Error'
    });
  }
};






/*Fetch all notifications for a customer*/
const fetchNotifications = async () => {
    try {
      console.log('Fetching notifications for customer ID:', customerId);
      const response = await API.get(`/api/notifications/${customerId}`);
      console.log('Backend response:', response.data);
 
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
      const customerId = req.params.customer_id;
      console.log('Customer ID from request:', customerId);
 
      if (!customerId) {
          return res.status(400).json({ success: false, error: "Customer ID is required" });
      }
 
      const customerIdNumber = Number(customerId);
      if (isNaN(customerIdNumber)) {
          return res.status(400).json({ success: false, error: "Customer ID must be a valid number" });
      }
 
      // Fetch notifications with "waiting" or "rejected" status
      const notifications = await Notification.find({
        userId: customerIdNumber,
        status: { $in: ["waiting", "rejected"] }
      }).sort({ createdAt: -1 });
 
      console.log('Fetched notifications:', notifications);
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
      const borrowing = await BookBorrowing.findOne({ borrowing_id: parseInt(borrowing_id, 10) })
          .populate('book_id');


      if (!borrowing) {
          return res.status(404).json({ error: 'Borrowing record not found' });
      }


      const today = new Date();
      const dueDate = new Date(borrowing.due_date);
      if (today <= dueDate || borrowing.borrowing_status === 'returned') {
          return res.status(400).json({ error: 'This book is not overdue or has already been returned' });
      }


      if (!borrowing.book_id) {
          return res.status(400).json({ error: 'Book details not found' });
      }


      const message = `Your borrowed book "${borrowing.book_id.title}" is overdue. Please return it as soon as possible.`;
      const newNotification = new Notification({
          userId: customer_id,
          message,
          type: "return",
          bookName: borrowing.book_id.title,
          author: borrowing.book_id.author,
          category: borrowing.book_id.category,
          publishYear: borrowing.book_id.publication_year,
          bookPhoto: borrowing.book_id.book_photo || null,
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




const updateNotificationStatus = async (req, res) => {
  const { notification_id } = req.params;


  try {
      const updatedNotification = await Notification.findByIdAndUpdate(
          notification_id,
          { status: "filledin", updatedAt: new Date() },
          { new: true }
      );


      if (!updatedNotification) {
          return res.status(404).json({ success: false, error: "Notification not found" });
      }


      res.status(200).json({ success: true, notification: updatedNotification });
  } catch (error) {
      console.error("Error updating notification status:", error.message);
      res.status(500).json({ success: false, error: error.message });
  }
};




module.exports = {
  createNotification,
  getNotifications,
  markNotificationAsRead,
  sendOverdueNotification,
  updateNotificationStatus,
};

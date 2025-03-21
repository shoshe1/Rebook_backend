const express = require('express');
const {
  createNotification,
  getNotifications,
  markNotificationAsRead,
  sendOverdueNotification,
  updateNotificationStatus
} = require('../controllers/notificationController');

const router = express.Router();
//
router.post('/notifications', createNotification);

router.get('/notifications/:customer_id', getNotifications);

router.patch('/notifications/:notification_id/mark-as-read', markNotificationAsRead);

router.post('/notifications/send-overdue',sendOverdueNotification);

router.patch('/notifications/:notification_id/status', updateNotificationStatus);

module.exports = router;

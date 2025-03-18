const express = require('express');
const router = express.Router();
const Delivery = require('../models/delivery'); // Import the Delivery model

// Save delivery information
router.post('/api/delivery', async (req, res) => {
  try {
      console.log("Received delivery data:", req.body);

    const { name, userId, address, phoneNumber, preferredDate, latitude, longitude } = req.body;
    if (!name || !userId || !address || !phoneNumber || !preferredDate || !latitude || !longitude) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    // Save delivery information to the database
    const newDelivery = new Delivery({
      name,
      userId,
      address,
      phoneNumber,
      preferredDate: new Date(preferredDate),
      latitude,
      longitude,
      status:'on the way',
    });

    await newDelivery.save();
    res.status(201).json({ success: true, delivery: newDelivery });
  } catch (error) {
    console.error('Error saving delivery information:', error);
    res.status(500).json({ success: false, error: 'Failed to save delivery information' });
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
    const { deliveryId } = req.params;

    // Update the delivery status to "delivered"
    const updatedDelivery = await Delivery.findByIdAndUpdate(
      deliveryId,
      { status: 'delivered' },
      { new: true }
    );

    if (!updatedDelivery) {
      return res.status(404).json({ success: false, error: 'Delivery not found' });
    }

    res.status(200).json({ success: true, delivery: updatedDelivery });
  } catch (error) {
    console.error('Error confirming delivery:', error);
    res.status(500).json({ success: false, error: 'Failed to confirm delivery' });
  }
});

module.exports = router;


    await newDelivery.save();
    res.status(201).json({ success: true, delivery: newDelivery });
  } catch (error) {
    console.error('Error saving delivery information:', error);
    res.status(500).json({ success: false, error: 'Failed to save delivery information' });
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
    const { deliveryId } = req.params;

    // Update the delivery status to "delivered"
    const updatedDelivery = await Delivery.findByIdAndUpdate(
      deliveryId,
      { status: 'delivered' },
      { new: true }
    );

    if (!updatedDelivery) {
      return res.status(404).json({ success: false, error: 'Delivery not found' });
    }

    res.status(200).json({ success: true, delivery: updatedDelivery });
  } catch (error) {
    console.error('Error confirming delivery:', error);
    res.status(500).json({ success: false, error: 'Failed to confirm delivery' });
  }
});

module.exports = router;

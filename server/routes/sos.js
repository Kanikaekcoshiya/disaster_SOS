const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Sos = require('../models/Sos');
const Volunteer = require('../models/Volunteer');
const { verifyUser, verifyVolunteer, verifyAdmin } = require('../middleware/auth');

module.exports = (io) => {

  // USER: Create new SOS
  
  router.post('/', async (req, res) => {
    try {
      const { name, phone, message, userProvidedAddress, latitude, longitude } = req.body;

      if (latitude == null || longitude == null) {
        return res.status(400).json({ message: 'Latitude and Longitude are required.' });
      }

      const newSos = new Sos({
        name: name?.trim() || 'Anonymous',
        phone: phone?.trim() || 'Not provided',
        message: message?.trim() || 'No message provided',
        userProvidedAddress: userProvidedAddress?.trim() || 'Address not provided',
        latitude: Number(latitude),
        longitude: Number(longitude),
        status: 'Pending'
      });

      await newSos.save();

      if (io) io.emit('newSOS', newSos);

      res.status(201).json(newSos);
    } catch (err) {
      console.error('Error creating SOS:', err);
      res.status(500).json({ message: 'Server error: Could not create SOS.' });
    }
  });
  
  // USER: Cancel SOS 
 
  router.patch('/cancel/:id', async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid SOS ID.' });
      }

      const sos = await Sos.findById(id);
      if (!sos) {
        return res.status(404).json({ message: 'SOS not found.' });
      }

      if (['Cancelled', 'Completed'].includes(sos.status)) {
        return res
          .status(400)
          .json({ message: `Cannot cancel SOS with status ${sos.status}.` });
      }

      sos.status = 'Cancelled';
      await sos.save();

      if (io) io.emit('sosStatusUpdated', sos);

      res.status(200).json({
        message: 'SOS request cancelled successfully.',
        sos,
      });
    } catch (err) {
      console.error('Error cancelling SOS:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  });

 
  // VOLUNTEER: Get SOS requests

  router.get('/my-sos', verifyVolunteer, async (req, res) => {
    try {
      const volunteerId = req.user.id;

      const sosRequests = await Sos.find({
        $or: [
          { status: 'Pending' },
          { assignedVolunteer: volunteerId }
        ]
      })
        .sort({ createdAt: -1 })
        .populate('assignedVolunteer', 'name');

      res.json(sosRequests);
    } catch (err) {
      console.error('Error fetching SOS for volunteer:', err);
      res.status(500).send('Server Error');
    }
  });

 
  // VOLUNTEER: Accept SOS
 
  router.put('/:id/accept', verifyVolunteer, async (req, res) => {
    try {
      const sos = await Sos.findById(req.params.id);
      if (!sos) return res.status(404).json({ message: 'SOS not found.' });

      if (sos.assignedVolunteer && sos.assignedVolunteer.toString() !== req.user.id) {
        return res.status(400).json({ message: 'SOS already assigned to another volunteer.' });
      }

      sos.assignedVolunteer = req.user.id;
      sos.status = 'Accepted';
      sos.assignmentType = 'Self';

      await sos.save();

      const updatedSos = await Sos.findById(sos._id)
        .populate('assignedVolunteer', 'name');

      if (io) io.emit('sosStatusUpdated', updatedSos);

      res.json(updatedSos);
    } catch (err) {
      console.error('Error accepting SOS:', err);
      res.status(500).json({ message: 'Server Error: Could not accept SOS.' });
    }
  });

  // Update SOS status

  router.put('/:id/status', verifyVolunteer, async (req, res) => {
    try {
      const { status } = req.body;
      const allowedStatuses = ['Accepted', 'In Progress', 'Completed'];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status value' });
      }

      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid SOS ID' });
      }

      const sos = await Sos.findById(req.params.id);
      if (!sos) return res.status(404).json({ message: 'SOS not found' });

      if (!sos.assignedVolunteer || sos.assignedVolunteer.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to update this SOS' });
      }

      sos.status = status;
      await sos.save();

      const updatedSos = await Sos.findById(sos._id)
        .populate('assignedVolunteer', 'name');

      if (io) io.emit('sosStatusUpdated', updatedSos);

      res.json(updatedSos);
    } catch (err) {
      console.error('Error updating SOS status:', err);
      res.status(500).json({ message: 'Server Error' });
    }
  });

 
  // ADMIN: Assign volunteer

  router.put('/:id/assign', verifyAdmin, async (req, res) => {
    try {
      const { volunteerId, status } = req.body;

      if (!volunteerId) {
        return res.status(400).json({ message: 'Volunteer ID required' });
      }

      const sos = await Sos.findById(req.params.id);
      if (!sos) return res.status(404).json({ message: 'SOS not found' });

      const volunteer = await Volunteer.findById(volunteerId);
      if (!volunteer) return res.status(404).json({ message: 'Volunteer not found' });

      sos.assignedVolunteer = volunteerId;
      sos.status = status || 'Accepted';
      await sos.save();

      const updatedSos = await Sos.findById(sos._id)
        .populate('assignedVolunteer', 'name');

      if (io) io.emit('sosStatusUpdated', updatedSos);

      res.json(updatedSos);
    } catch (err) {
      console.error('Error assigning volunteer:', err);
      res.status(500).json({ message: 'Server Error' });
    }
  });

 
  // CHAT
  
  router.post('/:id/chat', async (req, res) => {
    try {
      const { id } = req.params;
      const { sender, message } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid SOS ID.' });
      }

      const sos = await Sos.findById(id);
      if (!sos) return res.status(404).json({ message: 'SOS not found.' });

      const chatMessage = {
        sender,
        message,
        timestamp: new Date()
      };

      sos.chat.push(chatMessage);
      await sos.save();

      if (io) io.to(id).emit('chatMessage', { sosId: id, ...chatMessage });

      res.json(chatMessage);
    } catch (err) {
      console.error('Error sending chat message:', err);
      res.status(500).json({ message: 'Failed to send message' });
    }
  });

  return router;
};

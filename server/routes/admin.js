const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');

const Admin = require('../models/Admin');
const Sos = require('../models/Sos');
const Volunteer = require('../models/Volunteer');
const { verifyAdmin } = require('../middleware/auth'); 

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Admin Login 
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin._id, name: admin.name, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token, admin: { name: admin.name, email: admin.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all SOS requests 
router.get('/sos', verifyAdmin, async (req, res) => {
  try {
    const sosRequests = await Sos.find()
      .sort({ createdAt: -1 })
      .populate('assignedVolunteer', 'name');
    res.json(sosRequests);
  } catch (err) {
    console.error('Error fetching SOS:', err);
    res.status(500).json({ message: 'Could not fetch SOS requests' });
  }
});

router.put('/sos/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedVolunteer, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid SOS ID." });
    }

    const existingSos = await Sos.findById(id);
    if (!existingSos) return res.status(404).json({ message: "SOS request not found." });

    if (existingSos.status === "Completed" || existingSos.status === "Cancelled") {
      return res.status(400).json({ message: `Cannot update a ${existingSos.status} SOS request.` });
    }

    const updateData = {};

    if (assignedVolunteer) {
      if (!mongoose.Types.ObjectId.isValid(assignedVolunteer)) {
        return res.status(400).json({ message: "Invalid volunteer ID." });
      }
      const volunteer = await Volunteer.findById(assignedVolunteer);
      if (!volunteer) return res.status(404).json({ message: "Volunteer not found." });
      updateData.assignedVolunteer = mongoose.Types.ObjectId(assignedVolunteer);
      if (!status) updateData.status = "Accepted";
    }

    if (status) {
      const validStatuses = ["Pending", "Accepted", "In Progress","Completed", "Cancelled"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
      }
      updateData.status = status;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No update data provided." });
    }

    console.log("Updating SOS:", id, "with data:", updateData);

    const updatedSos = await Sos.findByIdAndUpdate(id, updateData, { new: true }).populate('assignedVolunteer', 'name');
    res.json(updatedSos);

  } catch (err) {
    console.error("Error updating SOS:", err);
    res.status(500).json({ message: "Could not update SOS request" });
  }
});


// Get all volunteers
router.get('/volunteers', verifyAdmin, async (req, res) => {
  try {
    const volunteers = await Volunteer.find();
    res.json(volunteers);
  } catch (err) {
    console.error('Error fetching volunteers:', err);
    res.status(500).json({ message: 'Could not fetch volunteers' });
  }
});

//  Update Volunteer Status 
router.put('/volunteers/:id/status', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Pending', 'Approved', 'Suspended'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        message: 'Invalid or missing status provided. Valid statuses are: Pending, Approved, Suspended.'
      });
    }

    const updatedVolunteer = await Volunteer.findByIdAndUpdate(
      id,
      { status: status },
      { new: true, runValidators: true }
    );

    if (!updatedVolunteer) {
      return res.status(404).json({ message: 'Volunteer not found.' });
    }

    res.status(200).json({ message: 'Volunteer status updated successfully!', volunteer: updatedVolunteer });
  } catch (error) {
    console.error('Error updating volunteer status:', error);
    res.status(500).json({ message: 'Internal server error while updating volunteer status.' });
  }
});

//  Analytics of sos's and volunteers regsitered
router.get('/analytics', verifyAdmin, async (req, res) => {
  try {
    const totalSOS = await Sos.countDocuments();
    const pendingSOS = await Sos.countDocuments({ status: 'Pending' });
    const acceptedSOS = await Sos.countDocuments({ status: 'Accepted' });
    const completedSOS = await Sos.countDocuments({ status: 'Completed' });

    const totalVolunteers = await Volunteer.countDocuments();
    const approvedVolunteers = await Volunteer.countDocuments({ status: 'Approved' });
    const pendingVolunteers = await Volunteer.countDocuments({ status: 'Pending' });
    const suspendedVolunteers = await Volunteer.countDocuments({ status: 'Suspended' });

    res.json({
      totalSOS,
      pendingSOS,
      acceptedSOS,
      completedSOS,
      totalVolunteers,
      approvedVolunteers,
      pendingVolunteers,
      suspendedVolunteers
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ message: 'Could not fetch analytics' });
  }
});



// Admin Cancel SOS
router.patch('/sos/admin/cancel/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid SOS ID.' });
    }

    const sos = await Sos.findById(id);
    if (!sos) {
      return res.status(404).json({ message: 'SOS request not found.' });
    }

    if (['Completed', 'Cancelled'].includes(sos.status)) {
      return res.status(400).json({
        message: `Cannot cancel a ${sos.status} SOS request.`
      });
    }

    sos.status = 'Cancelled';
    sos.assignedVolunteer = null;

    await sos.save();

    res.json({ sos });
  } catch (err) {
    console.error('Cancel SOS error:', err);
    res.status(500).json({ message: 'Failed to cancel SOS' });
  }
});


module.exports = router;

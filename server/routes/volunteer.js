
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Volunteer = require("../models/Volunteer");
const Sos = require("../models/Sos");

//Volunteer Register 
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    let volunteer = await Volunteer.findOne({ email });
    if (volunteer) return res.status(400).json({ msg: "Volunteer already exists." });

    volunteer = new Volunteer({
      name,
      email,
      password, 
      phone,
      status: "Pending"
    });

    await volunteer.save();
    res.status(201).json({ message: "Volunteer registered successfully. Awaiting admin approval." });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

//  Volunteer Login 
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const volunteer = await Volunteer.findOne({ email });
    if (!volunteer) return res.status(401).json({ error: "Invalid credentials." });

    if (volunteer.status !== "Approved") {
      return res.status(401).json({ error: "Account not approved yet. Please wait for admin review." });
    }

    const isMatch = await bcrypt.compare(password, volunteer.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials." });

    const payload = { id: volunteer._id, role: 'volunteer', name: volunteer.name };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
      if (err) return res.status(500).send('Server Error: Token generation failed');
      res.json({ token, volunteer: { name: volunteer.name, id: volunteer._id } });
    });
  } catch (err) {
    console.error("Volunteer login error:", err);
    res.status(500).json({ error: "Server error during login." });
  }
});


router.get("/my-sos", async (req, res) => {
  try {
    // extract volunteer id from token
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const volunteerId = decoded.id;

    const sosList = await Sos.find({
      $or: [
        { status: 'Pending' },              // include all pending requests
        { assignedVolunteer: volunteerId }   // include requests assigned to this volunteer
      ]
    })
    .sort({ createdAt: -1 })
    .populate('assignedVolunteer', 'name');

    res.json(sosList);
  } catch (err) {
    console.error('Error fetching volunteer SOS:', err.message);
    res.status(500).json({ error: 'Server error fetching SOS requests.' });
  }
});


module.exports = router;

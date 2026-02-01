
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const jwt = require('jsonwebtoken');

const Admin = require('./models/Admin');
const Volunteer = require('./models/Volunteer');
const Sos = require('./models/Sos');

const app = express();
const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const io = new Server(server, {
  cors: { origin: FRONTEND_URL, methods: ["GET", "POST", "PUT", "DELETE"] }
});

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

if (!MONGODB_URI || !JWT_SECRET) {
  console.error(" ERROR: MONGODB_URI or JWT_SECRET not found in .env. Please set them.");
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log(" MongoDB connected successfully!");
    createInitialAdmin();
  })
  .catch(err => console.error(" MongoDB connection error:", err));

// Routes 
const sosRoutes = require("./routes/sos")(io);
const adminRoutes = require('./routes/admin');


const volunteerRoutes = require("./routes/volunteer");

app.use("/api/sos", sosRoutes);
app.use("/api/volunteers", volunteerRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => res.send("Disaster relief backend running smoothly!"));

// Socket.IO handlers
io.on("connection", (socket) => {
  console.log(" Socket connected:", socket.id);

  // join room for specific SOS chat
  socket.on("joinSOSChat", (sosId) => {
    if (!sosId) return;
    socket.join(sosId);
    console.log(`Socket ${socket.id} joined chat room for SOS ID: ${sosId}`);
  });

  // join volunteer's private room 
  socket.on("volunteerConnect", (volunteerId) => {
    if (!volunteerId) return;
    socket.join(volunteerId);
    console.log(`Volunteer ${volunteerId} joined their private room (${socket.id}).`);
  });

  // If clients choose to send chat via socket persist & emit
  socket.on("chatMessage", async (data) => {
    try {
      const { sosId, sender, message, timestamp } = data || {};
      if (!sosId || !message) return;
      if (!mongoose.Types.ObjectId.isValid(sosId)) return;

      const sos = await Sos.findById(sosId);
      if (!sos) return;

      const chatMessage = { sender: sender || "Volunteer", message, timestamp: timestamp ? new Date(timestamp) : new Date() };
      if (!sos.chat) sos.chat = [];
      sos.chat.push(chatMessage);
      await sos.save();

      io.to(sosId).emit("chatMessage", {
        sosId,
        sender: chatMessage.sender,
        message: chatMessage.message,
        timestamp: chatMessage.timestamp,
      });
    } catch (err) {
      console.error("Error saving socket chat message:", err);
    }
  });

  socket.on("disconnect", () => console.log(" Socket disconnected:", socket.id));
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

const createInitialAdmin = async () => {
  try {
    const adminExists = await Admin.findOne({ email: 'admin@example.com' });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('securepassword', salt);

      const admin = new Admin({ name: 'Super Admin', email: 'admin@example.com', password: hashedPassword });
      await admin.save();
      console.log("Initial admin account created: admin@example.com / securepassword");
    } else {
      console.log("Admin account already exists. Skipping creation.");
    }
  } catch (error) {
    console.error(" Error creating initial admin:", error);
  }
};
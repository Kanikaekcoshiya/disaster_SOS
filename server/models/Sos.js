const mongoose = require("mongoose");
const sosSchema = new mongoose.Schema(
  {
    name: String,
    phone: String,
    message: String,
    userProvidedAddress: String,

    location: {
      lat: Number,
      lng: Number,
    },

    status: {
      type: String,
      enum: ["Pending", "Accepted", "In Progress", "Completed", "Cancelled"],
      default: "Pending",
    },

    assignedVolunteer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Volunteer",
      default: null,
    },

    chat: [
      {
        sender: String,
        message: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true  
  }
);

module.exports = mongoose.model("Sos", sosSchema);

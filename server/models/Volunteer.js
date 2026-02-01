const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); 

const VolunteerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
  status: { 
  type: String, 
  enum: ['Pending', 'Approved', 'Suspended'], 
  default: 'Pending' 
},


    date: { type: Date, default: Date.now },
    // socketId: { type: String }
    //  //for direct Socket.IO messaging to a volunteer
});

// Hash password
VolunteerSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

module.exports = mongoose.model('Volunteer', VolunteerSchema);

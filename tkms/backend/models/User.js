const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['admin', 'manager', 'engineer', 'viewer'], default: 'viewer' },
  isVerified: { type: Boolean, default: false },
  isProfileComplete: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  verificationToken: String,
  verificationTokenExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  profile: {
    fullName: String,
    mobileNumber: String,
    address: String,
    companyName: String,
    companyId: String,
    department: { type: String, enum: ['Tunnel Design', 'Safety', 'Engineering', 'Site Management', 'Equipment', 'Materials', 'Survey', 'Administration', 'Other'], default: 'Other' },
    roleInCompany: String,
    profilePhoto: String,
    bio: String,
    experience: String,
    specialization: String,
    emergencyContact: String
  },
  notifications: [{
    message: String,
    type: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
    isRead: { type: Boolean, default: false },
    link: String,
    createdAt: { type: Date, default: Date.now }
  }],
  lastLogin: Date,
  loginCount: { type: Number, default: 0 }
}, { timestamps: true });

// Index for search
userSchema.index({ email: 1 });
userSchema.index({ 'profile.fullName': 'text' });

module.exports = mongoose.model('User', userSchema);

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } = require('../utils/email');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

router.post('/signup', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password are required' });

    if (password.length < 8)
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing)
      return res.status(400).json({ success: false, message: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await User.create({
      email: email.toLowerCase(),
      password: hash,
      role: ['manager', 'engineer', 'viewer'].includes(role) ? role : 'viewer',
      verificationToken,
      verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    try {
      await sendVerificationEmail(user.email, user.email.split('@')[0], verificationToken);
    } catch (emailErr) {
      console.error('Email send failed:', emailErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Account created! Please check your email to verify your account.'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error during signup' });
  }
});

router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token)
      return res.status(400).json({ success: false, message: 'Verification token missing' });

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: new Date() }
    });

    if (!user)
      return res.status(400).json({ success: false, message: 'Invalid or expired verification link' });

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    try {
      await sendWelcomeEmail(user.email, user.profile?.fullName || user.email.split('@')[0]);
    } catch (e) { }

    res.json({
      success: true,
      message: 'Email verified successfully! You can now login.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user)
      return res.status(401).json({ success: false, message: 'Invalid email or password' });

    if (!user.isActive)
      return res.status(401).json({ success: false, message: 'Account has been deactivated. Contact admin.' });

    if (!user.isVerified)
      return res.status(401).json({ success: false, message: 'Please verify your email before logging in' });

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      return res.status(401).json({ success: false, message: 'Invalid email or password' });

    user.lastLogin = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        isProfileComplete: user.isProfileComplete,
        profile: user.profile
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });

    if (!user)
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });

    const token = crypto.randomBytes(32).toString('hex');

    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    try {
      await sendPasswordResetEmail(user.email, user.profile?.fullName, token);
    } catch (e) { }

    res.json({ success: true, message: 'Password reset link sent to your email.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password)
      return res.status(400).json({ success: false, message: 'Token and new password required' });

    if (password.length < 8)
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user)
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });

    user.password = await bcrypt.hash(password, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully. You can now login.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });

    if (!user || user.isVerified)
      return res.json({ success: true, message: 'If that email exists and is unverified, a link was sent.' });

    const token = crypto.randomBytes(32).toString('hex');

    user.verificationToken = token;
    user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    try {
      await sendVerificationEmail(user.email, user.email.split('@')[0], token);
    } catch (e) { }

    res.json({ success: true, message: 'Verification email resent.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
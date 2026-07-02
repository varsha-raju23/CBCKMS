const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const saveProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id);

    user.profile = {
      ...user.profile,
      ...req.body
    };

    user.isProfileComplete = true;
    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
};

router.get('/profile', protect, (req, res) => {
  res.json({ success: true, user: req.user });
});

router.post('/profile', protect, saveProfile);
router.put('/profile', protect, saveProfile);

module.exports = router;
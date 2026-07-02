const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notifications');
    const notifications = (user.notifications || [])
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 30);
    const unreadCount = notifications.filter(n => !n.isRead).length;
    res.json({ success: true, notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/read-all', async (req, res) => {
  try {
    await User.updateOne({ _id: req.user._id }, { $set: { 'notifications.$[].isRead': true } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

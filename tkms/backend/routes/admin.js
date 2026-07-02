const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Document = require('../models/Document');
const AIChat = require('../models/AIChat');
const { protect, adminOnly } = require('../middleware/auth');

// All admin routes require auth + admin role
router.use(protect, adminOnly);

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalDocs, totalAdmins, totalManagers, totalEngineers, totalViewers] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Document.countDocuments({ isDeleted: false }),
      User.countDocuments({ role: 'admin', isActive: true }),
      User.countDocuments({ role: 'manager', isActive: true }),
      User.countDocuments({ role: 'engineer', isActive: true }),
      User.countDocuments({ role: 'viewer', isActive: true })
    ]);

    const byDept = await Document.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$departmentName', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const byType = await Document.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$documentType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const recentUsers = await User.find({ isActive: true })
      .select('email profile.fullName role createdAt isVerified')
      .sort({ createdAt: -1 })
      .limit(5);

    const mostViewed = await Document.find({ isDeleted: false })
      .select('documentId originalName viewCount projectName documentType')
      .sort({ viewCount: -1 })
      .limit(5);

    const recentDocs = await Document.find({ isDeleted: false })
      .select('originalName uploadedByName documentType projectName createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    // Monthly uploads (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyUploads = await Document.aggregate([
      { $match: { isDeleted: false, createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers, totalDocs, totalAdmins, totalManagers, totalEngineers, totalViewers,
        byDept, byType, recentUsers, mostViewed, recentDocs, monthlyUploads
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const query = {};
    if (search) query.$or = [{ email: { $regex: search, $options: 'i' } }, { 'profile.fullName': { $regex: search, $options: 'i' } }];
    if (role) query.role = role;

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password -verificationToken -resetPasswordToken -notifications')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, users, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/admin/users/:id/role
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'manager', 'engineer', 'viewer'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: `User role updated to ${role}`, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/admin/users/:id/toggle-active
router.put('/users/:id/toggle-active', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}`, isActive: user.isActive });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/admin/documents
router.get('/documents', async (req, res) => {
  try {
    const { search, documentType, page = 1, limit = 20 } = req.query;
    const query = { isDeleted: false };
    if (search) query.$or = [{ originalName: { $regex: search, $options: 'i' } }, { projectName: { $regex: search, $options: 'i' } }];
    if (documentType) query.documentType = documentType;

    const total = await Document.countDocuments(query);
    const docs = await Document.find(query)
      .select('-extractedText -viewHistory')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, documents: docs, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/admin/documents/:id (hard delete)
router.delete('/documents/:id', async (req, res) => {
  try {
    const path = require('path');
    const fs = require('fs');
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    if (doc.filePath && fs.existsSync(doc.filePath)) fs.unlinkSync(doc.filePath);
    await Document.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Document permanently deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

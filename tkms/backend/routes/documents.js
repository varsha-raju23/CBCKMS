const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Document = require('../models/Document');
const User = require('../models/User');
const { protect, canUpload } = require('../middleware/auth');
const { documentUpload } = require('../middleware/upload');
const { extractText } = require('../utils/textExtractor');

// POST /api/documents/upload
router.post('/upload', protect, canUpload, documentUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const { projectName, departmentName, documentType, tunnelSection, description, documentDate, tags } = req.body;
    if (!projectName || !departmentName || !documentType) {
      return res.status(400).json({ success: false, message: 'Project name, department, and document type are required' });
    }

    const fileUrl = `/uploads/documents/${req.file.filename}`;

    // Extract text for AI
    let extractedText = '';
    try {
      extractedText = await extractText(req.file.path, req.file.mimetype);
    } catch (e) { console.log('Text extraction skipped:', e.message); }

    const doc = await Document.create({
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype || path.extname(req.file.originalname).replace('.', ''),
      filePath: req.file.path,
      fileUrl,
      projectName,
      departmentName,
      documentType,
      tunnelSection,
      description,
      documentDate: documentDate ? new Date(documentDate) : new Date(),
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      uploadedBy: req.user._id,
      uploadedByName: req.user.profile?.fullName || req.user.email,
      extractedText,
      isProcessed: true
    });

    // Add notification to all admins & managers
    await User.updateMany(
      { role: { $in: ['admin', 'manager'] } },
      {
        $push: {
          notifications: {
            message: `New document uploaded: "${req.file.originalname}" by ${req.user.profile?.fullName || req.user.email}`,
            type: 'info',
            link: `/pages/documents.html`,
            createdAt: new Date()
          }
        }
      }
    );

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      document: {
        _id: doc._id,
        documentId: doc.documentId,
        originalName: doc.originalName,
        fileSize: doc.fileSize,
        fileType: doc.fileType,
        fileUrl: doc.fileUrl,
        projectName: doc.projectName,
        departmentName: doc.departmentName,
        documentType: doc.documentType,
        tunnelSection: doc.tunnelSection,
        description: doc.description,
        uploadedByName: doc.uploadedByName,
        createdAt: doc.createdAt
      }
    });
  } catch (err) {
    console.error('Upload error:', err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: err.message || 'Upload failed' });
  }
});

// GET /api/documents - list all with filters
router.get('/', protect, async (req, res) => {
  try {
    const { search, documentType, departmentName, projectName, page = 1, limit = 20, sort = '-createdAt' } = req.query;
    const query = { isDeleted: false };

    if (search) {
      query.$text = { $search: search };
    }
    if (documentType) query.documentType = documentType;
    if (departmentName) query.departmentName = departmentName;
    if (projectName) query.projectName = { $regex: projectName, $options: 'i' };

    const total = await Document.countDocuments(query);
    const docs = await Document.find(query)
      .select('-extractedText -viewHistory')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('uploadedBy', 'email profile.fullName profile.profilePhoto');

    res.json({ success: true, documents: docs, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/documents/recent
router.get('/recent', protect, async (req, res) => {
  try {
    const docs = await Document.find({ isDeleted: false })
      .select('-extractedText -viewHistory')
      .sort({ createdAt: -1 })
      .limit(10);
    res.json({ success: true, documents: docs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/documents/stats
router.get('/stats', protect, async (req, res) => {
  try {
    const total = await Document.countDocuments({ isDeleted: false });
    const byType = await Document.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$documentType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const byDept = await Document.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$departmentName', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const mostViewed = await Document.find({ isDeleted: false })
      .select('documentId originalName projectName viewCount documentType')
      .sort({ viewCount: -1 })
      .limit(5);
    const recentUploads = await Document.find({ isDeleted: false })
      .select('originalName uploadedByName createdAt documentType projectName')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({ success: true, stats: { total, byType, byDept, mostViewed, recentUploads } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/documents/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, isDeleted: false })
      .populate('uploadedBy', 'email profile.fullName profile.department');
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    // Record view
    doc.viewCount += 1;
    doc.viewHistory.push({ viewedBy: req.user._id, viewedByName: req.user.profile?.fullName || req.user.email });
    if (doc.viewHistory.length > 100) doc.viewHistory = doc.viewHistory.slice(-100);
    await doc.save();

    res.json({ success: true, document: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/documents/:id/download
router.get('/:id/download', protect, async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, isDeleted: false });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    doc.downloadCount = (doc.downloadCount || 0) + 1;
    await doc.save();

    const filePath = path.join(__dirname, '..', doc.fileUrl);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'File not found on server' });

    res.download(filePath, doc.originalName);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, isDeleted: false });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    // Only uploader or admin can delete
    if (doc.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this document' });
    }

    doc.isDeleted = true;
    doc.deletedAt = new Date();
    await doc.save();

    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

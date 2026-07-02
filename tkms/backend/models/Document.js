const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const documentSchema = new mongoose.Schema({
  documentId: { type: String, unique: true, default: () => 'TKM-' + uuidv4().slice(0, 8).toUpperCase() },
  fileName: { type: String, required: true },
  originalName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  fileType: { type: String, required: true },
  filePath: String,
  fileUrl: String,
  cloudinaryId: String,

  // Document metadata
  projectName: { type: String, required: true },
  departmentName: { type: String, required: true },
  documentType: {
    type: String,
    required: true,
    enum: ['Tunnel Design', 'Safety Reports', 'Daily Progress Reports', 'Site Inspection', 'Equipment Details', 'Material Reports', 'Project Drawings', 'Contracts', 'Specifications', 'Survey Reports', 'Environmental Reports', 'Other']
  },
  tunnelSection: String,
  description: String,
  documentDate: Date,
  tags: [String],

  // Upload info
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedByName: String,

  // AI content
  extractedText: String,
  aiSummary: String,
  aiTags: [String],
  isProcessed: { type: Boolean, default: false },

  // Access
  accessLevel: { type: String, enum: ['public', 'private', 'restricted'], default: 'public' },
  allowedRoles: [String],

  // Analytics
  viewCount: { type: Number, default: 0 },
  downloadCount: { type: Number, default: 0 },
  viewHistory: [{
    viewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    viewedByName: String,
    viewedAt: { type: Date, default: Date.now }
  }],

  isDeleted: { type: Boolean, default: false },
  deletedAt: Date
}, { timestamps: true });

documentSchema.index({ projectName: 'text', description: 'text', extractedText: 'text', documentType: 'text', tunnelSection: 'text', tags: 'text' });
documentSchema.index({ uploadedBy: 1, createdAt: -1 });
documentSchema.index({ documentType: 1 });
documentSchema.index({ departmentName: 1 });

module.exports = mongoose.model('Document', documentSchema);

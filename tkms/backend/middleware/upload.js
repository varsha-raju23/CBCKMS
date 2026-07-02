const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads dir exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const profileDir = path.join(__dirname, '../uploads/profiles');
if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

// Document storage
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/documents');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E6);
    cb(null, unique + path.extname(file.originalname));
  }
});

// Profile photo storage
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profileDir),
  filename: (req, file, cb) => {
    cb(null, 'profile-' + req.user._id + '-' + Date.now() + path.extname(file.originalname));
  }
});

const allowedDocTypes = /pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|dwg|dxf|jpg|jpeg|png|gif/;
const allowedImageTypes = /jpg|jpeg|png|gif|webp/;

const documentUpload = multer({
  storage: documentStorage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowedDocTypes.test(ext)) return cb(null, true);
    cb(new Error('File type not allowed. Allowed: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV, DWG, DXF, Images'));
  }
});

const profileUpload = multer({
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowedImageTypes.test(ext)) return cb(null, true);
    cb(new Error('Only image files allowed for profile photo'));
  }
});

module.exports = { documentUpload, profileUpload };

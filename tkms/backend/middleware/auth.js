const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password -verificationToken -resetPasswordToken');
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    if (!user.isActive) return res.status(401).json({ success: false, message: 'Account deactivated' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Not authorized, invalid token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

const managerOrAbove = (req, res, next) => {
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Manager or Admin access required' });
  }
  next();
};

const canUpload = (req, res, next) => {
  if (!['admin', 'manager', 'engineer'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'You do not have upload permission' });
  }
  next();
};

module.exports = { protect, adminOnly, managerOrAbove, canUpload };

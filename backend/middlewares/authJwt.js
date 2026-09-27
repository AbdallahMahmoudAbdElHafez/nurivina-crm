const jwt = require('jsonwebtoken');
const db = require('../models');
const User = db.user;

const verifyToken = (req, res, next) => {
  const bcrypt = require('bcrypt');
bcrypt.hash('1234', 10).then(console.log);
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Unauthorized' });

    // توحيد الحقول
    req.user = {
      user_id: decoded.id, // أو decoded.user_id حسب ما حفظته عند تسجيل الدخول
      role: decoded.role,
    };

    next();
  });
};

const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.user_id);
    if (user && user.role === 'admin') return next();
    return res.status(403).json({ message: 'Require admin role' });
  } catch (err) {
    next(err);
  }
};

const isManagerOrAdmin = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.user_id);
    if (user && (user.role === 'admin' || user.role === 'manager')) return next();
    return res.status(403).json({ message: 'Require manager or admin role' });
  } catch (err) {
    next(err);
  }
};

module.exports = { verifyToken, isAdmin, isManagerOrAdmin };

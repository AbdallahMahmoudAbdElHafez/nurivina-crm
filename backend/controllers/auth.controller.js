const db = require('../models');
const User = db.user;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const register = async (req, res, next) => {
  try {
    const { full_name, password } = req.body;
    const found = await User.findOne({ where: { full_name } });
    if (found) return res.status(409).json({ message: 'الاسم موجود مسبقاً' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ full_name, password: hash });
    res.status(201).json({ id: user.user_id, full_name: user.full_name });
  } catch (err) { next(err); }
};

const login = async (req, res, next) => {
  try {
    const { full_name, password } = req.body;
    const user = await User.findOne({ where: { full_name } });
    if (!user) return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });

    const secret = process.env.JWT_SECRET || 'nurivina_crm_secure_token_secret_key_2026';
    const expiresIn = process.env.JWT_EXPIRES_IN || '1d';

    const token = jwt.sign(
      { id: user.user_id, full_name: user.full_name, role: user.role },
      secret,
      { expiresIn }
    );

    res.json({ token, user: { id: user.user_id, full_name: user.full_name, role: user.role } });
  } catch (err) { next(err); }
};

module.exports = { register, login };

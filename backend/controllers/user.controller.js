const db = require('../models');
const bcrypt = require('bcryptjs');
const User = db.user;

const getAll = async (req, res, next) => {
  try {
    const users = await User.findAll({ attributes: ['user_id', 'full_name', 'role'] });
    res.json(users);
  } catch (err) { next(err); }
};
const getUsers = async (req, res) => {
  const requester = req.user; // مفترض جاي من middleware التوكن

  let users;
  if (requester.role === "admin") {
    users = await User.findAll();
  } else if (requester.role === "manager") {
    users = await User.findAll({
      where: { manager_id: requester.user_id, role: "rep" }, // فقط المندوبين التابعين له
    });
  } else {
    return res.status(403).json({ message: "ليس لديك صلاحية" });
  }

  res.json(users);
};
const getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, { attributes: ['user_id', 'full_name', 'role'] });
    if (!user) return res.status(404).json({ message: 'غير موجود' });
    res.json(user);
  } catch (err) { next(err); }
};

const createUser = async (req, res, next) => {
  try {
    const { full_name, password, role, manager_id } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ full_name, password: hashed, role,   manager_id: manager_id || null, // ← هذا السطر يصحح الخطأ
 });
    res.json(user);
  } catch (err) { next(err); }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { full_name, role, manager_id } = req.body;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'غير موجود' });

    user.full_name = full_name ?? user.full_name;
    user.role = role ?? user.role;
    user.manager_id = manager_id ?? user.manager_id;
    await user.save();
    res.json({ message: 'تم التحديث', user });
  } catch (err) { next(err); }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    await User.destroy({ where: { user_id: id } });
    res.json({ message: 'تم الحذف' });
  } catch (err) { next(err); }
};

module.exports = { getAll, getOne, createUser, updateUser, deleteUser, getUsers };

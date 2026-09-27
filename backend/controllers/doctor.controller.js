const db = require('../models');
const Doctor = db.doctor;
const DoctorUser = db.doctorUser;

// إنشاء طبيب جديد


const create = async (req, res, next) => {
  try {
    const { name } = req.body;
    const userId = req.user.user_id; // جاي من التوكن (verifyToken)

    if (!name) return res.status(400).json({ message: 'Name is required' });

    // إنشاء الطبيب أولاً
    const doctor = await Doctor.create({ name });

    // ربط الطبيب بالمستخدم الحالي تلقائيًا
    await DoctorUser.create({
      user_id: userId,
      doctor_id: doctor.id
    });

    res.status(201).json({
      message: 'Doctor created and linked successfully',
      doctor
    });
  } catch (err) {
    next(err);
  }
};

const getDoctorsForCurrentUser = async (req, res) => {
  try {
    const userId = req.user.user_id; // من JWT
    const doctorUsers = await DoctorUser.findAll({
      where: { user_id: userId },
      include: [{ model: Doctor, attributes: ['id', 'name'], as: 'Doctor' }]
    });

    const doctors = doctorUsers.map(d => d.Doctor);
    res.json(doctors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
const getDoctors = async (req, res) => {
  try {
    const user = req.user; // جاي من verifyToken
    let doctors;

    if (user.role === 'admin') {
      // الأدمن يشوف كل الأطباء
      doctors = await Doctor.findAll();
    } else {
      // المندوب يشوف فقط الأطباء المرتبطين به من جدول doctors_users
      doctors = await Doctor.findAll({
        include: [
          {
            model: User,
            where: { user_id: user.user_id },
            through: { attributes: [] },
            attributes: [], // لتجنب عرض بيانات اليوزر نفسه
          },
        ],
      });
    }

    res.json(doctors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'خطأ في جلب قائمة الأطباء' });
  }
};

// إرجاع كل الأطباء
const getAll = async (req, res, next) => {
  try {
    const doctors = await Doctor.findAll();
    res.json(doctors);
  } catch (err) {
    next(err);
  }
};

// إرجاع طبيب واحد
const getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doctor = await Doctor.findByPk(id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    res.json(doctor);
  } catch (err) {
    next(err);
  }
};

// تحديث بيانات طبيب
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const doctor = await Doctor.findByPk(id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    doctor.name = name ?? doctor.name;
    await doctor.save();
    res.json(doctor);
  } catch (err) {
    next(err);
  }
};

// حذف طبيب
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Doctor.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ message: 'Doctor not found' });
    res.json({ message: 'Doctor deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { create, getAll, getOne, update, remove, getDoctors , getDoctorsForCurrentUser };

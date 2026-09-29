const db = require('../models');
const { Op } = require('sequelize');
const { getAccessibleUserIds } = require('../utils/hierarchy');

const Doctor = db.doctor;
const DoctorUser = db.doctorUser;

// إنشاء طبيب جديد وربطه بالمستخدم الحالي
const create = async (req, res, next) => {
  try {
    const { name } = req.body;
    const userId = req.user?.user_id;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'اسم الطبيب مطلوب' });
    }

    // إنشاء الطبيب
    const doctor = await Doctor.create({ name: name.trim() });

    // ربط الطبيب بالمستخدم الحالي تلقائيًا
    if (userId) {
      await DoctorUser.create({
        user_id: userId,
        doctor_id: doctor.id,
      });
    }

    res.status(201).json(doctor);
  } catch (err) {
    next(err);
  }
};

// إرجاع الأطباء حسب الصلاحيات والهيكل الإداري:
// 1. الأدمن: يرى جميع الأطباء في النظام
// 2. المدير: يرى الأطباء الذين أضافهم هو أو المستخدمون التابعون له
// 3. المستخدم/المندوب: يرى فقط الأطباء الذين أضافهم بنفسه
const getAll = async (req, res, next) => {
  try {
    const accessibleUserIds = await getAccessibleUserIds(req.user);

    // الأدمن يرى كل الأطباء
    if (accessibleUserIds === null) {
      const doctors = await Doctor.findAll({ order: [['id', 'DESC']] });
      return res.json(doctors);
    }

    // المدير أو المندوب: جلب الأطباء المرتبطين بالمستخدمين المسموح لهم
    const doctorUsers = await DoctorUser.findAll({
      where: { user_id: { [Op.in]: accessibleUserIds } },
      include: [
        {
          model: Doctor,
          attributes: ['id', 'name'],
          as: 'Doctor',
        },
      ],
      order: [['id', 'DESC']],
    });

    // إزالة التكرار إن وُجد
    const doctorMap = new Map();
    doctorUsers.forEach((du) => {
      if (du.Doctor && !doctorMap.has(du.Doctor.id)) {
        doctorMap.set(du.Doctor.id, du.Doctor);
      }
    });

    res.json(Array.from(doctorMap.values()));
  } catch (err) {
    next(err);
  }
};

// نقطة وصول my-doctors لتكون متطابقة مع getAll
const getDoctorsForCurrentUser = async (req, res, next) => {
  return getAll(req, res, next);
};

const getDoctors = async (req, res, next) => {
  return getAll(req, res, next);
};

// إرجاع طبيب واحد مع التحقق من الصلاحيات
const getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doctor = await Doctor.findByPk(id);
    if (!doctor) return res.status(404).json({ message: 'الطبيب غير موجود' });

    const accessibleUserIds = await getAccessibleUserIds(req.user);
    if (accessibleUserIds !== null) {
      const isLinked = await DoctorUser.findOne({
        where: {
          doctor_id: id,
          user_id: { [Op.in]: accessibleUserIds },
        },
      });
      if (!isLinked) {
        return res.status(403).json({ message: 'ليس لديك صلاحية لعرض هذا الطبيب' });
      }
    }

    res.json(doctor);
  } catch (err) {
    next(err);
  }
};

// تحديث بيانات طبيب مع التحقق من الصلاحيات
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const doctor = await Doctor.findByPk(id);
    if (!doctor) return res.status(404).json({ message: 'الطبيب غير موجود' });

    const accessibleUserIds = await getAccessibleUserIds(req.user);
    if (accessibleUserIds !== null) {
      const isLinked = await DoctorUser.findOne({
        where: {
          doctor_id: id,
          user_id: { [Op.in]: accessibleUserIds },
        },
      });
      if (!isLinked) {
        return res.status(403).json({ message: 'ليس لديك صلاحية لتعديل هذا الطبيب' });
      }
    }

    doctor.name = name !== undefined ? name.trim() : doctor.name;
    await doctor.save();
    res.json(doctor);
  } catch (err) {
    next(err);
  }
};

// حذف طبيب مع التحقق من الصلاحيات
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doctor = await Doctor.findByPk(id);
    if (!doctor) return res.status(404).json({ message: 'الطبيب غير موجود' });

    const accessibleUserIds = await getAccessibleUserIds(req.user);
    if (accessibleUserIds !== null) {
      const isLinked = await DoctorUser.findOne({
        where: {
          doctor_id: id,
          user_id: { [Op.in]: accessibleUserIds },
        },
      });
      if (!isLinked) {
        return res.status(403).json({ message: 'ليس لديك صلاحية لحذف هذا الطبيب' });
      }
    }

    await DoctorUser.destroy({ where: { doctor_id: id } });
    await Doctor.destroy({ where: { id } });
    res.json({ message: 'تم حذف الطبيب بنجاح' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  create,
  getAll,
  getOne,
  update,
  remove,
  getDoctors,
  getDoctorsForCurrentUser,
};


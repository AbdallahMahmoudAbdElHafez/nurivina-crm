const db = require('../models');
const { Op } = require('sequelize');
const { getAccessibleUserIds } = require('../utils/hierarchy');

const DoctorUser = db.doctorUser;
const Doctor = db.doctor;
const User = db.user;

const assignDoctorToUser = async (req, res, next) => {
  try {
    const { user_id, doctor_id } = req.body;
    const targetUserId = parseInt(user_id, 10);

    const accessibleUserIds = await getAccessibleUserIds(req.user);
    if (accessibleUserIds !== null && !accessibleUserIds.includes(targetUserId)) {
      return res.status(403).json({ message: 'ليس لديك صلاحية لتعيين طبيب لهذا المستخدم' });
    }

    const exists = await DoctorUser.findOne({ where: { user_id: targetUserId, doctor_id } });
    if (exists) return res.status(409).json({ message: 'العلاقة موجودة بالفعل' });

    const relation = await DoctorUser.create({ user_id: targetUserId, doctor_id });
    res.status(201).json(relation);
  } catch (err) { next(err); }
};

const getDoctorsForCurrentUser = async (req, res, next) => {
  try {
    const accessibleUserIds = await getAccessibleUserIds(req.user);

    if (accessibleUserIds === null) {
      const doctors = await db.doctor.findAll({ order: [['id', 'DESC']] });
      return res.json(doctors);
    }

    const doctorUsers = await db.doctorUser.findAll({
      where: { user_id: { [Op.in]: accessibleUserIds } },
      include: [
        {
          model: db.doctor,
          attributes: ['id', 'name'],
          as: 'Doctor',
        },
      ],
      order: [['id', 'DESC']],
    });

    const doctorMap = new Map();
    doctorUsers.forEach((du) => {
      if (du.Doctor && !doctorMap.has(du.Doctor.id)) {
        doctorMap.set(du.Doctor.id, du.Doctor);
      }
    });

    return res.json(Array.from(doctorMap.values()));
  } catch (err) {
    next(err);
  }
};

const getDoctorsByUser = async (req, res, next) => {
  try {
    const { user_id } = req.params;
    const targetUserId = parseInt(user_id, 10);

    const accessibleUserIds = await getAccessibleUserIds(req.user);
    if (accessibleUserIds !== null && !accessibleUserIds.includes(targetUserId)) {
      return res.status(403).json({ message: 'ليس لديك صلاحية لعرض أطباء هذا المستخدم' });
    }

    const doctors = await Doctor.findAll({
      include: {
        model: User,
        as: 'Doctors',
        through: { attributes: [] },
        where: { user_id: targetUserId },
      },
    });
    res.json(doctors);
  } catch (err) { next(err); }
};

const removeDoctorFromUser = async (req, res, next) => {
  try {
    const { user_id, doctor_id } = req.params;
    const targetUserId = parseInt(user_id, 10);

    const accessibleUserIds = await getAccessibleUserIds(req.user);
    if (accessibleUserIds !== null && !accessibleUserIds.includes(targetUserId)) {
      return res.status(403).json({ message: 'ليس لديك صلاحية لإلغاء تعيين طبيب لهذا المستخدم' });
    }

    await DoctorUser.destroy({ where: { user_id: targetUserId, doctor_id } });
    res.json({ message: 'تم الحذف' });
  } catch (err) { next(err); }
};

module.exports = { assignDoctorToUser, getDoctorsByUser, removeDoctorFromUser, getDoctorsForCurrentUser };


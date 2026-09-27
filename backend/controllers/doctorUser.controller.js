const db = require('../models');
const DoctorUser = db.doctorUser;
const Doctor = db.doctor;
const User = db.user;

const assignDoctorToUser = async (req, res, next) => {
  try {
    const { user_id, doctor_id } = req.body;
    const exists = await DoctorUser.findOne({ where: { user_id, doctor_id } });
    if (exists) return res.status(409).json({ message: 'العلاقة موجودة بالفعل' });

    const relation = await DoctorUser.create({ user_id, doctor_id });
    res.status(201).json(relation);
  } catch (err) { next(err); }
};
const getDoctorsForCurrentUser = async (req, res, next) => {
  try {
    const user_id = req.user.user_id;
    const role = req.user.role;

    if (role === "admin") {
      // الأدمن يرى كل الأطباء
      const doctors = await db.doctor.findAll();
      return res.json(doctors);
    }

    // المدير أو المندوب يرى الأطباء المرتبطين به فقط
    const doctorUsers = await db.doctorUser.findAll({
      where: { user_id },
      include: [
        {
          model: db.doctor,
          attributes: ["id", "name"],
          as: "Doctor",
        },
      ],
    });

    const doctors = doctorUsers.map((d) => d.Doctor);
    return res.json(doctors);
  } catch (err) {
    next(err);
  }
};



const getDoctorsByUser = async (req, res, next) => {
  try {
    const { user_id } = req.params;
    const doctors = await Doctor.findAll({
      include: {
        model: User,
        as: 'Doctors',
        through: { attributes: [] },
        where: { user_id },
      },
    });
    res.json(doctors);
  } catch (err) { next(err); }
};

const removeDoctorFromUser = async (req, res, next) => {
  try {
    const { user_id, doctor_id } = req.params;
    await DoctorUser.destroy({ where: { user_id, doctor_id } });
    res.json({ message: 'تم الحذف' });
  } catch (err) { next(err); }
};

module.exports = { assignDoctorToUser, getDoctorsByUser, removeDoctorFromUser, getDoctorsForCurrentUser };

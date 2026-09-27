const db = require('../models');
const Visit = db.visit;
const { Op } = require('sequelize');

const getAll = async (req, res, next) => {
  try {
    const visits = await Visit.findAll({
      include: [
        { model: db.user,   as: 'user',   attributes: ['full_name'] },
        { model: db.doctor, as: 'doctor', attributes: ['name'] },
        { model: db.clinic, as: 'clinic', attributes: ['clinic_name'] },
      ],
      order: [['visit_id', 'DESC']],
    });
    res.json(visits);
  } catch (err) {
    next(err);
  }
};

const getOne = async (req, res, next) => {
  try {
    const visit = await Visit.findByPk(req.params.id);
    if (!visit) return res.status(404).json({ message: 'Visit not found' });
    res.json(visit);
  } catch (err) {
    next(err);
  }
};

const createVisit = async (req, res, next) => {
  try {
    const user_id = req.user.user_id;
    const { doctor_id, clinic_id, visit_date, week_number, notes } = req.body;

    const visit = await Visit.create({
      user_id,
      doctor_id,
      clinic_id,
      visit_date,
      week_number,
      notes,
    });

    res.json({ message: 'Visit created', visit });
  } catch (err) {
    next(err);
  }
};

const updateVisit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const visit = await Visit.findByPk(id);
    if (!visit) return res.status(404).json({ message: 'Visit not found' });
    await visit.update(req.body);
    res.json({ message: 'Visit updated', visit });
  } catch (err) {
    next(err);
  }
};

const deleteVisit = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Visit.destroy({ where: { visit_id: id } });
    res.json({ message: 'Visit deleted' });
  } catch (err) {
    next(err);
  }
};

const getAvailableDoctorsToday = async (req, res, next) => {
  try {
    const user_id = req.user.user_id;
    const daysMap = {
      0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
      4: 'Thursday', 5: 'Friday', 6: 'Saturday',
    };
    const todayName = daysMap[new Date().getDay()];

    const plans = await db.visit_plan.findAll({
      where: { user_id },
      include: [
        {
          model: db.visit_plan_schedule,
          as: 'schedules',
          where: { visit_day: todayName },
          required: true,
        },
        { model: db.doctor, as: 'doctor', attributes: ['id', 'name'] },
      ],
    });

    const availableDoctors = plans.map((p) => p.doctor);
    res.json(availableDoctors);
  } catch (err) {
    next(err);
  }
};

// ─── مشاركة الموقع ─────────────────────────────────────────────────────────
const shareLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { lat, lng, sharedAt } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ message: 'بيانات الموقع ناقصة' });
    }

    const visit = await Visit.findByPk(id);
    if (!visit) return res.status(404).json({ message: 'الزيارة غير موجودة' });

    await visit.update({
      shared_lat: lat,
      shared_lng: lng,
      shared_at: sharedAt ? new Date(sharedAt) : new Date(),
    });

    res.json({ message: 'تم حفظ الموقع بنجاح', visit });
  } catch (err) {
    next(err);
  }
};

// ─── خريطة المواقع (Admin & Manager) ────────────────────────────────────────
const getSharedLocations = async (req, res, next) => {
  try {
    const currentUser = await db.user.findByPk(req.user.user_id);
    if (!currentUser) return res.status(404).json({ message: 'المستخدم غير موجود' });

    let whereClause = {
      shared_lat: { [Op.not]: null },
      shared_lng: { [Op.not]: null },
    };

    if (currentUser.role === 'manager') {
      // المدير يشوف مندوبيه فقط
      const subordinates = await db.user.findAll({
        where: { manager_id: currentUser.user_id },
        attributes: ['user_id'],
      });
      const ids = subordinates.map((u) => u.user_id);
      whereClause.user_id = { [Op.in]: ids };
    }
    // admin: يشوف الكل — لا filter إضافي

    const visits = await Visit.findAll({
      where: whereClause,
      include: [
        { model: db.user,   as: 'user',   attributes: ['user_id', 'full_name', 'role'] },
        { model: db.doctor, as: 'doctor', attributes: ['name'] },
        { model: db.clinic, as: 'clinic', attributes: ['clinic_name'] },
      ],
      order: [['shared_at', 'DESC']],
    });

    res.json(visits);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAll,
  getOne,
  createVisit,
  updateVisit,
  deleteVisit,
  getAvailableDoctorsToday,
  shareLocation,
  getSharedLocations,
};

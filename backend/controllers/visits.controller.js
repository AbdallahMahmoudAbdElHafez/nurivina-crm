const db = require('../models');
const { Op } = require('sequelize');
const { getAccessibleUserIds } = require('../utils/hierarchy');

const Visit = db.visit;

// إرجاع الزيارات حسب الصلاحيات والهيكل الإداري:
// 1. الأدمن: يرى جميع الزيارات لكل المستخدمين
// 2. المدير: يرى زياراته وزيارات كل المستخدمين التابعين له
// 3. المستخدم/المندوب: يرى فقط الزيارات التي سجلها بنفسه
const getAll = async (req, res, next) => {
  try {
    const accessibleUserIds = await getAccessibleUserIds(req.user);

    const whereClause = {};
    if (accessibleUserIds !== null) {
      whereClause.user_id = { [Op.in]: accessibleUserIds };
    }

    const visits = await Visit.findAll({
      where: whereClause,
      include: [
        { model: db.user, as: 'user', attributes: ['user_id', 'full_name', 'role'] },
        { model: db.doctor, as: 'doctor', attributes: ['id', 'name'] },
        { model: db.clinic, as: 'clinic', attributes: ['id', 'clinic_name'] },
      ],
      order: [['visit_id', 'DESC']],
    });
    res.json(visits);
  } catch (err) {
    next(err);
  }
};

// إرجاع زيارة واحدة مع التحقق من الصلاحيات
const getOne = async (req, res, next) => {
  try {
    const visit = await Visit.findByPk(req.params.id, {
      include: [
        { model: db.user, as: 'user', attributes: ['user_id', 'full_name', 'role'] },
        { model: db.doctor, as: 'doctor', attributes: ['id', 'name'] },
        { model: db.clinic, as: 'clinic', attributes: ['id', 'clinic_name'] },
      ],
    });
    if (!visit) return res.status(404).json({ message: 'الزيارة غير موجودة' });

    const accessibleUserIds = await getAccessibleUserIds(req.user);
    if (accessibleUserIds !== null && !accessibleUserIds.includes(visit.user_id)) {
      return res.status(403).json({ message: 'ليس لديك صلاحية لعرض هذه الزيارة' });
    }

    res.json(visit);
  } catch (err) {
    next(err);
  }
};

// تسجيل زيارة جديدة (ترتبط تلقائيًا بالمستخدم الحالي)
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

    const fullVisit = await Visit.findByPk(visit.visit_id, {
      include: [
        { model: db.user, as: 'user', attributes: ['user_id', 'full_name', 'role'] },
        { model: db.doctor, as: 'doctor', attributes: ['id', 'name'] },
        { model: db.clinic, as: 'clinic', attributes: ['id', 'clinic_name'] },
      ],
    });

    res.status(201).json({ message: 'تم إنشاء الزيارة بنجاح', visit: fullVisit });
  } catch (err) {
    next(err);
  }
};

// تحديث زيارة مع التحقق من الصلاحيات
const updateVisit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const visit = await Visit.findByPk(id);
    if (!visit) return res.status(404).json({ message: 'الزيارة غير موجودة' });

    const accessibleUserIds = await getAccessibleUserIds(req.user);
    if (accessibleUserIds !== null && !accessibleUserIds.includes(visit.user_id)) {
      return res.status(403).json({ message: 'ليس لديك صلاحية لتعديل هذه الزيارة' });
    }

    await visit.update(req.body);

    const updatedVisit = await Visit.findByPk(id, {
      include: [
        { model: db.user, as: 'user', attributes: ['user_id', 'full_name', 'role'] },
        { model: db.doctor, as: 'doctor', attributes: ['id', 'name'] },
        { model: db.clinic, as: 'clinic', attributes: ['id', 'clinic_name'] },
      ],
    });

    res.json({ message: 'تم تحديث الزيارة', visit: updatedVisit });
  } catch (err) {
    next(err);
  }
};

// حذف زيارة مع التحقق من الصلاحيات
const deleteVisit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const visit = await Visit.findByPk(id);
    if (!visit) return res.status(404).json({ message: 'الزيارة غير موجودة' });

    const accessibleUserIds = await getAccessibleUserIds(req.user);
    if (accessibleUserIds !== null && !accessibleUserIds.includes(visit.user_id)) {
      return res.status(403).json({ message: 'ليس لديك صلاحية لحذف هذه الزيارة' });
    }

    await visit.destroy();
    res.json({ message: 'تم حذف الزيارة بنجاح' });
  } catch (err) {
    next(err);
  }
};

// إرجاع الأطباء المتاحين لليوم للمستخدم الحالي أو فريقه
const getAvailableDoctorsToday = async (req, res, next) => {
  try {
    const accessibleUserIds = await getAccessibleUserIds(req.user);
    const whereClause = {};
    if (accessibleUserIds !== null) {
      whereClause.user_id = { [Op.in]: accessibleUserIds };
    }

    const daysMap = {
      0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
      4: 'Thursday', 5: 'Friday', 6: 'Saturday',
    };
    const todayName = daysMap[new Date().getDay()];

    const plans = await db.visit_plan.findAll({
      where: whereClause,
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

    const doctorMap = new Map();
    plans.forEach((p) => {
      if (p.doctor && !doctorMap.has(p.doctor.id)) {
        doctorMap.set(p.doctor.id, p.doctor);
      }
    });

    res.json(Array.from(doctorMap.values()));
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

    const accessibleUserIds = await getAccessibleUserIds(req.user);
    if (accessibleUserIds !== null && !accessibleUserIds.includes(visit.user_id)) {
      return res.status(403).json({ message: 'ليس لديك صلاحية لمشاركة موقع هذه الزيارة' });
    }

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
    const accessibleUserIds = await getAccessibleUserIds(req.user);

    let whereClause = {
      shared_lat: { [Op.not]: null },
      shared_lng: { [Op.not]: null },
    };

    if (accessibleUserIds !== null) {
      whereClause.user_id = { [Op.in]: accessibleUserIds };
    }

    const visits = await Visit.findAll({
      where: whereClause,
      include: [
        { model: db.user, as: 'user', attributes: ['user_id', 'full_name', 'role'] },
        { model: db.doctor, as: 'doctor', attributes: ['id', 'name'] },
        { model: db.clinic, as: 'clinic', attributes: ['id', 'clinic_name'] },
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


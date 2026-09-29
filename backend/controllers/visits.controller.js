const db = require('../models');
const { Op } = require('sequelize');
const { getAccessibleUserIds } = require('../utils/hierarchy');

const Visit = db.visit;

// ─── حساب المسافة بين نقطتين (Haversine بالمتر) ─────────────────────────────
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // نصف قطر الأرض بالمتر
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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

// ─── تسجيل زيارة جديدة مع نظام الاعتماد ─────────────────────────────────────
const createVisit = async (req, res, next) => {
  try {
    const user_id = req.user.user_id;
    const user_role = req.user.role;
    const {
      doctor_id,
      clinic_id,
      visit_date,
      week_number,
      notes,
      is_new_doctor,   // هل الطبيب جديد (أضافه المندوب في هذه الزيارة)
      is_new_clinic,   // هل العيادة جديدة (أضافها المندوب في هذه الزيارة)
      visit_lat,
      visit_lng,
    } = req.body;

    let status = 'approved';
    let approval_type = null;
    let deviation_meters = null;
    let created_doctor_id = null;
    let created_clinic_id = null;

    // الأدمن دائمًا معتمد تلقائيًا
    if (user_role !== 'admin') {
      // الحالة 1: دكتور جديد → يحتاج اعتماد المدير
      if (is_new_doctor) {
        status = 'pending_approval';
        approval_type = 'new_doctor';
        created_doctor_id = doctor_id;
        created_clinic_id = clinic_id;
      }
      // الحالة 2: دكتور موجود + عيادة جديدة → يحتاج اعتماد المدير
      else if (is_new_clinic) {
        status = 'pending_approval';
        approval_type = 'new_clinic';
        created_clinic_id = clinic_id;
      }
    }

    const visit = await Visit.create({
      user_id,
      doctor_id,
      clinic_id,
      visit_date,
      week_number,
      notes,
      status,
      approval_type,
      deviation_meters,
      created_doctor_id,
      created_clinic_id,
      shared_lat: visit_lat || null,
      shared_lng: visit_lng || null,
      shared_at: (visit_lat && visit_lng) ? new Date() : null,
    });

    const fullVisit = await Visit.findByPk(visit.visit_id, {
      include: [
        { model: db.user, as: 'user', attributes: ['user_id', 'full_name', 'role'] },
        { model: db.doctor, as: 'doctor', attributes: ['id', 'name'] },
        { model: db.clinic, as: 'clinic', attributes: ['id', 'clinic_name'] },
      ],
    });

    const message =
      status === 'pending_approval'
        ? 'تم إنشاء الزيارة وهي بانتظار اعتماد المدير'
        : 'تم إنشاء الزيارة بنجاح';

    res.status(201).json({ message, visit: fullVisit });
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

    let status = visit.status;
    let approval_type = visit.approval_type;
    let deviation_meters = visit.deviation_meters;

    // فحص انحراف الموقع إذا كانت الزيارة غير معلقة على سبب آخر
    if (!approval_type || approval_type === 'location_deviation') {
      const previousVisit = await Visit.findOne({
        where: {
          doctor_id: visit.doctor_id,
          clinic_id: visit.clinic_id,
          visit_id: { [Op.ne]: visit.visit_id },
          shared_lat: { [Op.not]: null },
          shared_lng: { [Op.not]: null },
          status: 'approved',
        },
        order: [['visit_id', 'DESC']],
      });

      if (previousVisit) {
        const distance = haversineMeters(
          lat,
          lng,
          previousVisit.shared_lat,
          previousVisit.shared_lng
        );

        if (distance > 50) {
          status = 'pending_approval';
          approval_type = 'location_deviation';
          deviation_meters = Math.round(distance);
        }
      }
    }

    await visit.update({
      shared_lat: lat,
      shared_lng: lng,
      shared_at: sharedAt ? new Date(sharedAt) : new Date(),
      status,
      approval_type,
      deviation_meters,
    });

    const updatedVisit = await Visit.findByPk(id, {
      include: [
        { model: db.user, as: 'user', attributes: ['user_id', 'full_name', 'role'] },
        { model: db.doctor, as: 'doctor', attributes: ['id', 'name'] },
        { model: db.clinic, as: 'clinic', attributes: ['id', 'clinic_name'] },
      ],
    });

    res.json({ message: 'تم حفظ الموقع بنجاح', visit: updatedVisit });
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

// ─── جلب العيادات المرتبطة بدكتور محدد من جدول الزيارات ───────────────────────
const getClinicsByDoctor = async (req, res, next) => {
  try {
    const { doctor_id } = req.params;
    const accessibleUserIds = await getAccessibleUserIds(req.user);

    const whereClause = { doctor_id };
    if (accessibleUserIds !== null) {
      whereClause.user_id = { [Op.in]: accessibleUserIds };
    }

    const visits = await Visit.findAll({
      where: whereClause,
      include: [
        {
          model: db.clinic,
          as: 'clinic',
          attributes: ['id', 'clinic_name', 'address', 'clinic_phone', 'city_id'],
        },
      ],
      attributes: ['clinic_id'],
      order: [['visit_id', 'DESC']],
    });

    const clinicMap = new Map();
    visits.forEach((v) => {
      if (v.clinic && !clinicMap.has(v.clinic.id)) {
        clinicMap.set(v.clinic.id, v.clinic);
      }
    });

    res.json(Array.from(clinicMap.values()));
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ─── نظام الاعتماد (Approval System) ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// جلب الزيارات المعلّقة التي تنتظر اعتماد المدير/الأدمن
const getPendingApprovals = async (req, res, next) => {
  try {
    const accessibleUserIds = await getAccessibleUserIds(req.user);

    const whereClause = { status: 'pending_approval' };
    if (accessibleUserIds !== null) {
      whereClause.user_id = { [Op.in]: accessibleUserIds };
    }

    const visits = await Visit.findAll({
      where: whereClause,
      include: [
        { model: db.user, as: 'user', attributes: ['user_id', 'full_name', 'role'] },
        { model: db.doctor, as: 'doctor', attributes: ['id', 'name'] },
        { model: db.clinic, as: 'clinic', attributes: ['id', 'clinic_name', 'address'] },
      ],
      order: [['visit_id', 'DESC']],
    });

    res.json(visits);
  } catch (err) {
    next(err);
  }
};

// اعتماد زيارة معلّقة
const approveVisit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const visit = await Visit.findByPk(id);
    if (!visit) return res.status(404).json({ message: 'الزيارة غير موجودة' });

    if (visit.status !== 'pending_approval') {
      return res.status(400).json({ message: 'هذه الزيارة ليست في حالة انتظار الاعتماد' });
    }

    // التحقق من أن المدير لديه صلاحية على مندوب هذه الزيارة
    const accessibleUserIds = await getAccessibleUserIds(req.user);
    if (accessibleUserIds !== null && !accessibleUserIds.includes(visit.user_id)) {
      return res.status(403).json({ message: 'ليس لديك صلاحية لاعتماد هذه الزيارة' });
    }

    await visit.update({ status: 'approved' });

    const updatedVisit = await Visit.findByPk(id, {
      include: [
        { model: db.user, as: 'user', attributes: ['user_id', 'full_name', 'role'] },
        { model: db.doctor, as: 'doctor', attributes: ['id', 'name'] },
        { model: db.clinic, as: 'clinic', attributes: ['id', 'clinic_name'] },
      ],
    });

    res.json({ message: 'تم اعتماد الزيارة بنجاح', visit: updatedVisit });
  } catch (err) {
    next(err);
  }
};

// رفض زيارة معلّقة (مع حذف الدكتور أو العيادة الجديدة حسب نوع الطلب)
const rejectVisit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    const visit = await Visit.findByPk(id);
    if (!visit) return res.status(404).json({ message: 'الزيارة غير موجودة' });

    if (visit.status !== 'pending_approval') {
      return res.status(400).json({ message: 'هذه الزيارة ليست في حالة انتظار الاعتماد' });
    }

    // التحقق من أن المدير لديه صلاحية على مندوب هذه الزيارة
    const accessibleUserIds = await getAccessibleUserIds(req.user);
    if (accessibleUserIds !== null && !accessibleUserIds.includes(visit.user_id)) {
      return res.status(403).json({ message: 'ليس لديك صلاحية لرفض هذه الزيارة' });
    }

    // ──────────────────────────────────────────────────────────
    // حذف الدكتور الجديد إذا كان نوع الطلب "new_doctor"
    // (فقط إذا لم تكن هناك زيارات أخرى معتمدة لهذا الدكتور)
    // ──────────────────────────────────────────────────────────
    if (visit.approval_type === 'new_doctor' && visit.created_doctor_id) {
      const otherVisits = await Visit.count({
        where: {
          doctor_id: visit.created_doctor_id,
          visit_id: { [Op.ne]: visit.visit_id },
          status: { [Op.ne]: 'rejected' },
        },
      });
      if (otherVisits === 0) {
        // حذف العيادة الجديدة المرتبطة أيضاً
        if (visit.created_clinic_id) {
          const otherClinicVisits = await Visit.count({
            where: {
              clinic_id: visit.created_clinic_id,
              visit_id: { [Op.ne]: visit.visit_id },
              status: { [Op.ne]: 'rejected' },
            },
          });
          if (otherClinicVisits === 0) {
            await db.clinic.destroy({ where: { id: visit.created_clinic_id } });
          }
        }
        await db.doctor.destroy({ where: { id: visit.created_doctor_id } });
      }
    }

    // ──────────────────────────────────────────────────────────
    // حذف العيادة الجديدة إذا كان نوع الطلب "new_clinic"
    // (فقط إذا لم تكن هناك زيارات أخرى معتمدة لهذه العيادة)
    // ──────────────────────────────────────────────────────────
    if (visit.approval_type === 'new_clinic' && visit.created_clinic_id) {
      const otherVisits = await Visit.count({
        where: {
          clinic_id: visit.created_clinic_id,
          visit_id: { [Op.ne]: visit.visit_id },
          status: { [Op.ne]: 'rejected' },
        },
      });
      if (otherVisits === 0) {
        await db.clinic.destroy({ where: { id: visit.created_clinic_id } });
      }
    }

    // تحديث حالة الزيارة إلى "مرفوضة"
    await visit.update({
      status: 'rejected',
      rejection_reason: rejection_reason || 'مرفوض من المدير',
    });

    res.json({ message: 'تم رفض الزيارة بنجاح' });
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
  getClinicsByDoctor,
  getPendingApprovals,
  approveVisit,
  rejectVisit,
};

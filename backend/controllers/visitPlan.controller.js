const db = require('../models');
const { Op } = require('sequelize');
const { getAccessibleUserIds } = require('../utils/hierarchy');

const VisitPlan = db.visit_plan;
const Doctor = db.doctor;
const Clinic = db.clinic;
const Schedule = db.visit_plan_schedule;

// إنشاء خطة زيارة جديدة مع جدول المواعيد
const create = async (req, res, next) => {
  try {
    const { doctor_id, clinic_id, marketClass, visit_frequency, schedules } = req.body;
    const user_id = req.user?.user_id;

    if (!doctor_id) {
      return res.status(400).json({ message: 'الطبيب مطلوب' });
    }

    // فحص ما إذا كان هناك خطة مسبقة لنفس الطبيب والمستخدم
    let plan = await VisitPlan.findOne({ where: { doctor_id } });
    if (plan) {
      await plan.update({
        clinic_id: clinic_id ?? plan.clinic_id,
        marketClass: marketClass ?? plan.marketClass,
        visit_frequency: visit_frequency ?? plan.visit_frequency,
      });
    } else {
      plan = await VisitPlan.create({
        user_id,
        doctor_id,
        clinic_id,
        marketClass,
        visit_frequency,
      });
    }

    if (schedules && schedules.length > 0) {
      const formattedSchedules = schedules.map((s) => ({
        visit_plan_id: plan.id,
        visit_day: s.visit_day,
        time_from: s.time_from,
        time_to: s.time_to,
      }));
      await Schedule.bulkCreate(formattedSchedules);
    }

    const fullPlan = await VisitPlan.findByPk(plan.id, {
      include: [
        { model: Doctor, as: 'doctor', attributes: ['id', 'name'] },
        { model: Clinic, as: 'clinic', attributes: ['id', 'clinic_name'] },
        { model: Schedule, as: 'schedules' },
      ],
    });

    res.status(201).json(fullPlan);
  } catch (err) {
    next(err);
  }
};

// عرض الخطط حسب الصلاحيات (أدمن: الكل، مدير: فريقه، مندوب: خططه فقط)
const getAll = async (req, res, next) => {
  try {
    const accessibleUserIds = await getAccessibleUserIds(req.user);
    const whereClause = {};
    if (accessibleUserIds !== null) {
      whereClause.user_id = { [Op.in]: accessibleUserIds };
    }

    const plans = await VisitPlan.findAll({
      where: whereClause,
      include: [
        { model: Doctor, as: 'doctor', attributes: ['id', 'name'] },
        { model: Clinic, as: 'clinic', attributes: ['id', 'clinic_name'] },
        { model: Schedule, as: 'schedules' },
      ],
    });
    res.json(plans);
  } catch (err) {
    next(err);
  }
};

// عرض خطة واحدة مع التحقق من الصلاحية
const getOne = async (req, res, next) => {
  try {
    const plan = await VisitPlan.findByPk(req.params.id, {
      include: [
        { model: Doctor, as: 'doctor', attributes: ['id', 'name'] },
        { model: Clinic, as: 'clinic', attributes: ['id', 'clinic_name'] },
        { model: Schedule, as: 'schedules' },
      ],
    });
    if (!plan) return res.status(404).json({ message: 'الخطة غير موجودة' });

    const accessibleUserIds = await getAccessibleUserIds(req.user);
    if (accessibleUserIds !== null && !accessibleUserIds.includes(plan.user_id)) {
      return res.status(403).json({ message: 'ليس لديك صلاحية لعرض هذه الخطة' });
    }

    res.json(plan);
  } catch (err) {
    next(err);
  }
};

// تحديث خطة زيارة ومواعيدها مع التحقق من الصلاحية
const update = async (req, res, next) => {
  try {
    const plan = await VisitPlan.findByPk(req.params.id);
    if (!plan) return res.status(404).json({ message: 'الخطة غير موجودة' });

    const accessibleUserIds = await getAccessibleUserIds(req.user);
    if (accessibleUserIds !== null && !accessibleUserIds.includes(plan.user_id)) {
      return res.status(403).json({ message: 'ليس لديك صلاحية لتعديل هذه الخطة' });
    }

    const { doctor_id, clinic_id, marketClass, visit_frequency, schedules } = req.body;

    await plan.update({
      doctor_id: doctor_id ?? plan.doctor_id,
      clinic_id: clinic_id ?? plan.clinic_id,
      marketClass: marketClass ?? plan.marketClass,
      visit_frequency: visit_frequency ?? plan.visit_frequency,
    });

    if (schedules) {
      await Schedule.destroy({ where: { visit_plan_id: plan.id } });
      const formattedSchedules = schedules.map((s) => ({
        visit_plan_id: plan.id,
        visit_day: s.visit_day,
        time_from: s.time_from,
        time_to: s.time_to,
      }));
      await Schedule.bulkCreate(formattedSchedules);
    }

    const updatedPlan = await VisitPlan.findByPk(plan.id, {
      include: [{ model: Schedule, as: 'schedules' }],
    });

    res.json(updatedPlan);
  } catch (err) {
    next(err);
  }
};

// حذف خطة زيارة مع التحقق من الصلاحية
const remove = async (req, res, next) => {
  try {
    const plan = await VisitPlan.findByPk(req.params.id);
    if (!plan) return res.status(404).json({ message: 'الخطة غير موجودة' });

    const accessibleUserIds = await getAccessibleUserIds(req.user);
    if (accessibleUserIds !== null && !accessibleUserIds.includes(plan.user_id)) {
      return res.status(403).json({ message: 'ليس لديك صلاحية لحذف هذه الخطة' });
    }

    await VisitPlan.destroy({ where: { id: req.params.id } });
    res.json({ message: 'تم حذف الخطة بنجاح' });
  } catch (err) {
    next(err);
  }
};

module.exports = { create, getAll, getOne, update, remove };


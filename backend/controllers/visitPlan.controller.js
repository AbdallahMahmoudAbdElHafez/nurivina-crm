const db = require('../models');
const VisitPlan = db.visit_plan;
const Doctor = db.doctor;
const Clinic = db.clinic;
const Schedule = db.visit_plan_schedule;

// إنشاء خطة زيارة جديدة مع جدول المواعيد
const create = async (req, res, next) => {
  try {
    const { doctor_id, clinic_id, marketClass, visit_frequency, schedules } = req.body;

    if (!doctor_id || !schedules || schedules.length === 0) {
      return res.status(400).json({ message: 'الطبيب وجدول المواعيد مطلوبان' });
    }

    const plan = await VisitPlan.create({
      doctor_id,
      clinic_id,
      marketClass,
      visit_frequency,
    });

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

// عرض جميع الخطط مع المواعيد
const getAll = async (req, res, next) => {
  try {
    const plans = await VisitPlan.findAll({
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

// عرض خطة واحدة
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
    res.json(plan);
  } catch (err) {
    next(err);
  }
};

// تحديث خطة زيارة ومواعيدها
const update = async (req, res, next) => {
  try {
    const plan = await VisitPlan.findByPk(req.params.id);
    if (!plan) return res.status(404).json({ message: 'الخطة غير موجودة' });

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

// حذف خطة زيارة كاملة مع المواعيد التابعة
const remove = async (req, res, next) => {
  try {
    const deleted = await VisitPlan.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'الخطة غير موجودة' });
    res.json({ message: 'تم حذف الخطة بنجاح' });
  } catch (err) {
    next(err);
  }
};

module.exports = { create, getAll, getOne, update, remove };

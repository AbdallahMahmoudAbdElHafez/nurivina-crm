const db = require('../models');
const Clinic = db.clinic;
const City = db.city;

// إنشاء عيادة
const create = async (req, res, next) => {
  try {
    const { clinic_name, address, city_id, clinic_phone } = req.body;
    if (!clinic_name) return res.status(400).json({ message: 'Clinic name is required' });

    const clinic = await Clinic.create({ clinic_name, address, city_id, clinic_phone });
    res.status(201).json(clinic);
  } catch (err) {
    next(err);
  }
};

// كل العيادات مع اسم المدينة
const getAll = async (req, res, next) => {
  try {
    const clinics = await Clinic.findAll({ include: [{ model: City, as: 'city', attributes: ['id', 'name'] }] });
    res.json(clinics);
  } catch (err) {
    next(err);
  }
};

// عيادة واحدة
const getOne = async (req, res, next) => {
  try {
    const clinic = await Clinic.findByPk(req.params.id, {
      include: [{ model: City, as: 'city', attributes: ['id', 'name'] }],
    });
    if (!clinic) return res.status(404).json({ message: 'Clinic not found' });
    res.json(clinic);
  } catch (err) {
    next(err);
  }
};

// تحديث عيادة
const update = async (req, res, next) => {
  try {
    const clinic = await Clinic.findByPk(req.params.id);
    if (!clinic) return res.status(404).json({ message: 'Clinic not found' });

    const { clinic_name, address, city_id, clinic_phone } = req.body;
    clinic.clinic_name = clinic_name ?? clinic.clinic_name;
    clinic.address = address ?? clinic.address;
    clinic.city_id = city_id ?? clinic.city_id;
    clinic.clinic_phone = clinic_phone ?? clinic.clinic_phone;

    await clinic.save();
    res.json(clinic);
  } catch (err) {
    next(err);
  }
};

// حذف عيادة
const remove = async (req, res, next) => {
  try {
    const deleted = await Clinic.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Clinic not found' });
    res.json({ message: 'Clinic deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { create, getAll, getOne, update, remove };

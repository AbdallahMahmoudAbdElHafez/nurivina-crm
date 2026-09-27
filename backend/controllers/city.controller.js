const db = require('../models');
const City = db.city;

// إنشاء مدينة
const create = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const city = await City.create({ name });
    res.status(201).json(city);
  } catch (err) {
    next(err);
  }
};

// كل المدن
const getAll = async (req, res, next) => {
  try {
    const cities = await City.findAll();
    res.json(cities);
  } catch (err) {
    next(err);
  }
};

// مدينة واحدة
const getOne = async (req, res, next) => {
  try {
    const city = await City.findByPk(req.params.id);
    if (!city) return res.status(404).json({ message: 'City not found' });
    res.json(city);
  } catch (err) {
    next(err);
  }
};

// تحديث مدينة
const update = async (req, res, next) => {
  try {
    const city = await City.findByPk(req.params.id);
    if (!city) return res.status(404).json({ message: 'City not found' });

    city.name = req.body.name ?? city.name;
    await city.save();
    res.json(city);
  } catch (err) {
    next(err);
  }
};

// حذف مدينة
const remove = async (req, res, next) => {
  try {
    const deleted = await City.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'City not found' });
    res.json({ message: 'City deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { create, getAll, getOne, update, remove };

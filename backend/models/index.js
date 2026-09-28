const { Sequelize, DataTypes } = require('sequelize');
const dbConfig = require('../config/db.config');

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.DIALECT,
  port: dbConfig.PORT,
  dialectOptions: dbConfig.dialectOptions,
  pool: dbConfig.pool,
  logging: false
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// models
db.doctor = require('./doctor.model')(sequelize, DataTypes);
db.user = require('./user.model')(sequelize, DataTypes);
db.city = require('./city.model')(sequelize, DataTypes);
db.clinic = require('./clinic.model')(sequelize, DataTypes);
db.visit = require('./visits.model')(sequelize, DataTypes);
db.doctorUser = require('./doctorUser.model')(sequelize, Sequelize.DataTypes);
db.visit_plan_schedule = require('./visitPlanSchedule.model.js')(sequelize, Sequelize.DataTypes);
db.visit_plan = require('./visitPlan.model')(sequelize, DataTypes);
db.user.belongsToMany(db.doctor, {
  through: db.doctorUser,
  foreignKey: 'user_id',
  otherKey: 'doctor_id',
    as: 'Users' // اسم عكسي
});


db.doctor.belongsToMany(db.user, {
  through: db.doctorUser,
  foreignKey: 'doctor_id',
  otherKey: 'user_id',
    as: 'Doctors' // أضف هذا الاسم

});
db.doctorUser.belongsTo(db.user, { foreignKey: 'user_id', as: 'User' });
db.doctorUser.belongsTo(db.doctor, { foreignKey: 'doctor_id', as: 'Doctor' });



// بعد كل التعريفات
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;


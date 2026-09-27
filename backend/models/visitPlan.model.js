module.exports = (sequelize, DataTypes) => {
  const VisitPlan = sequelize.define('visit_plan', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    doctor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true, // لا يسمح بتكرار نفس الدكتور
    },
    clinic_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    visit_frequency: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    marketClass: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    firstWeek: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0,
    },
    secondWeek: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0,
    },
    thirdWeek: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0,
    },
    fourthWeek: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0,
    },
    fifthWeek: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    timestamps: true,
    tableName: 'visit_plans',
  });

  // تعريف العلاقات كلها في مكان واحد
  VisitPlan.associate = (models) => {
    VisitPlan.belongsTo(models.user, { foreignKey: 'user_id', as: 'user' });
    VisitPlan.belongsTo(models.doctor, { foreignKey: 'doctor_id', as: 'doctor' });
    VisitPlan.belongsTo(models.clinic, { foreignKey: 'clinic_id', as: 'clinic' });
    VisitPlan.hasMany(models.visit_plan_schedule, {
      foreignKey: 'visit_plan_id',
      as: 'schedules',
      onDelete: 'CASCADE',
    });
  };

  return VisitPlan;
};

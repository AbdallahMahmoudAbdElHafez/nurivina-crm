module.exports = (sequelize, DataTypes) => {
  const VisitPlanSchedule = sequelize.define('visit_plan_schedule', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    visit_plan_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    visit_day: {
      type: DataTypes.ENUM('Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday'),
      allowNull: false,
    },
    time_from: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    time_to: {
      type: DataTypes.TIME,
      allowNull: false,
    },
  }, {
    timestamps: false,
    tableName: 'visit_plan_schedules',
  });

  VisitPlanSchedule.associate = (models) => {
    VisitPlanSchedule.belongsTo(models.visit_plan, {
      foreignKey: 'visit_plan_id',
      as: 'plan',
      onDelete: 'CASCADE'
    });
  };

  return VisitPlanSchedule;
};

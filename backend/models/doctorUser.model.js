module.exports = (sequelize, DataTypes) => {
  const DoctorUser = sequelize.define('DoctorUser', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    doctor_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  }, {
    tableName: 'doctors_users',
    timestamps: false
  });

  return DoctorUser;
};

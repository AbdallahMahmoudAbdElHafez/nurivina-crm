module.exports = (sequelize, DataTypes) => {
  const Clinic = sequelize.define('Clinic', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    clinic_name: { type: DataTypes.STRING(150), allowNull: false },
    address: { type: DataTypes.STRING(255), allowNull: true },
    city_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    clinic_phone: { type: DataTypes.STRING(20), allowNull: true },
  }, {
    tableName: 'clinics',
    timestamps: false,
  });

  Clinic.associate = (models) => {
    Clinic.belongsTo(models.city, { foreignKey: 'city_id', as: 'city' });
  };

  return Clinic;
};

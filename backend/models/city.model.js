module.exports = (sequelize, DataTypes) => {
  const City = sequelize.define('City', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false }
  }, {
    tableName: 'cities',
    timestamps: true
  });
  return City;
};

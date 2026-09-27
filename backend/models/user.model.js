

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
     user_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    full_name: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: "rep",
    },
    manager_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    tableName: 'users',
    timestamps: false,
  });
User.belongsTo(User, { as: "manager", foreignKey: "manager_id" });
User.hasMany(User, { as: "subordinates", foreignKey: "manager_id" });

  return User;

};
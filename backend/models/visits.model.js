module.exports = (sequelize, DataTypes) => {
  const Visit = sequelize.define('visit', {
    visit_id: {
      type: DataTypes.INTEGER,
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
    },
    clinic_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    visit_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    week_number: {
      type: DataTypes.TINYINT,
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
    },
    shared_lat: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    shared_lng: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    shared_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    timestamps: false,
    tableName: 'visits',
  });

  Visit.associate = (models) => {
    Visit.belongsTo(models.user,   { foreignKey: 'user_id',   as: 'user'   });
    Visit.belongsTo(models.doctor, { foreignKey: 'doctor_id', as: 'doctor' });
    Visit.belongsTo(models.clinic, { foreignKey: 'clinic_id', as: 'clinic' });
  };

  return Visit;
};

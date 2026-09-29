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
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'approved', // 'approved' | 'pending_approval' | 'rejected'
    },
    approval_type: {
      type: DataTypes.STRING(50),
      allowNull: true, // 'new_doctor' | 'new_clinic' | 'location_deviation'
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    deviation_meters: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    created_doctor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    created_clinic_id: {
      type: DataTypes.INTEGER,
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

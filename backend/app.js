
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const db = require('./models');
const doctorRoutes = require('./routes/doctor.routes');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const errorHandler = require('./middlewares/errorHandler');
const cityRoutes = require('./routes/city.routes');
const clinicRoutes = require('./routes/clinic.routes');
const visitPlanRoutes = require('./routes/visitPlan.routes');
const visitRoutes = require('./routes/visits.routes');
const doctorUserRoutes = require('./routes/doctorUser.routes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/clinics', clinicRoutes);
app.use('/api/visit-plans', visitPlanRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/doctor-users', doctorUserRoutes);

const frontendBuildPath = path.join(__dirname, '../frontend/build');
app.use(express.static(frontendBuildPath));

app.use(errorHandler);

// Catch all non-API routes and serve index.html for React SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

const PORT = process.env.PORT || 4000;

const ensureVisitColumns = async () => {
  try {
    const qi = db.sequelize.getQueryInterface();
    const tableDesc = await qi.describeTable('visits');
    if (!tableDesc.status) {
      await qi.addColumn('visits', 'status', {
        type: db.Sequelize.STRING(30),
        allowNull: false,
        defaultValue: 'approved',
      });
    }
    if (!tableDesc.approval_type) {
      await qi.addColumn('visits', 'approval_type', {
        type: db.Sequelize.STRING(50),
        allowNull: true,
      });
    }
    if (!tableDesc.rejection_reason) {
      await qi.addColumn('visits', 'rejection_reason', {
        type: db.Sequelize.TEXT,
        allowNull: true,
      });
    }
    if (!tableDesc.deviation_meters) {
      await qi.addColumn('visits', 'deviation_meters', {
        type: db.Sequelize.FLOAT,
        allowNull: true,
      });
    }
    if (!tableDesc.created_doctor_id) {
      await qi.addColumn('visits', 'created_doctor_id', {
        type: db.Sequelize.INTEGER,
        allowNull: true,
      });
    }
    if (!tableDesc.created_clinic_id) {
      await qi.addColumn('visits', 'created_clinic_id', {
        type: db.Sequelize.INTEGER,
        allowNull: true,
      });
    }
  } catch (err) {
    console.error('Error ensuring visit columns:', err.message);
  }
};

if (process.env.VERCEL !== '1') {
  db.sequelize.sync({ force: false })
    .then(async () => {
      await ensureVisitColumns();
      console.log('Database synced & columns verified');
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    })
    .catch(err => {
      console.error('Failed to sync DB:', err);
    });
}

module.exports = app;


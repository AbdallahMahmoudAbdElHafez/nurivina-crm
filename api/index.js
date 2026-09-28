const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

const express = require('express');
const cors = require('cors');
const db = require('../backend/models');
const doctorRoutes = require('../backend/routes/doctor.routes');
const authRoutes = require('../backend/routes/auth.routes');
const userRoutes = require('../backend/routes/user.routes');
const errorHandler = require('../backend/middlewares/errorHandler');
const cityRoutes = require('../backend/routes/city.routes');
const clinicRoutes = require('../backend/routes/clinic.routes');
const visitPlanRoutes = require('../backend/routes/visitPlan.routes');
const visitRoutes = require('../backend/routes/visits.routes');
const doctorUserRoutes = require('../backend/routes/doctorUser.routes');

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

app.get('/api/health', async (req, res) => {
  try {
    await db.sequelize.authenticate();
    res.json({ status: 'ok', database: 'connected', time: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', database: err.message });
  }
});

app.use(errorHandler);

module.exports = app;


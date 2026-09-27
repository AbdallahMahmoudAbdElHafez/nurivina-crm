const router = require('express').Router();
const ctrl = require('../controllers/doctorUser.controller');
const { verifyToken } = require('../middlewares/authJwt');

// المدير فقط يمكنه التعيين
router.post('/', verifyToken, ctrl.assignDoctorToUser);
router.get('/me', verifyToken, ctrl.getDoctorsForCurrentUser);
router.get('/:user_id', verifyToken, ctrl.getDoctorsByUser);
router.delete('/:user_id/:doctor_id', verifyToken, ctrl.removeDoctorFromUser);

module.exports = router;

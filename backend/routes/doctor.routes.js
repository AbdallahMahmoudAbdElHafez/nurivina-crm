const router = require('express').Router();
const doctorCtrl = require('../controllers/doctor.controller');
const { verifyToken } = require('../middlewares/authJwt');

// CRUD Routes
router.post('/', verifyToken, doctorCtrl.create);
router.get('/', verifyToken, doctorCtrl.getAll);
router.get('/my-doctors', verifyToken, doctorCtrl.getDoctorsForCurrentUser);
router.get('/:id', verifyToken, doctorCtrl.getOne);
router.put('/:id', verifyToken, doctorCtrl.update);
router.delete('/:id', verifyToken, doctorCtrl.remove);

module.exports = router;


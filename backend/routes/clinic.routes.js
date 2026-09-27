const router = require('express').Router();
const clinicCtrl = require('../controllers/clinic.controller');
const { verifyToken, isAdmin } = require('../middlewares/authJwt');

// أي مستخدم مسجل يقدر يشوف ويضيف
router.post('/', verifyToken, clinicCtrl.create);
router.get('/', verifyToken, clinicCtrl.getAll);
router.get('/:id', verifyToken, clinicCtrl.getOne);

// تعديل/حذف للأدمن فقط
router.put('/:id', verifyToken, isAdmin, clinicCtrl.update);
router.delete('/:id', verifyToken, isAdmin, clinicCtrl.remove);

module.exports = router;

const router = require('express').Router();
const visitCtrl = require('../controllers/visitPlan.controller');
const { verifyToken, isAdmin } = require('../middlewares/authJwt');

// أي مستخدم مسجل دخول يقدر يشوف ويضيف
router.post('/', verifyToken, visitCtrl.create);
router.get('/', verifyToken, visitCtrl.getAll);
router.get('/:id', verifyToken, visitCtrl.getOne);

// تعديل/حذف للأدمن فقط
router.put('/:id', verifyToken, isAdmin, visitCtrl.update);
router.delete('/:id', verifyToken, isAdmin, visitCtrl.remove);

module.exports = router;

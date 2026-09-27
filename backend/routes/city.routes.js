const router = require('express').Router();
const cityCtrl = require('../controllers/city.controller');
const { verifyToken, isAdmin } = require('../middlewares/authJwt');

// أي مستخدم يقدر يشوف ويضيف
router.post('/', verifyToken, cityCtrl.create);
router.get('/', verifyToken, cityCtrl.getAll);
router.get('/:id', verifyToken, cityCtrl.getOne);

// تعديل/حذف للأدمن فقط
router.put('/:id', verifyToken, isAdmin, cityCtrl.update);
router.delete('/:id', verifyToken, isAdmin, cityCtrl.remove);

module.exports = router;

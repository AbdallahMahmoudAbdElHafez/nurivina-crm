const router = require('express').Router();
const userCtrl = require('../controllers/user.controller');
const { verifyToken, isAdmin } = require('../middlewares/authJwt');

router.get('/', verifyToken, userCtrl.getUsers);
router.post('/', verifyToken, isAdmin, userCtrl.createUser);
router.get('/:id', verifyToken, userCtrl.getOne);
router.put('/:id', verifyToken, userCtrl.updateUser);
router.delete('/:id', verifyToken, isAdmin, userCtrl.deleteUser);

module.exports = router;

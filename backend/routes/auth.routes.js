const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/authJwt');
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get("/me", verifyToken, (req, res) => {
  res.json({ user_id: req.user.user_id, role: req.user.role });
});
module.exports = router;

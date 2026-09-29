const router = require('express').Router();
const visitCtrl = require('../controllers/visits.controller');
const { verifyToken, isManagerOrAdmin } = require('../middlewares/authJwt');

router.get('/', verifyToken, visitCtrl.getAll);
router.get('/available/today', verifyToken, visitCtrl.getAvailableDoctorsToday);
router.get('/locations', verifyToken, isManagerOrAdmin, visitCtrl.getSharedLocations);
router.get('/:id', verifyToken, visitCtrl.getOne);
router.post('/', verifyToken, visitCtrl.createVisit);
router.post('/:id/share-location', verifyToken, visitCtrl.shareLocation);
router.put('/:id', verifyToken, visitCtrl.updateVisit);
router.delete('/:id', verifyToken, visitCtrl.deleteVisit);

module.exports = router;


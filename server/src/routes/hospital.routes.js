const hospitalCtrl = require('../controllers/hospital.ctrl');
const Router = require('koa-router');
const authJWT = require('../middlewares/authJWT');
const refresh = require('../lib/refresh');

const router = new Router();

router.post("/register", authJWT, hospitalCtrl.register);
router.get("/info", authJWT, hospitalCtrl.info);

module.exports = router; 
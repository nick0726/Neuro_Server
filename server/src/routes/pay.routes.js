const payCtrl = require('../controllers/pay.ctrl');
const Router = require('koa-router');
const authJWT = require('../middlewares/authJWT');

const router = new Router();

router.get("/success", payCtrl.Success);

//router.post("/change-password", authJWT, userCtrl.ChangePassword);

module.exports = router;
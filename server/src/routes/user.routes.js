const userCtrl = require('../controllers/user.ctrl');
const Router = require('koa-router');
const authJWT = require('../middlewares/authJWT');

const router = new Router();

router.get("/check-id", userCtrl.CheckId);
router.get("/info", authJWT, userCtrl.Info);
router.get("/rest-password", userCtrl.ResetPassword);
router.get("/access-log", authJWT, userCtrl.GetAccessLog);

router.post("/register", userCtrl.Register);
router.post("/login", userCtrl.Login);
router.post("/logout", userCtrl.Logout);
router.post("/check-password", authJWT, userCtrl.CheckPassword);
router.post("/modify", authJWT, userCtrl.Modify);
router.post("/change-password", authJWT, userCtrl.ChangePassword);

module.exports = router;
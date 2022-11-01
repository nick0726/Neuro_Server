const userCtrl = require('../controllers/user.ctrl');
const Router = require('koa-router');
const sendVerificationSMS = require("../lib/sens");

const router = new Router();

router.post("/sens", sendVerificationSMS);

const mailCtrl = require('../lib/sendmail');
router.post('/inquery-email', mailCtrl.sendInqueryMail);
router.post('/verify-email', mailCtrl.sendVerificationMail);

module.exports = router;
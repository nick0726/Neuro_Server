const CryptoJS = require("crypto-js");
const axios = require("axios");
const { db } = require("../config/database");
const Joi = require("joi");

/* 실제 작동 부, 문자 전송 */
const sendVerificationSMS = async (ctx, next) => {
  try {
    const { code, phone } =
      ctx.request.body; /* Front단에서 유저가 입력한 번호 */
    const user_phone_number = phone.split("-").join(""); // Phone Num Split 010-1234-5678 -> 01012345678

    // joi 객체 생성
    const schema = Joi.object().keys({
      code: Joi.string()
        .length(6)
        .regex(/^[0-9]+$/)
        .required()
        .messages({
          "string.base": `잘못된 형식의 입력입니다.`,
          "string.emty": `Code는 필수 입력사항입니다.`,
          "string.length": `Code는 6자리여야 합니다.`,
          "string.pattern.base": `Code는 숫자만 입력하여야 합니다.`,
        }),
      phone: Joi.string()
        .length(11)
        .regex(/^[0-9]+$/)
        .required()
        .messages({
          "string.base": `잘못된 형식의 입력입니다.`,
          "string.emty": `휴대폰 번호는 필수 입력사항입니다.`,
          "string.length": `휴대폰 번호는 11자리여야 합니다.`,
          "string.pattern.base": `휴대폰 번호는 숫자만 입력하여야 합니다.`,
        }),
    });

    // Request 값 validation
    const { error } = schema.validate(ctx.request.body);

    if (error) {
      ctx.throw(400, error.message);
    }

    // 핸드폰 번호 중복 조회
    try {
      let query = "SELECT EXISTS(SELECT * FROM user WHERE phone=?) AS count";
      const [rows, fields] = await db.promise().execute(query, [phone]);
      // 이미 등록된 번호
      if (rows[0].count > 0) {
        ctx.throw(409, "이미 등록된 핸드폰 번호입니다.");
      }
    } catch (err) {
      ctx.throw(err.statusCode || err.status || 500, err.message);
    }

    //const verificationCode = createRandomNumber(6); // 인증 코드 (n)자리 숫자
    const date = Date.now().toString(); // sens 필수 파라미터, 날짜 string

    // 환경 변수 (config 역할, sens)
    const serviceId = process.env.NCP_SENS_ID;
    const accessKey = process.env.NCP_SENS_ACCESS;
    const secretKey = process.env.NCP_SENS_SECRET;
    const senderNumber = process.env.NCP_SENS_NUMBER;
    /*sens에서 인증된 발송자 번호 */

    // url 관련 변수 선언
    const method = "POST";
    const space = " ";
    const newLine = "\n";
    const url = `https://sens.apigw.ntruss.com/sms/v2/services/${serviceId}/messages`;
    const url2 = `/sms/v2/services/${serviceId}/messages`;

    // signature 작성 : crypto-js 모듈을 이용하여 암호화
    const hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, secretKey);
    hmac.update(method);
    hmac.update(space);
    hmac.update(url2);
    hmac.update(newLine);
    hmac.update(date);
    hmac.update(newLine);
    hmac.update(accessKey);
    const hash = hmac.finalize();
    const signature = hash.toString(CryptoJS.enc.Base64);

    // sens 서버로 요청 전송
    const smsRes = await axios({
      method: "POST",
      url: url,
      headers: {
        "Content-type": "application/json; charset=utf-8",
        "x-ncp-iam-access-key": accessKey,
        "x-ncp-apigw-timestamp": date,
        "x-ncp-apigw-signature-v2": signature,
      },
      data: {
        type: "SMS",
        countryCode: "82",
        from: senderNumber,
        content: `뉴로이어즈 본인확인 인증번호는 [${code}] 입니다.`,
        messages: [{ to: `${user_phone_number}` }],
      },
    });
    console.log("response", smsRes.data);
    //return res.status(200).json({ message: "SMS sent" });
    ctx.status = 200;
    ctx.body = { message: "SMS 전송 성공" };
    return next();
  } catch (err) {
    ctx.throw(err.statusCode || err.status || 500, err.message);
    //console.log(err);
  }
};

module.exports = sendVerificationSMS;

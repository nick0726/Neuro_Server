const nodemailer = require("nodemailer");
const { db } = require("../config/database");
const Joi = require("joi");

exports.sendInqueryMail = async (ctx, next) => {
  try {
    const { type, name, hospital, department, email, phone, title, body } =
      ctx.request.body; // 보낼 이메일 주소, 이메일 제목, 이메일 본문, 받는 사람 이름
    // 전송하기
    const transporter = nodemailer.createTransport({
      host: "smtps.hiworks.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.MAIL_ADDR,
        pass: process.env.MAIL_PASSWD,
      },
    });

    // 보낼 메세지
    const message = {
      from: `NeuroEars <development@neuroears.co.kr>`, // 보내는 사람
      to: `development@neuroears.co.kr`, // 받는 사람 이름과 이메일 주소
      subject: title, // 메일 제목
      html: `<div><p>
        유형: ${type}<br />
        이름: ${name}<br />
        소속 병원: ${hospital}<br />
        소속 부서: ${department}<br />
        이메일: ${email}<br />
        연락처: ${phone}<br />
        <br />
        제목: ${title}<br />
        <br />
        상세내용:<br />${body}<br /></p>
        </div>`,
    };

    // 메일이 보내진 후의 콜백 함수
    await transporter.sendMail(message);

    ctx.status = 200;
    ctx.body = {
      message: "메일 전송 성공",
    };
  } catch (err) {
    ctx.throw(500, err.message);
  }
};


exports.sendResetPasswordMail = async (email, password) => {
  try {
    // 전송하기
    const transporter = nodemailer.createTransport({
      host: "smtps.hiworks.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.MAIL_ADDR,
        pass: process.env.MAIL_PASSWD,
      },
    });

    // 보낼 메세지
    const message = {
      from: `NeuroEars <development@neuroears.co.kr>`, // 보내는 사람
      to: `${email}`, // 받는 사람 이름과 이메일 주소
      subject: `NeuroEars 비밀번호 재발급`, // 메일 제목
      html: `<div><p>
        새 비밀번호:</p><br /><h1>${password}</h1><br />
        </div>`,
    };

    // 메일이 보내진 후의 콜백 함수
    await transporter.sendMail(message);

  } catch (err) {
    throw(err);
    //ctx.throw(err.statusCode || err.status || 500, err.message);
  }
};


exports.sendVerificationMail = async (ctx, next) => {
  try {
    const { email, code } = ctx.request.body; // 보낼 이메일 주소, 인증 Code
    
    // joi 객체 생성
    const schema = Joi.object().keys({
      code: Joi.string()
        .length(6)
        .regex(/^[A-Z0-9]*$/)
        .required()
        .messages({
          "string.base": `잘못된 형식의 입력입니다.`,
          "string.emty": `Code는 필수 입력사항입니다.`,
          "string.length": `Code는 6자리여야 합니다.`,
          "string.pattern.base": `Code는 영문 대문자와 숫자의 조합으로만 입력하여야 합니다.`,
        }),
        email: Joi.string().email().required().messages({
          "string.base": `잘못된 형식의 입력입니다.`,
          "string.emty": `이메일 주소는 필수 입력사항입니다.`,
          "string.length": `이메일 주소는 최대 45자 이하여야 합니다.`,
          "string.email": `이메일 주소 형식이 올바르지 않습니다.`,
        }),
    });

    // Request 값 validation
    const { error } = schema.validate(ctx.request.body);

    if (error) {
      ctx.throw(400, error.message);
    }

    // 이메일 중복 조회
    try {
      let query = "SELECT EXISTS(SELECT * FROM user WHERE email=?) AS count";
      const [rows, fields] = await db.promise().execute(query, [email]);
      // 이미 등록된 이메일 주소
      if (rows[0].count > 0) {
        ctx.throw(409, "이미 등록된 e-mail주소 번호입니다.");
      }
    } catch (err) {
      ctx.throw(err.statusCode || err.status || 500, err.message);
    }


    // 전송하기
    const transporter = nodemailer.createTransport({
      host: "smtps.hiworks.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.MAIL_ADDR,
        pass: process.env.MAIL_PASSWD,
      },
    });

    // 보낼 메세지
    const message = {
      from: `NeuroEars <development@neuroears.co.kr>`, // 보내는 사람
      to: `${email}`, // 받는 사람 이름과 이메일 주소
      subject: `NeuroEars 이메일 인증`, // 메일 제목
      html: `<div><p>
        인증코드:</p><br /><h1>${code}</h1><br />
        </div>`,
    };

    // 메일이 보내진 후의 콜백 함수
    await transporter.sendMail(message);

    ctx.status = 200;
    ctx.body = {
      message: "메일 전송 성공",
    };
  } catch (err) {
    ctx.throw(err.statusCode || err.status || 500, err.message);
  }
};


const bcrypt = require("bcrypt");
const Joi = require("joi");
const { db } = require("../config/database");
const jwt = require("../lib/token");
const { generatePassword } = require("../lib/paswword-generator");
const { sendResetPasswordMail } = require("../lib/sendmail");

const saltRounds = 10;

const hash = (password) => bcrypt.hashSync(password, saltRounds);

const InsertLog = async (userNo, client_type, result, ip) => {
  let query =
    "INSERT INTO access_log(user_no, client_type_no, result, ip) VALUES (?,?,?,INET_ATON(?))";

  const [rows] = await db
    .promise()
    .execute(query, [userNo, client_type, result, ip]);
};

// joi 객체 생성
const defaultSchema = Joi.object().keys({
  id: Joi.string().alphanum().min(4).max(15).messages({
    "string.base": `ID는 문자열이어야 합니다`,
    "string.alphanum": `ID는 영문과 숫자만 사용할 수 있습니다.`,
    "string.emty": `ID는 필수 입력사항입니다.`,
    "string.min": `ID는 최소 4자 이상이어야 합니다.`,
    "string.max": `ID는 최대 15자 이하여야 합니다.`,
  }),
  password: Joi.string()
    .min(8)
    .max(20)
    .regex(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[$@$!%*#?&])[A-Za-z\d$@$!%*#?&]{8,}$/)
    .messages({
      "string.base": `비밀번호는 문자열이어야 합니다`,
      "string.emty": `비밀번호는 필수 입력사항입니다.`,
      "string.min": `비밀번호는 최소 8자 이상이어야 합니다.`,
      "string.max": `비밀번호는 최대 20자 이하여야 합니다.`,
      "string.pattern.base": `비밀번호는 영문, 숫자, 특수문자를 모두 포함하여야 합니다.`,
    }),
  name: Joi.string().min(2).max(40).messages({
    "string.base": `이름은 문자열이어야 합니다`,
    "string.emty": `이름은 필수 입력사항입니다.`,
    "string.min": `이름은 최소 2자 이상이어야 합니다.`,
    "string.max": `이름은 최대 40자 이하여야 합니다.`,
  }),
  phone: Joi.string()
    .length(11)
    .regex(/^[0-9]+$/)
    .messages({
      "string.base": `잘못된 형식의 입력입니다.`,
      "string.emty": `휴대폰 번호는 필수 입력사항입니다.`,
      "string.length": `휴대폰 번호는 11자리여야 합니다.`,
      "string.pattern.base": `휴대폰 번호는 숫자만 입력하여야 합니다.`,
    }),
  email: Joi.string().email().messages({
    "string.base": `잘못된 형식의 입력입니다.`,
    "string.emty": `이메일 주소는 필수 입력사항입니다.`,
    "string.length": `이메일 주소는 최대 45자 이하여야 합니다.`,
    "string.email": `이메일 주소 형식이 올바르지 않습니다.`,
  }),
  old_password: Joi.string()
    .min(8)
    .max(20)
    .regex(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[$@$!%*#?&])[A-Za-z\d$@$!%*#?&]{8,}$/)
    .messages({
      "string.base": `이전 비밀번호는 문자열이어야 합니다`,
      "string.emty": `이전 비밀번호는 필수 입력사항입니다.`,
      "string.min": `이전 비밀번호는 최소 8자 이상이어야 합니다.`,
      "string.max": `이전 비밀번호는 최대 20자 이하여야 합니다.`,
      "string.pattern.base": `이전 비밀번호는 영문, 숫자, 특수문자를 모두 포함하여야 합니다.`,
    }),
  new_password: Joi.string()
    .min(8)
    .max(20)
    .regex(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[$@$!%*#?&])[A-Za-z\d$@$!%*#?&]{8,}$/)
    .messages({
      "string.base": `새 비밀번호는 문자열이어야 합니다`,
      "string.emty": `새 비밀번호는 필수 입력사항입니다.`,
      "string.min": `새 비밀번호는 최소 8자 이상이어야 합니다.`,
      "string.max": `새 비밀번호는 최대 20자 이하여야 합니다.`,
      "string.pattern.base": `새 비밀번호는 영문, 숫자, 특수문자를 모두 포함하여야 합니다.`,
    }),
  client_type: Joi.number().integer().less(5),
});

exports.Register = async (ctx, next) => {
  // Required field 정의
  const requiredFields = ["id", "password", "name", "email", "phone"];
  const schema = defaultSchema.fork(requiredFields, (field) =>
    field.required()
  );

  // Request 값 validation
  const { error } = schema.validate(ctx.request.body);

  if (error) {
    ctx.throw(400, error.message);
  }

  // input parsing
  const { id, password, name, email, phone } = ctx.request.body;

  // password 암호화
  const hashed_password = hash(password);

  try {
    let query =
      "INSERT INTO user(id, password, name, email, phone) VALUES (?,?,?,?,?)";
    const [rows, fields] = await db
      .promise()
      .execute(query, [id, hashed_password, name, email, phone]);
    ctx.status = 200;
    ctx.body = {
      message: "회원가입에 성공하였습니다.",
      insertId: rows.insertId,
    };
    await next();
  } catch (err) {
    let status;
    switch (
      err.code // just use default MySQL messages for now
    ) {
      case "ER_BAD_NULL_ERROR": // 1048 column cannot be null
      case "ER_NO_REFERENCED_ROW": // 1216 foreign key constraint fails
      case "ER_NO_REFERENCED_ROW_2": // 1452 foreign key constraint fails
      case "ER_NO_DEFAULT_FOR_FIELD": // 1364 field doesn't have a default value
        status = 403;
        break;
      case "ER_DUP_ENTRY": // 1062 duplicate entry
        status = 409; // Conflict
        break;
      case "ER_BAD_FIELD_ERROR": // 1054 unknown column
      default: // Internal Server Error for uncaught exception
        status = 500;
    }
    ctx.throw(status, err.message);
  }
};

exports.Modify = async (ctx, next) => {
  // Required field 정의
  const requiredFields = ["id", "password"];
  const schema = defaultSchema.fork(requiredFields, (field) =>
    field.required()
  );

  // Request 값 validation
  const { error } = schema.validate(ctx.request.body);

  if (error) {
    ctx.throw(400, error.message);
  }

  // input parsing
  const { id, password, name, email, phone } = ctx.request.body;

  if (ctx.request.id != id) {
    ctx.throw(401, "유효하지 않은 접근입니다.");
  }

  const conn = await db.promise().getConnection(async (conn) => conn);

  try {
    await conn.beginTransaction();

    const [selectUserRows] = await conn.query(
      "SELECT password FROM user WHERE id=?",
      [id]
    );

    if (selectUserRows[0].count < 1) {
      ctx.throw(401, "해당 ID가 존재하지 않습니다.");
    }

    if (selectUserRows[0].password) {
      const result = bcrypt.compareSync(password, selectUserRows[0].password);

      // 비밀번호 불일치
      if (!result) {
        ctx.throw(401, "잘못된 비밀번호 입니다.");
      }
    }

    if (name === undefined && email === undefined && phone === undefined) {
      ctx.status = 200;
      ctx.body = {
        messages: "사용자 정보에 갱신할 부분이 없습니다.",
      };
      return await next();
    }

    let updateQuery = `UPDATE user SET`
      .concat(name === undefined ? `` : ` name='${name}'`)
      .concat(email === undefined ? `` : ` email='${email}'`)
      .concat(phone === undefined ? `` : ` phone='${phone}'`)
      .concat(` WHERE id='${id}'`);

    const [updateUserRows] = await conn.query(updateQuery);

    if (updateUserRows.changedRows < 1) {
      ctx.throw(200, "갱신된 정보가 없습니다.");
    }

    await conn.commit();

    ctx.status = 200;
    ctx.body = {
      message: "사용자 정보를 성공적으로 갱신하였습니다.",
    };
  } catch (err) {
    //console.log(err);
    await conn.rollback();
    ctx.throw(err);
  } finally {
    conn.release();
  }
};

exports.Login = async (ctx, next) => {
  // Required field 정의
  const requiredFields = ["id", "password", "client_type"];
  const schema = defaultSchema.fork(requiredFields, (field) =>
    field.required()
  );

  // Request 값 validation
  const { error } = schema.validate(ctx.request.body);

  // Validation Error : 잘못된 Input 형식
  if (error) {
    ctx.throw(400, error.message);
  }

  // input parsing
  const { id, password, client_type } = ctx.request.body;
  const ip = ctx.request.ip;

  let userNo = 0;
  // ID 조회
  try {
    let query = "SELECT no FROM user WHERE id=?";
    const [rows] = await db.promise().execute(query, [id]);
    // ID 존재하지 않음
    if (rows[0].count == 0) {
      ctx.throw(401, "해당 ID가 존재하지 않습니다.");
    } else {
      userNo = rows[0].no;
    }
  } catch (err) {
    ctx.throw(err.status || err.statusCode || 500, err.message);
  }

  // 비밀번호 확인
  try {
    let query = "SELECT no, password FROM user WHERE id=?";
    const [rows] = await db.promise().execute(query, [id]);

    if (rows[0].password) {
      const result = bcrypt.compareSync(password, rows[0].password);

      // 비밀번호 불일치
      if (!result) {
        //log 삽입
        InsertLog(userNo, client_type, 2, ip);
      }
    }
  } catch (err) {
    ctx.throw(err.status || err.statusCode || 500, err.message);
  }

  const accessToken = jwt.sign(id);
  const refreshToken = jwt.refresh();

  try {
    let query = "UPDATE user SET refresh_token=? WHERE id=?";
    const [rows, fields] = await db
      .promise()
      .execute(query, [refreshToken, id]);
    // refresh token 갱신 성공
  } catch (err) {
    ctx.throw(err.status || err.statusCode || 500, err.message);
  }

  ctx.cookies.set("access_token", accessToken, {
    httpOnly: false,
    secure: true,
    sameSite: "none",
    maxAge: 1000 * 60 * 60,
    overwrite: true,
  });

  ctx.cookies.set("refresh_token", refreshToken, {
    httpOnly: false,
    secure: true,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24 * 7 * 2,
    overwrite: true,
  });

  //log 삽입
  InsertLog(userNo, client_type, 1, ip);

  ctx.status = 200;
  ctx.body = {
    message: "로그인을 성공하였습니다.",
  };
};

exports.Logout = (ctx) => {
  ctx.cookies.set("access_token", null, {
    httpOnly: false,
    secure: true,
    sameSite: "none",
    maxAge: 0,
    overwrite: true,
  });
  ctx.cookies.set("refresh_token", null, {
    httpOnly: false,
    secure: true,
    sameSite: "none",
    maxAge: 0,
    overwrite: true,
  });
  ctx.status = 200;
  ctx.body = {
    message: "정상적으로 로그아웃 되었습니다.",
  };
};

exports.Info = async (ctx, next) => {
  // user 정보 조회
  try {
    const id = ctx.request.id;
    if (!id) {
      ctx.throw(401, "토큰 정보가 잘 못 되었습니다.");
    }

    let query = "SELECT * FROM user WHERE id=?";
    const [rows, fields] = await db.promise().execute(query, [id]);
    if (rows[0].count == 0) {
      ctx.throw(204, "해당하는 유저 정보가 없습니다.");
    }
    // password 제외
    const { password, refresh_token, ...userInfo } = rows[0];

    ctx.status = 200;
    ctx.body = userInfo;
    await next();
  } catch (err) {
    ctx.throw(500, err.message);
  }

  //ctx.body = no;
};

exports.CheckId = async (ctx, next) => {
  // Required field 정의
  const requiredFields = ["id"];
  const schema = defaultSchema.fork(requiredFields, (field) =>
    field.required()
  );

  // Request 값 validation
  const { error } = schema.validate(ctx.request.query);

  // Validation Error : 잘못된 Input 형식
  if (error) {
    ctx.throw(400, error.message);
  }

  const { id } = ctx.request.query;

  // ID 조회
  try {
    let query = "SELECT EXISTS(SELECT * FROM user WHERE id=?) AS count";
    const [rows, fields] = await db.promise().execute(query, [id]);
    // ID 존재하지 않음
    if (rows[0].count == 0) {
      ctx.status = 200;
      ctx.body = {
        message: "생성 가능한 ID입니다.",
      };
      await next();
    } else {
      ctx.status = 409;
      ctx.body = {
        message: "이미 존재하는 ID 입니다.",
      };
      await next();
    }
  } catch (err) {
    console.log(err);
    ctx.throw(err.status || err.statusCode || 500, err.message);
  }
};

exports.CheckPassword = async (ctx, next) => {
  // Required field 정의
  const requiredFields = ["id", "password"];
  const schema = defaultSchema.fork(requiredFields, (field) =>
    field.required()
  );

  // Request 값 validation
  const { error } = schema.validate(ctx.request.body);

  // Validation Error : 잘못된 Input 형식
  if (error) {
    ctx.throw(400, error.message);
  }
  const { id, password } = ctx.request.body;

  // ID 조회
  try {
    let query = "SELECT EXISTS(SELECT * FROM user WHERE id=?) AS count";
    const [rows] = await db.promise().execute(query, [id]);
    // ID 존재하지 않음
    if (rows[0].count == 0) {
      ctx.throw(401, "해당 ID가 존재하지 않습니다.");
    }
  } catch (err) {
    ctx.throw(err.status || err.statusCode || 500, err.message);
  }

  // 비밀번호 확인
  try {
    let query = "SELECT password FROM user WHERE id=?";
    const [rows] = await db.promise().execute(query, [id]);
    if (rows[0].password) {
      const result = bcrypt.compareSync(password, rows[0].password);

      // 비밀번호 불일치
      if (!result) {
        ctx.throw(401, "잘못된 비밀번호 입니다.");
      }
      // 비밀번호 일치
      else {
        ctx.status = 200;
        ctx.body = {
          message: "비밀번호 확인에 성공하였습니다.",
        };
      }
    }
  } catch (err) {
    ctx.throw(err.status || err.statusCode || 500, err.message);
  }
};

exports.ChangePassword = async (ctx, next) => {
  // Required field 정의
  const requiredFields = ["id", "old_password", "new_password"];
  const schema = defaultSchema.fork(requiredFields, (field) =>
    field.required()
  );

  // Request 값 validation
  const { error } = schema.validate(ctx.request.body);

  if (error) {
    ctx.throw(400, error.message);
  }

  // input parsing
  const { id, old_password, new_password } = ctx.request.body;

  if (ctx.request.id != id) {
    ctx.throw(401, "유효하지 않은 접근입니다.");
  }

  if (old_password === new_password) {
    ctx.throw(400, "새 비밀번호가 현재 비밀번호와 같습니다.");
  }

  // password 암호화
  const oldHashedPassword = hash(old_password);

  const conn = await db.promise().getConnection(async (conn) => conn);

  try {
    await conn.beginTransaction();

    const [selectUserRows] = await conn.query(
      "SELECT password FROM user WHERE id=?",
      [id, oldHashedPassword]
    );

    if (selectUserRows[0].count < 1) {
      ctx.throw(401, "해당 ID가 존재하지 않습니다.");
    }

    if (selectUserRows[0].password) {
      const result = bcrypt.compareSync(
        old_password,
        selectUserRows[0].password
      );

      // 비밀번호 불일치
      if (!result) {
        ctx.throw(401, "잘못된 비밀번호 입니다.");
      }
    }

    const newHashedPassword = hash(new_password);
    const [updateUserRows] = await conn.query(
      `UPDATE user SET password=? WHERE id=?`,
      [newHashedPassword, id]
    );

    if (updateUserRows.changedRows < 1) {
      ctx.throw(500, "사용자 정보 DB 갱신을 실패하였습니다.");
    }

    await conn.commit();

    ctx.status = 200;
    ctx.body = {
      message: "비밀번호 성공적으로 갱신하였습니다.",
    };
    await next();
  } catch (err) {
    //console.log(err);
    await conn.rollback();
    ctx.throw(err);
  } finally {
    conn.release();
  }
  //TODO:: 비밀번호 갱신 transaction
};

exports.ResetPassword = async (ctx, next) => {
  // Required field 정의
  const requiredFields = ["id", "email"];
  const schema = defaultSchema.fork(requiredFields, (field) =>
    field.required()
  );

  // Request 값 validation
  const { error } = schema.validate(ctx.request.body);

  // Validation Error : 잘못된 Input 형식
  if (error) {
    ctx.throw(400, error.message);
  }

  // input parsing
  const { id, email } = ctx.request.body;

  // ID 조회
  try {
    let query = "SELECT EXISTS(SELECT * FROM user WHERE id=?) AS count";
    const [rows] = await db.promise().execute(query, [id]);
    // ID 존재하지 않음
    if (rows[0].count == 0) {
      ctx.throw(401, "해당 ID가 존재하지 않습니다.");
    }
  } catch (err) {
    ctx.throw(err.status || err.statusCode || 500, err.message);
  }

  // email 확인
  try {
    let query = "SELECT email FROM user WHERE id=?";
    const [rows] = await db.promise().execute(query, [id]);
    if (rows[0].email != email) {
      ctx.throw(401, "등록된 email 주소가 다릅니다.");
    }
  } catch (err) {
    ctx.throw(err.status || err.statusCode || 500, err.message);
  }

  //새 password 생성
  const password = generatePassword(12);
  const hashed_password = hash(password);

  const conn = await db.promise().getConnection(async (conn) => conn);

  try {
    await conn.beginTransaction();

    const [updateUserRows] = await conn.query(
      "UPDATE user SET password=? WHERE id=?",
      [hashed_password, id]
    );

    if (updateUserRows.changedRows < 1) {
      ctx.throw(500, "사용자 정보 DB 갱신을 실패하였습니다.");
    }

    await conn.commit();
    await sendResetPasswordMail(email, password);

    ctx.status = 200;
    ctx.body = {
      message: "사용자 비밀번호를 성공적으로 갱신하였습니다.",
    };
  } catch (err) {
    await conn.rollback();
    ctx.throw(err);
  } finally {
    conn.release();
  }
};

exports.GetAccessLog = async (ctx, next) => {
  // user 정보 조회
  try {
    const id = ctx.request.id;
    if (!id) {
      ctx.throw(401, "토큰 정보가 잘 못 되었습니다.");
    }

    let query =
      "SELECT AL.no, U.no AS user_no, CT.name, inet_ntoa(AL.ip) as ip_address, AL.time, AL.result FROM access_log AS AL INNER JOIN user AS U ON AL.user_no = U.no INNER JOIN client_type AS CT ON AL.client_type_no = CT.no WHERE U.id = ?;";
    const [rows] = await db.promise().execute(query, [id]);
    if (rows[0].count == 0) {
      ctx.throw(204, "해당하는 유저 정보가 없습니다.");
    }

    ctx.status = 200;
    ctx.body = rows;
    await next();
  } catch (err) {
    ctx.throw(err.status || err.statusCode || 500, err.message);
  }

  //ctx.body = no;
};

const Joi = require("joi");
const { callbackPromise } = require("nodemailer/lib/shared");
const { db } = require("../config/database");
const jwt = require("../lib/token");

const validateInput = (ctx) => {
    // joi 객체 생성
    const schema = Joi.object().keys({
        id: Joi.string().alphanum().min(4).max(15).required().messages({
            "string.base": `ID는 문자열이어야 합니다`,
            "string.alphanum": `ID는 영문과 숫자만 사용할 수 있습니다.`,
            "string.emty": `ID는 필수 입력사항입니다.`,
            "string.min": `ID는 최소 4자 이상이어야 합니다.`,
            "string.max": `ID는 최대 15자 이하여야 합니다.`,
        }),
        name: Joi.string().min(2).max(40).required().messages({
            "string.base": `이름은 문자열이어야 합니다.`,
            "string.emty": `이름은 필수 입력사항입니다.`,
            "string.min": `이름은 최소 2자 이상이어야 합니다.`,
            "string.max": `이름은 최대 40자 이하여야 합니다.`,
        }),
        address: Joi.string()
            .min(4)
            .max(255)
            .required()
            .messages({
                "string.base": `주소는 문자열이어야 합니다.`,
                "string.emty": `주소는 필수 입력사항입니다.`,
                "string.min": `주소는 최소 4자 이상이어야 합니다.`,
                "string.max": `주소는 최대 255자 이하여야 합니다.`,
            }),
        address_detail: Joi.string()
            .max(255)
            .messages({
                "string.base": `주소는 문자열이어야 합니다.`,
                "string.max": `주소는 최대 255자 이하여야 합니다.`,
            }),
        phone: Joi.string()
            .regex(/^[0-9]+$/)
            .min(9)
            .max(11)
            .required()
            .messages({
                "string.base": `잘못된 형식의 입력입니다.`,
                "string.emty": `전화번호는 필수 입력사항입니다.`,
                "string.min": `전화번호는 최소 9자 이상이어야 합니다.`,
                "string.max": `전화번호는 최대 11자 이하여야 합니다.`,
                "string.pattern.base": `전화번호는 숫자만 입력할 수 있습니다.`,
            }),
        department: Joi.string()
            .min(2)
            .max(20)
            .messages({
                "string.base": `진료과는 공백이나 특수기호가 포함 될 수 없습니다.`,
                "string.min": `진료과는 최소 2자 이상이어야 합니다.`,
                "string.max": `진료과는 최대 20자 이하여야 합니다.`,
            }),
        code: Joi.string()
            .regex(/^[0-9]+$/)
            .length(8)
            .required()
            .messages({
                "string.base": `요양기관번호는 공백이나 특수기호가 포함 될 수 없습니다.`,
                "string.emty": `요양기관번호는 필수 입력사항입니다.`,
                "string.length": `요양기관번호는 8자리 숫자여야 합니다.`,
                "string.pattern.base": `요양기관번호는 숫자만 입력하여야 합니다.`,
            }),
        business_registration_number: Joi.string()
            .regex(/^[0-9]+$/)
            .length(10)
            .required()
            .messages({
                "string.base": `사업자등록번호는 공백이나 특수기호가 포함 될 수 없습니다.`,
                "string.emty": `사업자등록번호는 필수 입력사항입니다.`,
                "string.length": `사업자등록번호는 8자리 숫자여야 합니다.`,
                "string.pattern.base": `사업자등록번호는 숫자만 입력하여야 합니다.`,
            }),
        business_registration_file_path: Joi.string()
            .messages({
                "string.base": `사업자등록증 file path는 문자열이어야 합니다..`,
            }),
        business_registration_file_size: Joi.string()
            .messages({
                "string.base": `사업자등록증 file path는 문자열이어야 합니다..`,
            }),
        account_file_path: Joi.string()
            .messages({
                "string.base": `사업자등록증 file path는 문자열이어야 합니다..`,
            }),
        account_file_size: Joi.string()
            .messages({
                "string.base": `사업자등록증 file path는 문자열이어야 합니다..`,
            }),
    });

    // Request 값 validation
    const { error } = schema.validate(ctx.request.body);

    if (error) {
        ctx.throw(400, error.message);
    }
}

exports.register = async (ctx, next) => {
    validateInput(ctx);

    // input parsing
    const {
        id,
        name,
        address,
        address_detail,
        phone,
        department,
        code,
        business_registration_number,
        business_registration_file_path,
        business_registration_file_size,
        account_file_path,
        account_file_size
    } = ctx.request.body;

    const conn = await db.promise().getConnection(async conn => conn);


    try {
        await conn.beginTransaction();

        const insertHospitalRows = await conn.query('INSERT INTO hospital(name, address, address_detail, phone, department, code, business_registration_number, business_registration_file_path, business_registration_file_size, account_file_path, account_file_size ) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
            [name, address, address_detail, phone, department, code, business_registration_number, business_registration_file_path, business_registration_file_size, account_file_path, account_file_size]);

        const hospital_no = insertHospitalRows[0].insertId;

        const [isExistRows] = await conn.query('SELECT EXISTS(SELECT * FROM user WHERE id=?) AS count', [id]);

        if (isExistRows[0].count < 1) {
            ctx.throw(500, "해당 ID가 없습니다.");
        }

        const [updateUserRows] = await conn.query('UPDATE user SET hospital_no=?, hospital_state_no=? WHERE id=?',
            [hospital_no, 2, id]);

        if (updateUserRows.changedRows != 1) {
            ctx.throw(500, "사용자 정보 DB 갱신을 실패하였습니다.");
        }

        await conn.commit();

        ctx.status = 200;
        ctx.body = {
            message: "병원 정보가 정상적으로 등록되었습니다."
        };
        await next();
    } catch (err) {
        console.log(err);
        await conn.rollback();
        ctx.throw(err);
    } finally {
        conn.release();
    }
};

exports.info = async (ctx, next) => {
    // user 정보 조회
    try {
        const id = ctx.request.id;
        if (!id) {
            ctx.throw(401, "토큰 정보가 잘 못 되었습니다.");
        }

        const selectUserQuery = "SELECT hospital_no FROM user WHERE id=?";
        const [selectUserRows] = await db.promise().execute(selectUserQuery, [id]);
        if (selectUserRows[0].count == 0) {
            ctx.throw(503, "해당하는 사용자 정보가 없습니다.");
        }

        const hospitalNo = selectUserRows[0].hospital_no;
        if (hospitalNo == null) {
            ctx.throw(503, "등록된 병원 정보가 없습니다.");
        }

        const selectHospitalQuery = "SELECT * FROM hospital WHERE no=?";
        const [hospitalRows] = await db.promise().execute(selectHospitalQuery, [hospitalNo]);

        ctx.status = 200;
        ctx.body = hospitalRows[0];
        await next();
    } catch (err) {
        ctx.throw(err.status || err.statusCode || 500, err.message);
    }

}
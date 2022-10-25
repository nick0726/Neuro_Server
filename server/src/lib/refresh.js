const { sign, verify, refreshVerify } = require("../lib/token");
const jwt = require("jsonwebtoken");

const refresh = async (ctx, next) => {
  const accessToken = ctx.cookies.get("access_token");
  const refreshToken = ctx.cookies.get("refresh_token");

  if (accessToken && refreshToken) {
    // access token 검증
    const accessResult = verify(accessToken);

    // access token decode
    const decoded = jwt.decode(accessToken);

    if (decoded === null) {
      ctx.throw(401, "유효하지 않은 토큰입니다.");
    }

    // refresh token 검증
    const refreshResult = refreshVerify(refreshToken, decoded.id);

    // access token 만료 체크
    if (accessResult.ok === false && accessResult.message === "jwt expired") {
      // 1. access token과 refresh token 모두 만료 된 경우
      if (refreshResult.ok === false) {
        ctx.throw(401, "토큰이 만료되었습니다.");
      } else {
        // 2. access token만 만료되고, refresh token은 만료되지 않은 경우
        const newAccesstoken = sign(decoded.id);
        ctx.status = 200;
        ctx.cookies.set("access_token", newAccesstoken, {
          httpOnly: true, 
          secure: true, 
          sameSite: "none", 
          maxAge: 1000 * 60 * 30,
          overwrite: true,
        });
        ctx.body = { message: "토큰을 갱신하였습니다." };
        await next();
      }
    } else {
      // 3. access token이 만료되지 않은 경우
      ctx.throw(400, "토큰의 유효기간이 만료되지 않았습니다.");
    }
  } else {
    // 4. access token 또는 refresh token이 존재하지 않는 경우
    ctx.throw(400, "토큰이 존재하지 않습니다.");
  }
};

module.exports = refresh;

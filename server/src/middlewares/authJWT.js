const { verify, refreshVerify, sign } = require("../lib/token");
const jwt = require("jsonwebtoken");

const authJWT = async (ctx, next) => {
  const accessToken = ctx.cookies.get("access_token"); //ctx로부터 AccessToken 읽어오기

  // Access Token 존재
  if (accessToken) {
    const accessResult = verify(accessToken);
    const decoded = jwt.decode(accessToken);

    // 1. Access Token 유효
    if (accessResult.ok) {
      ctx.request.id = decoded.id;
      await next();

    }
    // Access Token 만료
    else if (accessResult.message === "jwt expired") {

      const refreshToken = ctx.cookies.get("refresh_token"); //ctx로부터 RefreshToken 읽어오기

      // Access Token 만료 & Refresh Token 존재
      if (refreshToken) {
        const refreshResult = await refreshVerify(refreshToken, decoded.id);

        // 2. Access Token 만료 & Refresh Token 유효
        if (refreshResult.ok) {
          const newAccesstoken = sign(decoded.id);
          //ctx.status = 200;
          ctx.cookies.set("access_token", newAccesstoken, {
            httpOnly: false,
            secure: true,
            sameSite: "none",
            maxAge: 1000 * 60 * 60,
            overwrite: true,
          });
          ctx.request.id = decoded.id;
          await next();
        }
        // 2. Access Token 만료 & Refresh Token 만료
        else if (refreshResult.message === "jwt expired") {
          ctx.throw(401, "토큰이 모두 만료되었습니다. 다시 로그인해 주십시오.");
        }
        // Refresh Token 에러
        else {
          ctx.throw(401, "Refresh Token이 유효하지 않습니다.");
        }
        // Refresh Token 없음
      } else {
        ctx.throw(401, "Refresh토큰이 존재하지 않습니다.");
      }
    }
    // Access Token 에러
    else {
      ctx.throw(401, "Access Token이 유효하지 않습니다.");
    }
  } else {
    // Access Token 없음
    ctx.throw(401, "Access Token이 존재하지 않습니다.");
  }
}

module.exports = authJWT;
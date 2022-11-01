require("dotenv").config();
const jwtSecret = process.env.SECRET_KEY;
const jwt = require("jsonwebtoken");
const { db } = require("../config/database");

module.exports = {
  sign:(id)=>{
    const payload = {
      id:id
    };

    return jwt.sign(payload, jwtSecret,
      {
        algorithm: 'HS256',
        expiresIn: "30m",
      });
  },

  verify: (token)=>{
    let decoded = null;
    try{
      decoded = jwt.verify(token, jwtSecret);
      return {
        ok:true,
        id:decoded.id,
      };
    }catch(err){
      return{
        ok:false,
        message: err.message,
      };
    }
  },

  refresh:()=>{
    return jwt.sign({}, jwtSecret, {
      algorithm: 'HS256',
      expiresIn: "14d",
    });
  },

  refreshVerify: async(token, id) =>{
    try{
      // DB로부터 refresh token 받아오기
      let query = "SELECT * FROM user WHERE id=?";
      const [rows, fields] = await db.promise().execute(query, [id]);
      
      if (rows[0].count == 0) {
        return {
          ok:false
        };
      }
      
      const data = rows[0].refresh_token;

      if(token == data){
        try{
          jwt.verify(token, jwtSecret);
          return {
            ok:true
          };
        }catch(err){
          throw err;
        }
      }else{
        return {
          ok:false,
          message: "토큰 값이 일치하지 않습니다.",
        };
      }
    }catch(err){
      return {
        ok:false,
        message: err.message,
      };;
    }
  },
};
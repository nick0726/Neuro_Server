const bcrypt = require("bcrypt");
const Joi = require("joi");
const { db } = require("../config/database");
const jwt = require("../lib/token");

const axios = require("axios");

exports.Success = async (ctx, next) => {
  const { paymentKey, orderId, amount } = ctx.request.query;
  const options = {
    method: 'POST',
    url: 'https://api.tosspayments.com/v1/payments/confirm',
    headers: {
      Authorization:
        "Basic " + Buffer.from(process.env.TOSS_SECRET_KEY+":").toString("base64"),
      "Content-Type": "application/json",
    },
    data: {
      paymentKey: paymentKey,
      amount: amount,
      orderId: orderId
    },
    withCredential: true
  };

  return axios.request(options)
    .then((res) => {
      console.log(res.data);
      ctx.status = 200;
      ctx.body = res.data;
    })
    .catch((error) => {
      console.error(err);
      ctx.redirect(`/pay/fail?code=${error.response?.body?.code}&message=${error.response?.body?.message}`);
    })
    .finally(()=>{
      return next();
    })
};

exports.Fail = async (ctx, next)=>{
  const {code, message, orderId} = ctx.request.query;
  ctx.status = 200;
  ctx.body = {
    "code":code,
    "message":message,
    "orderId":orderId,
  }
  await next();
}